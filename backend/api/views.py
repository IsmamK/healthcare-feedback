from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Avg, Count
from .models import Question, FeedbackResponse, Answer, AdditionalResponse
from .serializers import (
    QuestionSerializer, FeedbackResponseSerializer, 
    FeedbackSubmissionSerializer, AnswerSerializer
)

from django.core.mail import send_mail
from django.conf import settings
from rest_framework.permissions import AllowAny, IsAdminUser
from .permissions import PublicReadStaffWrite
import logging

logger = logging.getLogger(__name__)


# ----------------------
# DRF ViewSets
# ----------------------



class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.filter(is_active=True).order_by('order')
    serializer_class = QuestionSerializer
    permission_classes = [PublicReadStaffWrite]


class FeedbackResponseViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/feedback/
    Returns feedback responses and allows submitting new feedback.
    """
    queryset = FeedbackResponse.objects.all().order_by('-created_at')
    serializer_class = FeedbackResponseSerializer
    permission_classes = [IsAdminUser]

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        feedback = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(FeedbackResponse.STATUS_CHOICES).keys():
            feedback.status = new_status
            feedback.save()
            return Response({'status': 'updated'})
        return Response({'error': 'Invalid status'}, status=400)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def submit_feedback(self, request):
        serializer = FeedbackSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                phone_number = serializer.validated_data['phone_number']
                doctor_id = serializer.validated_data.get('doctor_id')
                answers_data = serializer.validated_data['answers']
                additional_responses = serializer.validated_data.get('additional_responses', {})

                # Calculate average rating from rating answers only
                rating_answers = [
                    a for a in answers_data.values()
                    if isinstance(a, dict) and a.get('rating')
                ]
                avg_rating = sum(a['rating'] for a in rating_answers) / len(rating_answers) if rating_answers else 0

                # Create feedback entry
                with transaction.atomic():
                    feedback = FeedbackResponse.objects.create(
                        phone_number=phone_number,
                        average_rating=avg_rating,
                        doctor_id=doctor_id if doctor_id else None  # Add this line
                    )

                    # Process main answers
                    for question_id, answer_data in answers_data.items():
                        try:
                            question = Question.objects.get(id_name=question_id)
                        except Question.DoesNotExist:
                            continue

                        if question.question_type == 'rating' and 'rating' in answer_data:
                            Answer.objects.create(
                                feedback=feedback,
                                question=question,
                                rating_value=answer_data['rating']
                            )
                        elif question.question_type == 'textarea' and 'text' in answer_data:
                            Answer.objects.create(
                                feedback=feedback,
                                question=question,
                                text_value=answer_data['text']
                            )
                        elif question.question_type == 'yesno' and 'yesno' in answer_data:
                            Answer.objects.create(
                                feedback=feedback,
                                question=question,
                                yesno_value=answer_data['yesno']
                            )
                        elif question.question_type == 'date' and 'date' in answer_data:
                            Answer.objects.create(
                                feedback=feedback,
                                question=question,
                                date_value=answer_data['date']
                            )

                    # Process additional responses if any
                    for qtype, text in additional_responses.items():
                        if text and text.strip():  # Only create if not empty
                            AdditionalResponse.objects.create(
                                feedback=feedback,
                                question_type=qtype,
                                response_text=text
                            )

                # 📧 EMAIL LOGIC - SEND ONLY FOR LOW RATINGS (BELOW 3.5)
                if avg_rating < 3.5:
                    # For low ratings with additional responses (final submission)
                    if additional_responses:
                        self.send_low_rating_email(feedback, avg_rating, phone_number)
                    # For low ratings without additional responses - no email yet
                    # They will submit additional questions first
                
                # NO EMAIL FOR RATINGS >= 3.5 - REMOVED THAT CASE

                return Response(
                    {
                        'id': feedback.id, 
                        'average_rating': avg_rating, 
                        'status': 'success',
                        'show_additional': avg_rating < 3.5 and not additional_responses
                    },
                    status=201
                )

            except Exception:
                logger.error("Feedback submission failed")
                return Response({'error': 'Unable to submit feedback'}, status=400)

        return Response(serializer.errors, status=400)

    def send_low_rating_email(self, feedback, avg_rating, phone_number):
            """
            Send a beautifully formatted email for low ratings
            """
            if not settings.EMAIL_ALERTS_ENABLED:
                return
            from django.utils import timezone
            from django.core.mail import EmailMultiAlternatives
            import html

            current_time = timezone.localtime().strftime("%d %B %Y, %I:%M %p")

            # Collect answers
            answers = feedback.answers.select_related('question').all()
            additional = feedback.additional_responses.all()

            # Build HTML email content - Clean and professional
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.5;
                        color: #1e293b;
                        margin: 0;
                        padding: 0;
                        background-color: #f8fafc;
                    }}
                    .wrapper {{
                        max-width: 560px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                    }}
                    .header {{
                        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                        padding: 28px 24px;
                        text-align: center;
                    }}
                    .header h1 {{
                        margin: 0;
                        font-size: 26px;
                        font-weight: 700;
                        color: #ffffff;
                        letter-spacing: -0.3px;
                    }}
                    .header-badge {{
                        display: inline-block;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(4px);
                        padding: 6px 16px;
                        border-radius: 40px;
                        color: #ffffff;
                        font-size: 14px;
                        font-weight: 500;
                        margin-top: 12px;
                    }}
                    .content {{
                        padding: 32px 28px;
                    }}
                    .rating-section {{
                        background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
                        border-radius: 16px;
                        padding: 24px;
                        text-align: center;
                        margin-bottom: 28px;
                        border: 1px solid #fed7aa;
                    }}
                    .rating-number {{
                        font-size: 52px;
                        font-weight: 800;
                        color: #9a3412;
                        line-height: 1;
                        margin-bottom: 4px;
                    }}
                    .rating-label {{
                        font-size: 16px;
                        color: #9a3412;
                        font-weight: 500;
                    }}
                    .info-grid {{
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                        margin-bottom: 32px;
                    }}
                    .info-card {{
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 12px;
                        border-left: 4px solid #3b82f6;
                    }}
                    .info-label {{
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #64748b;
                        margin-bottom: 4px;
                    }}
                    .info-value {{
                        font-size: 15px;
                        font-weight: 600;
                        color: #0f172a;
                        word-break: break-word;
                    }}
                    .section-title {{
                        font-size: 18px;
                        font-weight: 700;
                        color: #0f172a;
                        margin: 28px 0 16px 0;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #e2e8f0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }}
                    .answer-item {{
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 18px;
                        margin-bottom: 16px;
                        border: 1px solid #e2e8f0;
                    }}
                    .question-id {{
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #64748b;
                        margin-bottom: 8px;
                    }}
                    .question-text {{
                        font-size: 15px;
                        font-weight: 600;
                        color: #0f172a;
                        margin-bottom: 4px;
                    }}
                    .question-bangla {{
                        font-size: 13px;
                        color: #059669;
                        margin-bottom: 14px;
                        padding-bottom: 12px;
                        border-bottom: 1px dashed #cbd5e1;
                    }}
                    .response-box {{
                        background: #ffffff;
                        padding: 14px;
                        border-radius: 8px;
                        border-left: 4px solid #10b981;
                    }}
                    .response-label {{
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        color: #64748b;
                        margin-bottom: 4px;
                    }}
                    .response-value {{
                        font-size: 15px;
                        color: #0f172a;
                        font-weight: 500;
                    }}
                    .rating-stars {{
                        display: inline-block;
                        background: #059669;
                        color: #ffffff;
                        padding: 4px 12px;
                        border-radius: 30px;
                        font-size: 13px;
                        font-weight: 600;
                    }}
                    .additional-item {{
                        background: #f8fafc;
                        border-radius: 12px;
                        padding: 18px;
                        margin-bottom: 12px;
                        border: 1px solid #e2e8f0;
                    }}
                    .additional-type {{
                        font-size: 12px;
                        font-weight: 600;
                        color: #475569;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.3px;
                    }}
                    .additional-text {{
                        font-size: 15px;
                        color: #0f172a;
                        background: #ffffff;
                        padding: 12px;
                        border-radius: 8px;
                        border-left: 4px solid #8b5cf6;
                    }}
                    .divider {{
                        height: 1px;
                        background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
                        margin: 28px 0;
                    }}
                    .dashboard-link {{
                        text-align: center;
                        margin: 32px 0 16px;
                    }}
                    .dashboard-button {{
                        display: inline-block;
                        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                        color: #ffffff;
                        text-decoration: none;
                        padding: 14px 32px;
                        border-radius: 40px;
                        font-weight: 600;
                        font-size: 15px;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                    }}
                    .footer {{
                        background: #f1f5f9;
                        padding: 20px;
                        text-align: center;
                        border-top: 1px solid #e2e8f0;
                    }}
                    .footer-text {{
                        color: #64748b;
                        font-size: 13px;
                        margin: 0;
                    }}
                    @media (max-width: 480px) {{
                        .content {{ padding: 24px 16px; }}
                        .info-grid {{ grid-template-columns: 1fr; }}
                        .rating-number {{ font-size: 44px; }}
                    }}
                </style>
            </head>
            <body style="background-color: #f8fafc; padding: 20px 12px;">
                <div class="wrapper">
                    <!-- Header -->
                    <div class="header">
                        <h1>⚠️ Low Rating Alert</h1>
                        <div class="header-badge">JG Healthcare · Action Required</div>
                    </div>
                    
                    <!-- Content -->
                    <div class="content">
                        <!-- Rating Summary -->
                        <div class="rating-section">
                            <div class="rating-number">{avg_rating:.1f} <span style="font-size: 24px; color: #9a3412;">/5</span></div>
                            <div class="rating-label">Average Patient Rating</div>
                        </div>
                        
                        <!-- Key Info -->
                        <div class="info-grid">
                            <div class="info-card">
                                <div class="info-label">📱 Phone</div>
                                <div class="info-value">{phone_number}</div>
                            </div>
                            <div class="info-card">
                                <div class="info-label">⏱️ Submitted</div>
                                <div class="info-value">{current_time}</div>
                            </div>
                        </div>
                        
                        <!-- Main Questions -->
                        <div class="section-title">
                            <span>📋 Patient Responses</span>
                        </div>
            """
            
            # Add main answers
            for ans in answers:
                q = ans.question
                
                # Format answer based on type
                if ans.rating_value:
                    stars_display = "★" * ans.rating_value + "☆" * (5 - ans.rating_value)
                    answer_display = f"""
                        <span class="rating-stars">{ans.rating_value}/5</span>
                        <span style="margin-left: 8px; color: #64748b; font-size: 14px;">{stars_display}</span>
                    """
                elif ans.text_value:
                    answer_display = f'<span style="color: #0f172a;">{ans.text_value}</span>'
                elif ans.yesno_value is not None:
                    if ans.yesno_value:
                        answer_display = '<span style="color: #059669; font-weight: 600;">✅ Yes</span>'
                    else:
                        answer_display = '<span style="color: #dc2626; font-weight: 600;">❌ No</span>'
                elif ans.date_value:
                    answer_display = f'<span style="color: #0f172a;">📅 {ans.date_value.strftime("%d %B %Y")}</span>'
                else:
                    answer_display = '<span style="color: #94a3b8;">— No response —</span>'
                
                html_content += f"""
                        <div class="answer-item">
                            <div class="question-id">{q.id_name}</div>
                            <div class="question-text">{q.english_text}</div>
                            <div class="question-bangla">{q.bangla_text}</div>
                            <div class="response-box">
                                <div class="response-label">Patient Response</div>
                                <div class="response-value">{answer_display}</div>
                            </div>
                        </div>
                """
            
            # Add additional questions if they exist
            if additional.exists():
                html_content += f"""
                        <div class="section-title" style="margin-top: 32px;">
                            <span>📝 Additional Feedback</span>
                        </div>
                """
                
                for add in additional:
                    html_content += f"""
                        <div class="additional-item">
                            <div class="additional-type">Additional Question</div>
                            <div class="additional-text">{add.response_text}</div>
                        </div>
                    """
            
            # Dashboard link and footer
            html_content += f"""
                        <div class="divider"></div>
                        
                        <div class="dashboard-link">
                            <a href="{settings.FRONTEND_URL}/dashboard" class="dashboard-button">
                                🔍 View Full Details
                            </a>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p class="footer-text">
                            JG Healthcare Patient Feedback System<br>
                            This is an automated alert for feedback requiring attention.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Plain text version (clean and simple)
            text_content = f"""
    JG HEALTHCARE - LOW RATING ALERT
    {'=' * 50}

    ⚠️ A patient has submitted feedback with a low rating.

    Rating: {avg_rating:.1f}/5
    Phone: {phone_number}
    Time: {current_time}

    {'=' * 50}
    PATIENT RESPONSES
    {'=' * 50}

    """
            
            for ans in answers:
                q = ans.question
                
                # Format answer for plain text
                if ans.rating_value:
                    answer = f"{ans.rating_value}/5"
                elif ans.text_value:
                    answer = ans.text_value
                elif ans.yesno_value is not None:
                    answer = "Yes" if ans.yesno_value else "No"
                elif ans.date_value:
                    answer = ans.date_value.strftime("%d-%m-%Y")
                else:
                    answer = "No response"
                
                text_content += f"""
    Question: {q.english_text}
    Bangla: {q.bangla_text}
    Answer: {answer}
    {'-' * 40}
    """
            
            if additional.exists():
                text_content += f"""

    {'=' * 50}
    ADDITIONAL FEEDBACK
    {'=' * 50}

    """
                for add in additional:
                    text_content += f"""
    {add.response_text}
    {'-' * 40}
    """
            
            text_content += f"""

    {'=' * 50}
    View in Dashboard: {settings.FRONTEND_URL}/dashboard
    {'=' * 50}
    """
            
            # Send email
            subject = f"⚠️ Low Rating Alert - JG Healthcare ({avg_rating:.1f}/5)"
            
            for email in settings.LOW_RATING_EMAILS:
                try:
                    msg = EmailMultiAlternatives(
                        subject=subject,
                        body=text_content,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        to=[email]
                    )
                    msg.attach_alternative(html_content, "text/html")
                    msg.send(fail_silently=False)
                except Exception:
                    logger.error("Low-rating notification delivery failed")


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
@permission_classes([AllowAny])
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

from .models import Doctor
from .serializers import DoctorSerializer

class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.filter(is_active=True).order_by('order', 'name')
    serializer_class = DoctorSerializer
    permission_classes = [PublicReadStaffWrite]
