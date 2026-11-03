# Deployment status

Observed on 3 November 2026. Infrastructure is prepared; the first production image release is pending CI execution.

## Target and selected configuration

- Repository: IsmamK/healthcare-feedback; production branch main; preparation in PR 1.
- VPS: 187.127.218.115, SSH port 22, user abdullah. Shared Ubuntu 24.04 host; existing bdeshjobs services remain outside scope.
- Frontend: https://feedback.jghealthcare.com; backend: https://feedback.jghealthcare.com/backend/api/.
- DNS resolves to the selected VPS, with no AAAA answer. Apex/www/mail records are unchanged.
- Fresh isolated PostgreSQL database and one-time survey/doctor initialization were approved.
- Email alerts are explicitly disabled by the owner. Feedback remains saved and visible in the dashboard.
- Local database backups were requested in /opt/healthcare-feedback/backups, with 14-day retention. Offsite backups are not configured.
- Certificate issuance without a contact email was approved. The project certificate is valid until 1 February 2027; its renewal dry-run passed.

## Completed

- Production settings, staff API access controls, health endpoints, lean non-root images, persistent Compose services, release/rollback/backup/restore/configuration scripts and operating documentation.
- Main application configuration at /opt/healthcare-feedback/.env (mode 600), containing fresh Django/database secrets generated directly on the VPS. Protected per-service files are derived without printing values. The new apply-config command validates changes and supports application rollback; database credential changes require a separate rotation plan.
- Public browser API/SMS URLs are generated at container startup, allowing .env changes without rebuilding the frontend.
- Dedicated CI SSH key appended to authorized_keys and independently tested; trusted host identity is pinned. Operator keys were preserved.
- GitHub secrets VPS_SSH_KEY, VPS_KNOWN_HOSTS and DOCKER_HUB_PAT configured. Server/domain/registry variables are set; PRODUCTION_AUTO_DEPLOY remains false until the first verified release.
- Docker Hub repositories abdullahibnasiddiquie/healthcare-feedback-backend and healthcare-feedback-frontend verified public. Token authentication and pull/push scopes for both were verified. The VPS does not hold the CI push token.
- Project-only directory tree and bootstrap infrastructure staged. HTTP ACME routing, certificate issuance, project TLS vhost and shared Nginx validation completed. TLS validates publicly; the app upstream remains unavailable until the first release.
- Certbot renewal dry-run succeeded. Existing other-project Nginx deprecation warnings were preserved; unrelated configurations were not rewritten.

## Verification

- 13 backend tests pass, covering public submission, staff boundaries/login/logout, disabled notifications, readiness and non-overwriting administrator creation.
- 16 operational tests pass, covering partial/initial/missing-image/documentation/infrastructure planning, immutable refs, Nginx rendering and literal/least-privilege environment compilation.
- Frontend lint/build, Compose validation, shell syntax and actionlint pass.
- Local production-mode stack smoke passes with PostgreSQL, migrations, survey initialization, readiness, SPA, anonymous-record rejection, non-root/read-only processes and a real backup archive. A separate local restore test and real rendered Nginx syntax validation pass.
- Runtime frontend configuration was changed through container environment without rebuilding the image and verified through /config.js.
- Backend and frontend production dependency audits report no known advisories. Six moderate development-only ESLint/minimatch advisories have no compatible npm fix and are absent from the frontend runtime image.
- Earlier real GitHub CI runs 41626440451 and 41627039819 passed; deployment was correctly skipped on the PR. The latest configuration work requires its next CI run before merge/release.

## Remaining release verification

Run the final PR checks, merge the authorized deployment preparation, execute the first real image-build/push/deployment workflow, create and verify initial administrator access without displaying credentials, verify public/staff HTTPS flows, run and verify production backup/isolated restore/scheduling, and observe a subsequent CI redeployment. Verify existing unrelated container IDs remain unchanged. Enable the selected normal main-push policy only after the first release passes. Production success, published image digests and production backup/restore success have not yet been claimed.
