import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PlanningTests(unittest.TestCase):
    def setUp(self):
        self.plan = load("plan-builds").plan
        self.previous = {"GIT_SHA": "a" * 40}

    def test_first_release_builds_both(self):
        self.assertEqual(self.plan([], {}), {"backend": True, "frontend": True, "deploy": True})

    def test_frontend_only(self):
        self.assertEqual(self.plan(["frontend/src/App.jsx"], self.previous),
                         {"backend": False, "frontend": True, "deploy": True})

    def test_backend_only(self):
        self.assertEqual(self.plan(["backend/api/views.py"], self.previous),
                         {"backend": True, "frontend": False, "deploy": True})

    def test_infrastructure_only_does_not_rebuild(self):
        self.assertEqual(self.plan(["deploy/compose.yml"], self.previous),
                         {"backend": False, "frontend": False, "deploy": True})

    def test_documentation_does_not_deploy(self):
        self.assertEqual(self.plan(["README.md", "deploy/README.md"], self.previous),
                         {"backend": False, "frontend": False, "deploy": False})

    def test_missing_image_builds_only_missing_service(self):
        self.assertEqual(self.plan([], self.previous, missing=["frontend"]),
                         {"backend": False, "frontend": True, "deploy": True})

    def test_manual_force_builds_both(self):
        self.assertTrue(all(self.plan([], self.previous, force=True).values()))


class MetadataTests(unittest.TestCase):
    def setUp(self):
        self.validator = load("validate-release").read_release
        self.metadata = (
            f"BACKEND_IMAGE=namespace/backend@sha256:{'a' * 64}\n"
            f"FRONTEND_IMAGE=namespace/frontend@sha256:{'b' * 64}\n"
            f"GIT_SHA={'c' * 40}\nCI_RUN_ID=123\nCI_RUN_ATTEMPT=1\n"
        )

    def validate(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "images.env"
            path.write_text(content)
            return self.validator(path)

    def test_digest_references_accepted(self):
        self.assertEqual(self.validate(self.metadata)["CI_RUN_ID"], "123")

    def test_mutable_tag_rejected(self):
        with self.assertRaises(ValueError):
            self.validate(self.metadata.replace(f"@sha256:{'a' * 64}", ":latest"))

    def test_shell_injection_rejected(self):
        with self.assertRaises(ValueError):
            self.validate(self.metadata.replace("CI_RUN_ID=123", "CI_RUN_ID=$(id)"))


class NginxTests(unittest.TestCase):
    def render(self, content, mode="tls"):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "site.env"
            path.write_text(content)
            return load("render-nginx").render(path, mode)

    def test_same_origin_routes_api_and_spa(self):
        result = self.render("FRONTEND_DOMAIN=feedback.jghealthcare.com\nAPI_DOMAIN=feedback.jghealthcare.com\nBACKEND_PORT=18000\nFRONTEND_PORT=18080\n")
        self.assertIn("location /backend/", result)
        self.assertIn("proxy_pass http://127.0.0.1:18000/;", result)
        self.assertIn("/.well-known/acme-challenge/", result)
        self.assertEqual(result.count("server_name feedback.jghealthcare.com;"), 2)

    def test_domain_injection_rejected(self):
        with self.assertRaises(ValueError):
            self.render("FRONTEND_DOMAIN=example.com;include /tmp/bad\nAPI_DOMAIN=example.com\nBACKEND_PORT=18000\nFRONTEND_PORT=18080\n")


class EnvironmentTests(unittest.TestCase):
    def setUp(self):
        self.module = load("sync-env")
        self.values = self.module.parse((SCRIPTS.parent / ".env.example").read_text())
        self.values.update(DJANGO_SECRET_KEY="test-only-" + "a" * 60, POSTGRES_PASSWORD="test-only-" + "b" * 40)

    def test_literal_password_characters_are_preserved(self):
        password = "test-only-" + "$#" * 20
        self.values["POSTGRES_PASSWORD"] = password
        files = self.module.render(self.values)
        self.assertIn(f"POSTGRES_PASSWORD={password}\n", files["database.env"])

    def test_disabled_email_can_launch_without_smtp_and_frontend_has_no_secrets(self):
        files = self.module.render(self.values)
        self.assertIn("EMAIL_ALERTS_ENABLED=false", files["backend.env"])
        self.assertNotIn("PASSWORD", files["frontend.env"])
        self.assertNotIn("SECRET", files["frontend.env"])
        self.assertNotIn("AWS_SECRET", files["backend.env"])

    def test_enabled_email_requires_configuration(self):
        self.values["EMAIL_ALERTS_ENABLED"] = "true"
        with self.assertRaisesRegex(ValueError, "EMAIL_HOST"):
            self.module.render(self.values)

    def test_unknown_settings_are_rejected(self):
        with self.assertRaises(ValueError):
            self.module.parse("EMAIL_HOST_PASWORD=example")
