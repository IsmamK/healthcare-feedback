# healthcare-feedback

Django patient-feedback API and React/Vite survey/staff dashboard.

Production target: `feedback.jghealthcare.com`, with the API at `/backend/api/` on the same domain. Deployment preparation, required credentials, release commands and recovery instructions are documented in [deploy/README.md](deploy/README.md). Check [deploy/STATUS.md](deploy/STATUS.md) for verified progress and remaining blockers.

Production settings live in `/opt/healthcare-feedback/.env`; use [deploy/.env.example](deploy/.env.example) as the reference. After editing runtime settings, run `/opt/healthcare-feedback/current/scripts/apply-config.sh`. Email alerts are explicitly disabled for the initial release and can be enabled after SMTP is configured.

For development, create a Python environment, install `backend/requirements.txt`, run Django migrations and `python backend/manage.py runserver`. In `frontend`, run `npm ci` and `npm run dev`. Vite proxies `/backend/` to the local Django server. Local development uses SQLite and console email; production requires explicit PostgreSQL settings and SMTP when email alerts are enabled.
