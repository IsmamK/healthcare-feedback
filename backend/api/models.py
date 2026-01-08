from django.db import models
from django.contrib.auth.models import User

class Question(models.Model):
    QUESTION_TYPES = [
        ('rating', 'Rating (Faces)'),
        ('textarea', 'Text Area'),
        ('yesno', 'Yes/No'),
                ('date', 'Date'),  # Add this line
    ]
    
    id_name = models.CharField(max_length=100, unique=True)
    english_text = models.TextField()
    bangla_text = models.TextField()
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPES)
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    is_additional = models.BooleanField(default=False)

    
    class Meta:
        ordering = ['order']
    
    def __str__(self):
        return f"{self.id_name} - {self.english_text[:50]}"


class FeedbackResponse(models.Model):
    RATING_VALUES = [
        (5, 'Excellent'),
        (4, 'Good'),
        (3, 'Neutral'),
        (2, 'Unsatisfied'),
        (1, 'Poor'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('reviewed', 'Reviewed'),
        ('action_taken', 'Action Taken'),
        ('resolved', 'Resolved'),
    ]
    
    phone_number = models.CharField(max_length=15)
    average_rating = models.FloatField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    additional_notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Feedback from {self.phone_number} - {self.average_rating} stars"

class Answer(models.Model):
    feedback = models.ForeignKey(FeedbackResponse, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    rating_value = models.IntegerField(choices=FeedbackResponse.RATING_VALUES, null=True, blank=True)
    text_value = models.TextField(blank=True, null=True)
    yesno_value = models.BooleanField(null=True, blank=True)
    date_value = models.DateField(null=True, blank=True)  # Add this field
    
    class Meta:
        unique_together = ['feedback', 'question']
    
    def __str__(self):
        return f"Answer for {self.question.id_name}"

class AdditionalResponse(models.Model):
    feedback = models.ForeignKey(FeedbackResponse, on_delete=models.CASCADE, related_name='additional_responses')
    question_type = models.CharField(max_length=100)
    response_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Additional response for {self.feedback.phone_number}"