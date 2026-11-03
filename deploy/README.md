# Healthcare feedback production deployment

The application is prepared for an isolated Docker deployment on the shared VPS at `187.127.218.115`. The frontend is `https://feedback.jghealthcare.com`; the API is `https://feedback.jghealthcare.com/backend/api/`, token login is `/backend/auth/token/login/`, and Django administration is `/backend/admin/`. Only the DNS A record named `feedback` needs to point at this server. Keep the apex, www and mail records unchanged.

## Current deployment state

Production deployment, valid HTTPS, registry publication, two real CI/CD releases, browser verification and local backup/restore have completed successfully. See [STATUS.md](STATUS.md) for the latest observed results and resume point. Do not equate a passing CI check or a local image build with a working production release.

## Architecture and isolation

- React/Vite builds to a static, unprivileged Nginx image; browser API calls use the same-origin `/backend/api/` path.
- Django runs with Gunicorn as UID 10001, uses project-private PostgreSQL 17, and serves collected admin/DRF assets through WhiteNoise.
- The app currently has no uploaded files, workers, Redis, scheduler, WebSockets or server-side SMS credentials. The dashboard SMS form takes an operator-supplied provider key; never put a private key in a `VITE_*` build variable. SMTP alerts need rotated production credentials.
- Compose project `healthcare-feedback` owns its own network and data. API and frontend ports are bound to loopback only. Proposed host ports `18000` and `18080` were unused on the selected VPS at discovery; check again before binding. PostgreSQL has no published port.
- Host Nginx uses `/etc/nginx/conf.d/healthcare-feedback.conf`, following this VPS's existing `conf.d` convention. The renderer preserves the existing shared-host HTTP/2 listen convention on Nginx 1.30.6. No global Nginx, Docker, SSH or firewall configuration is replaced. The existing `bdeshjobs` application is outside this project's scope.
- A personal-registry directory, `~/.docker-healthcare-feedback`, isolates project pull credentials. It must be mode 700; its `config.json` must be 600. Registry credentials are encoded rather than encrypted unless a credential helper is configured.
- Docker group membership gives root-equivalent control of the host. Protect the production branch and deployment secrets accordingly; these scripts do not claim that sharing the existing Docker-enabled user provides a strict security boundary.

## Required setup and chosen release policy

The canonical application configuration is **`/opt/healthcare-feedback/.env`**, protected with mode 600. Its safe template is [deploy/.env.example](.env.example). It contains SMTP details and recipients, the explicit email-alert switch, domains/origins, PostgreSQL credentials, browser API/SMS URLs, timezone and backup policy. Browser configuration contains public URLs only. CI SSH/registry access remains managed through GitHub secrets.

To change application settings later, edit the protected main `.env` and run:

```bash
bash /opt/healthcare-feedback/current/scripts/apply-config.sh
```

This validates the file, generates least-privilege files under `env/`, checks production settings and SMTP authentication when enabled, and recreates only app containers whose configuration changed. It verifies health/HTTPS and restores the prior service configuration if validation fails. No messages are sent by the SMTP check. Read-only frontend containers generate `/config.js` from the public settings at startup, so changing `PUBLIC_API_URL` or `PUBLIC_BULK_SMS_API_URL` does not require rebuilding an image.

The generated `env/*.env` files should not be edited directly. Values in the main `.env` are literal and unquoted; `$` and `#` in passwords are preserved. Domain/port changes also require matching DNS, certificates and the authorized project Nginx update. Database credential changes are deliberately rejected until a database rotation/import plan is performed; editing a PostgreSQL initialization password does not rotate a running database. Certificate contact email changes require updating the Certbot account as well. Keep image versions under CI control.

Provide secret material through a protected local file or a secure interactive CLI, never chat or Git. The agent can copy/configure it without printing values.

1. Authorized sudo access for project directory creation, the project vhost, Certbot and certificate renewal checks. SSH as `abdullah` works, but `sudo -n` currently requires a password. Do not bypass this through Docker's root privileges.
2. A Docker Hub namespace and two repositories: `<namespace>/healthcare-feedback-backend` and `<namespace>/healthcare-feedback-frontend`. The owner selected public repositories. The CI Read+Write PAT is stored in GitHub; public pulls avoid placing that push credential on the VPS. Private repositories would require a separate VPS Read-only token. Existing other-project registry credentials are not reused.
3. A certificate notification email, or explicit `CERTBOT_WITHOUT_EMAIL=true`. The owner chose issuance without a contact email. Automatic renewal remains enabled; email expiry notices are unavailable.
4. This installation explicitly uses `EMAIL_ALERTS_ENABLED=false` at the owner's request. Feedback remains saved, but no notification emails are sent. To enable alerts, supply rotated SMTP settings and set the flag to `true`; production requires an explicit flag and never silently falls back to console mail. The original public Git history contained an SMTP password and Django key: removing them does not revoke them. Rotate the original mail password at its provider before any reuse. New Django and database secrets were generated directly in protected VPS files. Do not rewrite history without separate authorization.
5. The owner confirmed a fresh project database. Initialize isolated PostgreSQL and seed the questions/doctors once. If importing legacy data later, review migration `0002`, which restructures/removes old fields and deletes a legacy model; do not apply the complete migration history blindly to an old database.
6. The owner chose local database backups in `/opt/healthcare-feedback/backups`, retaining 14 days, with `BACKUP_MODE=local-only-accepted`. Local-only backups do not protect against VPS loss. Add offsite restic storage later through an approved destination and credentials; these scripts do not initialize or prune a shared repository automatically.

## Runtime layout and credentials

```text
/opt/healthcare-feedback/
  compose/image-tags.env       # atomic copy of the active immutable image references
  .env                        # canonical application configuration, mode 600
  env/backend.env              # real Django/SMTP configuration, mode 600
  env/database.env             # DB name/user/password, mode 600
  env/frontend.env             # public runtime browser URLs only, generated from .env
  env/site.env                 # domains, ports, email, backup policy, mode 600
  env/backup.env               # optional restic provider configuration, mode 600
  data/postgres/               # persistent PostgreSQL 17 data
  data/acme/                   # project-only Certbot webroot
  nginx/                      # project vhost snapshots
  releases/<run>-<attempt>/    # immutable operational bundle, images.env and manifest.json
  current -> releases/...     # last externally verified release
  previous -> releases/...    # preceding verified release
  backups/ logs/ scripts/
  transaction.pending         # blocks new releases after interrupted/unsafe failure
```

Start with `deploy/.env.example`; never overwrite the real `.env` with a template on reruns. Production rejects missing required settings and has no SQLite, permissive CORS or console-mail fallback. `sync-env.py` validates the main file and generates protected service-specific files without displaying values. Compose 2.30+ is required for raw env-file values; the target has Compose v5.4.0. Generated `backend.env`, `database.env` and `frontend.env` use literal values, while the generated host/backup files use safe shell quoting.

All following commands are run by the agent after the missing access/input is available. They are an operator reference, not a request that the user perform routine deployment steps manually.

```bash
bash deploy/scripts/bootstrap.sh
# Securely install configured env files and chmod 600 each.
install -d -m 700 "$HOME/.docker-healthcare-feedback"
# Supply the pull-only PAT through stdin, without echoing it or putting it in command arguments.
DOCKER_CONFIG="$HOME/.docker-healthcare-feedback" docker login --username '<namespace>' --password-stdin
```

Generate a new Django key and DB password directly into protected configuration; do not print them. Keep `127.0.0.1` and `localhost` in `DJANGO_ALLOWED_HOSTS` for container probes. Set the frontend/cors/csrf origin to `https://feedback.jghealthcare.com`. SMTP SSL on port 465 and STARTTLS on port 587 are mutually exclusive; configure the provider's actual settings.

## GitHub Actions contract

The workflow is [deploy-production.yml](../.github/workflows/deploy-production.yml). It tests pull requests and pushes to `main`. Deployments run on `main` only, through `workflow_dispatch`, or automatically when repository variable `PRODUCTION_AUTO_DEPLOY=true`. Leave automatic deployment disabled until production prerequisites and the first manual deployment have passed. All third-party actions are pinned to verified commit SHAs.

| Name | Type and scope | Purpose |
|---|---|---|
| `DOCKER_HUB_USERNAME` | repository variable or secret | selected registry namespace |
| `DOCKER_HUB_PAT` | repository secret | dedicated CI push PAT |
| `VPS_HOST` | repository variable or secret | `187.127.218.115` |
| `VPS_PORT` | repository variable or secret | `22` |
| `VPS_USER` | repository variable or secret | `abdullah`, or an approved dedicated user |
| `VPS_SSH_KEY` | repository secret or `production` environment secret | dedicated CI private key |
| `VPS_KNOWN_HOSTS` | repository secret or variable | verified SSH host-key line |
| `FRONTEND_DOMAIN`, `API_DOMAIN` | repository variables | both `feedback.jghealthcare.com` |
| `PRODUCTION_AUTO_DEPLOY` | repository variable | `false` until first verified release; `true` for normal automatic pushes |

Repository secrets are available to the deployment job, which references environment `production`; use production-environment secrets for deployment credentials when an administrator has configured appropriate protection. The current collaborator can set repository secrets; environment review/branch-protection changes may need the owner. No deployment secret is exposed to the pull-request check job. Never use `pull_request_target` to execute untrusted code with these credentials.

Use `gh secret set NAME < protected-file` from Bash, or `Get-Content -Raw protected-file | gh secret set NAME` from PowerShell. Verify names only with `gh secret list`. Generate a project-specific CI SSH key without overwriting the operator's key, append its public half to `authorized_keys`, preserve existing login routes, and test a second login. Pin the existing trusted host key; verify newly observed keys against the provider console, and never use `StrictHostKeyChecking=no`.

One sequential deployment job avoids skipped dependency bugs. It compares the deployed Git SHA with the requested revision, tests image availability, builds each changed or missing component independently, and reuses the other immutable digest. Infrastructure-only changes apply the new Compose/scripts without rebuilding either image. Documentation-only changes skip release. Build caches have separate backend/frontend scopes. Registry tags include full Git SHA, run ID and attempt; deployed references use registry SHA256 digests. GitHub concurrency plus a remote `flock` serialize releases; the server rejects older/already-deployed run identities.

## First release and TLS sequence

1. Inspect shared-host resources/ports and take an inventory. Bootstrap only this project's directories, securely install real env files and isolated registry auth. No placeholder secrets may be used for a live release.
2. If no prior production data exists, explicitly set `INITIALIZE_EMPTY_DATABASE=true` in `site.env`. This permits one-time question/doctor seeding only when the first migration creates a fresh database. Otherwise perform the agreed export/import plan. Never run the population commands against existing customized records as a routine release task.
3. Build/push immutable images and stage a release bundle under `/opt/healthcare-feedback/releases/<run>-<attempt>`. The bundle contains Compose, scripts, examples and image metadata, not source code, actual env files or data.
4. Apply the HTTP-only project vhost, verify DNS and public HTTP challenge routing, obtain the project certificate, then apply TLS. The certificate name is `healthcare-feedback`; a webroot renewal hook validates and reloads Nginx. Existing certificates are untouched.

```bash
sudo bash /opt/healthcare-feedback/releases/<id>/scripts/configure-nginx.sh /opt/healthcare-feedback/releases/<id> http
sudo bash /opt/healthcare-feedback/releases/<id>/scripts/configure-nginx.sh /opt/healthcare-feedback/releases/<id> issue-cert
sudo bash /opt/healthcare-feedback/releases/<id>/scripts/configure-nginx.sh /opt/healthcare-feedback/releases/<id> tls
sudo certbot renew --cert-name healthcare-feedback --dry-run
```

5. Run `release.sh` for the staged bundle (or its workflow step). It validates secrets by presence/permissions, capacity, immutable refs and installed Nginx config; pulls images; starts/reuses DB; inspects migrations; backs up before migration; applies migrations; starts only app services; waits for health; verifies HTTPS/assets/survey data/access boundaries; backs up again; then promotes active metadata atomically. It never recreates an existing DB container as part of an app release.
6. Create an approved initial staff account by passing a generated password through stdin to `python manage.py bootstrap_admin` in the backend container. The command refuses to overwrite an existing account. Store its login details in a protected file, then test real portal login and public feedback submission without retaining test patient records.
7. Run a subsequent real GitHub release, inspect its run URL/digests and public health, then enable auto-on-main if selected. Local planning tests cover backend-only, frontend-only, infrastructure-only, first-release, missing-image and documentation-only paths; live workflow coverage must be recorded separately.
8. Install the scoped user backup cron entry using `schedule-backup.sh`, run a fresh backup and isolated restore test, and verify offsite backup status. Schedule times use the VPS timezone, not the Django timezone. Existing backup jobs are preserved.

Nginx changes require authorized root application via `configure-nginx.sh` before the workflow promotes a corresponding release; the release fails closed if rendered configuration and installed configuration differ. Generic passwordless sudo is not granted by these scripts. Routine app releases need Docker and project-directory access, not sudo.

## Backup and recovery

```bash
bash /opt/healthcare-feedback/current/scripts/backup.sh
bash /opt/healthcare-feedback/current/scripts/restore-test.sh
bash /opt/healthcare-feedback/current/scripts/schedule-backup.sh
```

Backups use `pg_dump -Fc`, nonempty/archive validation and SHA256 checksums; offsite mode requires a successful restic upload before reporting success. Local retention is `BACKUP_RETENTION_DAYS` (default 14). Offsite retention/pruning must follow the selected repository's policy; these scripts never change a shared restic repository's retention. No media backup is needed because this app has no uploaded-file fields. Back up runtime secrets separately through an approved encrypted secret-management system.

The restore test uses an isolated PostgreSQL container with no network, ports or live volume mounts. It restores with errors enabled, checks migration and feedback tables, then removes only that test container. It needs spare RAM; it is not automatically run on every release.

For pending migrations on an existing database, inspect `python manage.py deployment_plan` and `migrate --plan` using the candidate image. Review destructive/incompatible changes and backup policy; write the exact approved Git SHA into `env/migration-approved-sha` only after the review and required authorization. A backup is taken before migration. Migration failure never triggers an automatic database restore. Application rollback is automatic only when no migration was attempted; otherwise a deliberate compatibility/recovery decision is required.

For an explicitly reviewed compatible app rollback:

```bash
bash /opt/healthcare-feedback/current/scripts/rollback.sh --schema-compatible
```

Do not drop a database, reverse migrations or overwrite live data to roll back an image. Recovery from a dump restores the dump's point in time, losing later writes unless separately recovered. Restore to an isolated database first, validate it, then agree a cutover plan.

If `transaction.pending` exists, new releases stop. Under the project release lock, inspect its candidate path, `current`/`previous`, project container image IDs, `logs/releases.log`, migration state and the candidate manifest. Determine whether the candidate, old release or a manual data recovery is appropriate; recheck DB/schema compatibility and public health. Repair only this project's state, record the result, and remove the pending marker only after reconciliation. A process killed during promotion may have updated `current` but not the convenience `compose/image-tags.env`; the manifest and actual containers must agree before making the metadata consistent. Do not blindly delete the marker and rerun.

## Verification commands and references

```bash
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
python backend/manage.py test api
npm --prefix frontend ci --no-audit --no-fund
npm --prefix frontend run lint
npm --prefix frontend run build
bash deploy/scripts/check.sh
python3 deploy/scripts/verify.py feedback.jghealthcare.com feedback.jghealthcare.com
```

Production configuration checks must run with real configured env files, without printing the expanded Compose config or settings. Use `docker compose config --quiet`. Production readiness is dependency-aware; liveness never contacts external services. WhiteNoise static collection happens at image build time.

Base images are pinned to observed registry digests. Review and refresh their patch digests as part of security maintenance; do not change the PostgreSQL major version or data mount layout as a routine image update.

Operational behavior was checked against the official [Django deployment checklist](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/), [Docker Compose services reference](https://docs.docker.com/reference/compose-file/services/), [GitHub Actions concurrency documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [Docker GitHub cache documentation](https://docs.docker.com/build/cache/backends/gha/) and [Certbot user guide](https://eff-certbot.readthedocs.io/en/stable/using.html).
