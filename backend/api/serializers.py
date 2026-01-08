from rest_framework import serializers
from .models import Question, FeedbackResponse, Answer, AdditionalResponse

class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'

class AnswerSerializer(serializers.ModelSerializer):
    question_id_name = serializers.CharField(source='question.id_name', read_only=True)
    question_english = serializers.CharField(source='question.english_text', read_only=True)
    question_bangla = serializers.CharField(source='question.bangla_text', read_only=True)
    
    class Meta:
        model = Answer
        fields = '__all__'

class AdditionalResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalResponse
        fields = '__all__'

class FeedbackResponseSerializer(serializers.ModelSerializer):
    answers = AnswerSerializer(many=True, read_only=True)
    additional_responses = AdditionalResponseSerializer(many=True, read_only=True)
    
    class Meta:
        model = FeedbackResponse
        fields = '__all__'

class FeedbackSubmissionSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    answers = serializers.JSONField()
    additional_responses = serializers.JSONField(required=False)
    
    def validate_answers(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Answers must be a dictionary")
        return value
    
    def create(self, validated_data):
        # This will be implemented in the view
        pass