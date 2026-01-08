from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Avg, Count
from .models import Question, FeedbackResponse, Answer, AdditionalResponse
from .serializers import (
    QuestionSerializer, FeedbackResponseSerializer, 
    FeedbackSubmissionSerializer, AnswerSerializer
)


# ----------------------
# DRF ViewSets
# ----------------------



class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.filter(is_active=True).order_by('order')
    serializer_class = QuestionSerializer
    permission_classes = []



class FeedbackResponseViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/feedback/
    Returns feedback responses and allows submitting new feedback.
    """
    queryset = FeedbackResponse.objects.all().order_by('-created_at')
    serializer_class = FeedbackResponseSerializer
    permission_classes = []

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        feedback = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(FeedbackResponse.STATUS_CHOICES).keys():
            feedback.status = new_status
            feedback.save()
            return Response({'status': 'updated'})
        return Response({'error': 'Invalid status'}, status=400)

    @action(detail=False, methods=['post'])
    def submit_feedback(self, request):
        serializer = FeedbackSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    phone_number = serializer.validated_data['phone_number']
                    answers_data = serializer.validated_data['answers']
                    additional_responses = serializer.validated_data.get('additional_responses', {})

                    # Average rating calculation
                    rating_answers = [a for a in answers_data.values() if isinstance(a, dict) and a.get('rating')]
                    avg_rating = sum(a['rating'] for a in rating_answers) / len(rating_answers) if rating_answers else 0

                    feedback = FeedbackResponse.objects.create(
                        phone_number=phone_number,
                        average_rating=avg_rating
                    )

                    # Create answers
                    for question_id, answer_data in answers_data.items():
                        try:
                            question = Question.objects.get(id_name=question_id)
                        except Question.DoesNotExist:
                            continue

                        if question.question_type == 'rating' and 'rating' in answer_data:
                            Answer.objects.create(feedback=feedback, question=question, rating_value=answer_data['rating'])
                        elif question.question_type == 'textarea' and 'text' in answer_data:
                            Answer.objects.create(feedback=feedback, question=question, text_value=answer_data['text'])
                        elif question.question_type == 'yesno' and 'yesno' in answer_data:
                            Answer.objects.create(feedback=feedback, question=question, yesno_value=answer_data['yesno'])

                    # Additional responses
                    for qtype, text in additional_responses.items():
                        AdditionalResponse.objects.create(feedback=feedback, question_type=qtype, response_text=text)

                    return Response({'id': feedback.id, 'average_rating': avg_rating, 'status': 'success'}, status=201)

            except Exception as e:
                return Response({'error': str(e)}, status=400)

        return Response(serializer.errors, status=400)


class AnswerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoint: /api/answers/?feedback_id=<id>
    Returns answers filtered by feedback.
    """
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        feedback_id = self.request.query_params.get('feedback_id')
        if feedback_id:
            queryset = queryset.filter(feedback_id=feedback_id)
        return queryset


# ----------------------
# Analytics Endpoint (DRF)
# ----------------------

@api_view(['GET'])
def analytics_dashboard_api(request):
    """
    Endpoint: /api/dashboard/analytics/
    Returns stats for the frontend dashboard.
    """
    total_feedbacks = FeedbackResponse.objects.count()
    avg_rating = FeedbackResponse.objects.aggregate(avg=Avg('average_rating'))['avg'] or 0

    # Status counts as dict
    status_counts = {item['status']: item['count'] for item in FeedbackResponse.objects.values('status').annotate(count=Count('id'))}

    rating_distribution = {
        '1-2': FeedbackResponse.objects.filter(average_rating__lt=3).count(),
        '3-4': FeedbackResponse.objects.filter(average_rating__gte=3, average_rating__lt=4).count(),
        '4-5': FeedbackResponse.objects.filter(average_rating__gte=4).count(),
    }

    # Question stats
    question_stats = []
    for question in Question.objects.filter(is_active=True):
        if question.question_type == 'rating':
            avg = Answer.objects.filter(question=question, rating_value__isnull=False).aggregate(avg=Avg('rating_value'))['avg'] or 0
            question_stats.append({
                'question_id': question.id,
                'id_name': question.id_name,
                'average_rating': round(avg, 1),
                'response_count': Answer.objects.filter(question=question).count()
            })

    return Response({
        'total_feedbacks': total_feedbacks,
        'average_rating': round(avg_rating, 1),
        'status_counts': status_counts,
        'rating_distribution': rating_distribution,
        'question_stats': question_stats
    })


@api_view(['POST'])
def update_feedback_status(request, feedback_id):
    """
    Endpoint: /api/dashboard/update-status/<feedback_id>/
    Updates the status of a feedback.
    """
    try:
        feedback = FeedbackResponse.objects.get(id=feedback_id)
        new_status = request.data.get('status')
        notes = request.data.get('notes', '')

        if new_status not in dict(FeedbackResponse.STATUS_CHOICES).keys():
            return Response({'error': 'Invalid status'}, status=400)

        feedback.status = new_status
        if notes:
            feedback.additional_notes = notes
        feedback.save()
        return Response({'success': True})
    except FeedbackResponse.DoesNotExist:
        return Response({'error': 'Feedback not found'}, status=404)

# views.py
@api_view(['GET'])
def get_additional_questions(request):
    """
    Endpoint: /api/questions/additional/
    Returns all additional questions (is_additional=True).
    """
    questions = Question.objects.filter(
        is_additional=True,
        # is_active=True
    ).order_by('order')
    
    serializer = QuestionSerializer(questions, many=True)
    return Response(serializer.data)

from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Question

@api_view(['POST'])
def update_question_order(request):
    """
    Expects: { "questions": [{"id": 1, "order": 0}, {"id": 2, "order": 1}, ...] }
    """
    data = request.data.get('questions', [])
    for item in data:
        try:
            q = Question.objects.get(id=item['id'])
            q.order = item['order']
            q.save()
        except Question.DoesNotExist:
            continue
    return Response({"success": True})

