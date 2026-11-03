from django.conf import settings
from django.core.mail import get_connection
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Check SMTP connectivity/authentication when enabled; never send a message"

    def handle(self, *args, **options):
        if not settings.EMAIL_ALERTS_ENABLED:
            self.stdout.write("Email alerts explicitly disabled")
            return
        try:
            connection = get_connection()
            connection.open()
            connection.close()
        except Exception:
            raise CommandError("SMTP connection/authentication failed; check protected .env settings") from None
        self.stdout.write("SMTP connection/authentication verified; no message sent")
