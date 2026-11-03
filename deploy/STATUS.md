# Deployment status

Observed on 3 November 2026. Production has **not** been deployed or verified.

## Confirmed target

- Repository: `IsmamK/healthcare-feedback`; production branch `main`.
- VPS: `187.127.218.115`, SSH port 22, user `abdullah`, accessed through WSL Ubuntu-24.04 with `~/.ssh/vps_key`.
- Frontend: `https://feedback.jghealthcare.com`.
- Backend API: `https://feedback.jghealthcare.com/backend/api/`; no separate backend domain.
- Public DNS A resolution matches the new VPS; no AAAA answer was returned. The apex/www/mail records remain outside scope.
- Server is shared Ubuntu 24.04 with Docker/Compose, Nginx and Certbot already installed. About 147 GB disk and 13 GB RAM were available at inspection. Existing bdeshjobs containers/ports/configuration were not changed.
- Loopback ports 18000 and 18080 were free at inspection and must be checked again before first bind.

## Completed preparation

- Environment-based production settings, required-secret validation, PostgreSQL/Gunicorn/WhiteNoise configuration, dependency-aware health endpoints, restricted CORS and protected staff/patient-data APIs.
- Existing frontend API paths consolidated to same-origin `/backend/`, with a development Vite proxy.
- Backend dependencies reduced to the libraries actually used, Django updated within the 5.2 LTS series, and frontend lockfile security fixes applied without forced major upgrades.
- Multi-stage non-root Docker images, Docker context exclusions, raw runtime env templates and isolated persistent Compose configuration.
- Project-scoped bootstrap, Nginx/TLS, transactional release, rollback, backup, isolated restore-test and backup-scheduling scripts; operating instructions in [README.md](README.md).
- CI workflow with pinned actions, test checks, independent image builds/digests, missing-image handling, infrastructure-only updates, serialized releases and deployment ordering checks.
- Dedicated CI key `~/.ssh/healthcare_feedback_deploy` generated in WSL, public half appended to the selected user's authorized_keys, and a separate login tested successfully. Operator SSH keys were preserved.
- Repository secrets `VPS_SSH_KEY` and `VPS_KNOWN_HOSTS` set and verified by name. The host key came from the already-trusted WSL known_hosts entry and strict SSH verification succeeded.
- Repository variables set: VPS_HOST, VPS_PORT, VPS_USER, FRONTEND_DOMAIN, API_DOMAIN and PRODUCTION_AUTO_DEPLOY=false. Automatic public releases remain disabled.

## Verified checks

- 11 Django tests pass: staff login/logout, public survey access/submission, protected records/admin operations, and readiness failure. Fresh test DB migrations succeed; no missing model migrations were detected.
- 12 operational tests pass, covering initial/partial/missing-image/documentation/infrastructure build decisions, immutable metadata validation and Nginx rendering.
- Frontend lint and production build pass. Vite reports a non-fatal bundle-size advisory for the existing approximately 520 kB JS bundle.
- Compose configuration and shell syntax checks pass. `actionlint` validates the workflow.
- Real GitHub pull-request CI [run 41626440451](https://github.com/IsmamK/healthcare-feedback/actions/runs/41626440451) completed successfully; the deployment job was deliberately skipped on the PR. This verifies CI checks, not a production deployment. Preparation is published in [draft PR 1](https://github.com/IsmamK/healthcare-feedback/pull/1).
- Both local Docker images build; production collectstatic and `check --deploy --fail-level WARNING` pass. HSTS include-subdomains/preload warnings are deliberately silenced to avoid asserting unverified domain-wide policy; all other deployment warnings remain fatal.
- The production-mode local Compose smoke test passes with persistent PostgreSQL, fresh migrations, survey initialization, dependency-aware health, SPA fallback, anonymous-record rejection and verified non-root UIDs. A real database dump was created/validated and restored into a separate no-network test container. These are local tests, not production backup/restore claims.
- Rendered TLS Nginx configuration passes a real `nginx -t` using a disposable test certificate. Shared-host Nginx validation remains pending authorized sudo access.
- Docker-reported local image sizes: backend 62,368,999 bytes (59.5 MiB); frontend 26,097,673 bytes (24.9 MiB). The frontend runtime is pinned to the observed current Nginx 1.30 stable image and its non-root/read-only/SPA health smoke test passes. Registry-pushed image digests have not been observed; local image IDs are not a substitute.
- Backend requirements audit: no known vulnerabilities reported. Frontend production dependency audit: zero advisories. Six moderate advisories remain in the development-only ESLint/minimatch dependency chain; `npm audit fix` reports no compatible fix. These tools are absent from the frontend runtime image.

## Remaining blockers and resume point

1. Sudo is not available to a fresh automated SSH connection: `sudo -n true` still returns “a password is required.” A protected local sudo-password file path or appropriate authorized access is needed for project directory creation and Nginx/Certbot operations. Do not bypass this using Docker.
2. Docker Hub namespace, repository availability/visibility and dedicated CI push / VPS pull tokens have not been supplied or configured. No project images have been published.
3. Rotated production SMTP configuration, certificate notification email and a fresh-vs-import database decision are pending. The original committed SMTP password must be rotated at the mail provider; historical exposed credentials have not been revoked by repository edits.
4. Offsite backup destination/credentials/retention, or explicit temporary local-only acceptance, is pending.

Once these inputs are available: bootstrap only `/opt/healthcare-feedback`, install real protected env files and project registry auth, configure this project's HTTP vhost/certificate/TLS, execute the first image release, verify staff/public flows over HTTPS, run and observe a real deployment workflow and subsequent redeployment, produce/restore-test a backup, verify offsite status, and then enable the selected auto-on-main policy. No production `/opt` directory, Nginx vhost, certificate, containers, database, backup or public release has been created yet.
