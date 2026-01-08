from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'questions', views.QuestionViewSet)
router.register(r'feedback', views.FeedbackResponseViewSet)
router.register(r'answers', views.AnswerViewSet)

urlpatterns = [
    path('questions/additional/', views.get_additional_questions, name='additional-questions'),
        path('questions/update_order/', views.update_question_order, name='update-question-order'),



    path('dashboard/analytics/', views.analytics_dashboard_api, name='analytics-dashboard-api'),
    path('dashboard/update-status/<int:feedback_id>/', views.update_feedback_status, name='update-feedback-status'),







            path('', include(router.urls)),
]



