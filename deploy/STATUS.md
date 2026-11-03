# Verified production deployment

Verified on 3 November 2026. The frontend, API, staff portal, persistent database, CI/CD and local backup/restore are working.

## Access and configuration

- Frontend: https://feedback.jghealthcare.com
- Staff login: https://feedback.jghealthcare.com/login
- Django admin: https://feedback.jghealthcare.com/backend/admin/
- API: https://feedback.jghealthcare.com/backend/api/
- Readiness: https://feedback.jghealthcare.com/backend/health/ready/
- VPS: 187.127.218.115; SSH port 22; user abdullah; Compose project healthcare-feedback.
- Main configuration: /opt/healthcare-feedback/.env, mode 600. Edit this file and run `bash /opt/healthcare-feedback/current/scripts/apply-config.sh` to apply validated runtime changes. Generated service files stay under env/ and should not be edited directly.
- Administrator credentials are stored separately in the protected VPS file env/admin-access.json and the protected local .local/private/admin-access.json. No password or token is committed or displayed here.
- Email alerts are explicitly disabled by the owner. Set EMAIL_ALERTS_ENABLED=true only after filling SMTP and recipient settings in the main .env. Applying configuration checks SMTP authentication without sending a message. Feedback remains stored while alerts are off.
- The owner selected a fresh database and local-only backups. Certificate issuance without a contact email was also approved.

## Observed releases

Initial build, publication and deployment completed in [workflow run 41633070981](https://github.com/IsmamK/healthcare-feedback/actions/runs/41633070981), with source ab19286217f832bc43a3b6dca8b5b1ef9723e9d8.

A normal push then automatically built/deployed the frontend-only logout fix in [workflow run 41634473015](https://github.com/IsmamK/healthcare-feedback/actions/runs/41634473015), with source 2d8906746d96eb1d13db329dfdeaad0c28275a8b. The backend build was skipped, its immutable digest was reused, and the backend/database container IDs stayed unchanged. PRODUCTION_AUTO_DEPLOY=true enables normal main-branch releases. Documentation-only changes intentionally do not deploy.

- Backend image: abdullahibnasiddiquie/healthcare-feedback-backend@sha256:2a7310c1dd1f925f483e12c40304f99090acac126a15dcba11b15e29f68466e8
- Frontend image: abdullahibnasiddiquie/healthcare-feedback-frontend@sha256:c0186c822211cfb01c25130f3792fe0c05c74bb18e262f63b461dc792d51f338
- Docker-reported image sizes on the VPS: backend 62,369,055 bytes; frontend 26,098,533 bytes.
- Active release: /opt/healthcare-feedback/releases/41634473015-1; previous verified release: 41633070981-1. No pending transaction remains.

## Verified behavior

- Public HTTPS, redirect, certificate, frontend HTML/assets/logo/runtime config, survey questions/doctors and dependency-aware API readiness pass.
- Real administrator creation, HTTPS login, public feedback submission, staff read/update and token logout pass. Test feedback was removed. Browser logout now invalidates the server token; subsequent use returns 401.
- Real browser survey and staff dashboard load with zero application exceptions. Private QA screenshots are retained locally.
- Production check --deploy, Django admin static assets, source migration consistency, 13 backend tests, 16 operational tests, frontend lint/build, Compose/shell/actionlint checks and image smoke checks pass.
- The main .env compiler and apply-config command were executed successfully on the live server without changing image versions or database credentials. Runtime frontend URL changes were verified without rebuilding an image.
- Backend and frontend production dependency audits reported no known advisories. Six moderate development-only ESLint/minimatch advisories have no compatible npm fix; these tools are absent from the frontend runtime image.
- HTTPS certificate is valid until 1 February 2027, automatic renewal is enabled, and its renewal dry-run passed. Contact-email notifications are unavailable by the owner's choice.
- All eight pre-existing VPS container IDs and image references are unchanged. Existing Nginx files, apex/www/mail DNS records, other backup jobs, registry credentials and firewall rules were preserved. Only this project's vhost was added/reloaded after nginx -t.

## Backups and recovery

- Destination: /opt/healthcare-feedback/backups; protected local PostgreSQL custom-format dumps and SHA256 checksums.
- Schedule: daily 02:17 UTC (08:17 Asia/Dhaka); retention 14 days. The existing bdeshjobs 03:00 UTC backup entry remains intact.
- Latest verified archive at final verification: 20261103T121943-3289931.dump.
- Isolated restore of the latest archive passed at 2026-11-03T12:23:13Z. The test container had no network, published ports or live data mounts and was removed afterward.
- Offsite backup is not configured, as the owner requested local backup storage. Local backups cannot recover from loss of the entire VPS.
- Migration/rollback/restore procedures and deliberate database credential rotation are documented in deploy/README.md. No automatic database restoration or destructive schema rollback is performed.

The original public Git history contained old SMTP credentials and a Django key. They are not used by this deployment; newly generated runtime secrets are protected on the VPS. Rotate the old mail credential at its provider before any future reuse; history was not rewritten.
