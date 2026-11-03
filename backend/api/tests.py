from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import OperationalError
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Doctor, FeedbackResponse, Question


class AccessTests(APITestCase):
    def setUp(self):
        self.question = Question.objects.create(
            id_name="care", english_text="How was your care?", bangla_text="", question_type="rating"
        )
        self.doctor = Doctor.objects.create(name="Test Doctor")
        self.feedback = FeedbackResponse.objects.create(phone_number="test", average_rating=5)

    def test_survey_configuration_is_public(self):
        for path in ("questions/", "questions/additional/", "doctors/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/api/{path}").status_code, 200)

    def test_anonymous_cannot_read_patient_data(self):
        for path in ("feedback/", f"feedback/{self.feedback.pk}/", "answers/", "dashboard/analytics/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/api/{path}").status_code, 401)

    def test_anonymous_cannot_mutate_administration(self):
        for path in ("questions/", "doctors/", "questions/update_order/",
                     f"feedback/{self.feedback.pk}/update_status/",
                     f"dashboard/update-status/{self.feedback.pk}/"):
            with self.subTest(path=path):
                self.assertEqual(self.client.post(f"/api/{path}", {}, format="json").status_code, 401)

    def test_feedback_submission_remains_public(self):
        response = self.client.post("/api/feedback/submit_feedback/", {
            "phone_number": "01712345678", "doctor_id": self.doctor.pk,
            "answers": {"care": {"rating": 5}},
        }, format="json")
        self.assertEqual(response.status_code, 201)
        feedback = FeedbackResponse.objects.get(pk=response.data["id"])
        self.assertEqual(feedback.average_rating, 5)
        self.assertEqual(feedback.answers.count(), 1)

    def test_regular_user_cannot_access_staff_data(self):
        user = get_user_model().objects.create_user(username="patient", password="test-pass-only")
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get("/api/feedback/").status_code, 403)
        self.assertEqual(self.client.post("/api/doctors/", {"name": "Bad"}).status_code, 403)

    def test_staff_can_read_and_update_feedback(self):
        user = get_user_model().objects.create_user(username="staff", password="test-pass-only", is_staff=True)
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get("/api/feedback/").status_code, 200)
        response = self.client.post(f"/api/dashboard/update-status/{self.feedback.pk}/", {"status": "reviewed"})
        self.assertEqual(response.status_code, 200)
        self.feedback.refresh_from_db()
        self.assertEqual(self.feedback.status, "reviewed")

    def test_public_user_registration_is_disabled(self):
        self.assertEqual(self.client.post("/auth/users/", {}).status_code, 404)

    def test_staff_login_and_token_logout(self):
        get_user_model().objects.create_user(username="staff", password="test-pass-only", is_staff=True)
        response = self.client.post("/auth/token/login/", {"username": "staff", "password": "test-pass-only"})
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['auth_token']}")
        self.assertEqual(self.client.get("/api/feedback/").status_code, 200)
        self.assertEqual(self.client.post("/auth/token/logout/").status_code, 204)
        self.assertEqual(self.client.get("/api/feedback/").status_code, 401)

    def test_regular_user_cannot_log_in_to_staff_portal(self):
        get_user_model().objects.create_user(username="patient", password="test-pass-only")
        response = self.client.post("/auth/token/login/", {"username": "patient", "password": "test-pass-only"})
        self.assertEqual(response.status_code, 403)


@override_settings(SECURE_SSL_REDIRECT=True, FORCE_SCRIPT_NAME="/backend")
class HealthTests(APITestCase):
    def test_health_probes_work_without_https_redirect(self):
        self.assertEqual(self.client.get("/health/live/").status_code, 200)
        self.assertEqual(self.client.get("/health/ready/").status_code, 200)

    def test_readiness_fails_when_database_is_unavailable(self):
        with patch("backend.health.connection.cursor", side_effect=OperationalError("test outage")):
            self.assertEqual(self.client.get("/health/ready/").status_code, 503)
            self.assertEqual(self.client.get("/health/live/").status_code, 200)
