import sys

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create an initial administrator using a password from stdin; never reset an existing account"

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")

    def handle(self, *args, **options):
        password = sys.stdin.readline().rstrip("\r\n")
        if len(password) < 24:
            raise CommandError("Supply a generated password of at least 24 characters through stdin")
        users = get_user_model().objects
        if users.filter(username=options["username"]).exists():
            raise CommandError("Account already exists; refusing to reset its password")
        users.create_superuser(username=options["username"], email="", password=password)
        self.stdout.write("Initial administrator created; password was not displayed")
