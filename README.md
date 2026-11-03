# healthcare-feedback

Django patient-feedback API and React/Vite survey/staff dashboard.

Production target: `feedback.jghealthcare.com`, with the API at `/backend/api/` on the same domain. Deployment preparation, required credentials, release commands and recovery instructions are documented in [deploy/README.md](deploy/README.md). Check [deploy/STATUS.md](deploy/STATUS.md) for verified progress and remaining blockers.

For development, create a Python environment, install `backend/requirements.txt`, run Django migrations and `python backend/manage.py runserver`. In `frontend`, run `npm ci` and `npm run dev`. Vite proxies `/backend/` to the local Django server. Local development uses SQLite and console email; production requires explicit PostgreSQL and SMTP settings.
