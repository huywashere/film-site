# Production deployment runbook

## Preconditions

- Production secrets are configured outside Git.
- Cloudflare proxy is enabled and the VPS firewall trusts only approved SSH CIDRs
  and Cloudflare origin ranges.
- PostgreSQL backup has completed and a restore has been tested recently.
- CI has passed lint, tests, builds, dependency audit, Compose and Terraform checks.

## Docker Compose deployment

All Compose commands must be evaluated from the repository root so build contexts
remain stable after the infrastructure reorganization:

```bash
docker compose --project-directory . \
  -f infra/docker/docker-compose.yml config --quiet
docker compose --project-directory . \
  -f infra/docker/docker-compose.yml pull
docker compose --project-directory . \
  -f infra/docker/docker-compose.yml up -d
```

Run Prisma migrations before routing traffic to an incompatible API release:

```bash
docker compose --project-directory . \
  -f infra/docker/docker-compose.yml run --rm api \
  sh -c "cd /app/apps/api && npx prisma migrate deploy"
```

## Verification

```bash
docker compose --project-directory . \
  -f infra/docker/docker-compose.yml ps
curl -fsS https://YOUR_DOMAIN/api/v1/health
curl -fsS https://YOUR_DOMAIN/api/catalog/health
docker compose --project-directory . -f infra/docker/docker-compose.yml exec media-worker-rs /usr/local/bin/netphim-media-worker healthcheck
docker compose --project-directory . -f infra/docker/docker-compose.yml exec redis redis-cli -a "$REDIS_PASSWORD" XLEN netphim:hls:analysis:results
```

Verify login, admin GitHub authentication, one movie detail page, one episode from
each enabled source, search fallback and WebSocket watch-party connectivity.

## Rollback

1. Set `IMAGE_TAG` to the last known-good immutable tag.
2. Re-run Compose for `api`, `web`, `media-gateway`, `media-worker-rs` and `openresty`.
3. Do not reverse a database migration until its rollback has been reviewed.
4. Confirm health endpoints and inspect error rate before reopening traffic.

The automated GitLab path is implemented in `scripts/gitlab-deploy.sh` and stores
the previous deployed tag in `.last_deployed_tag`.

## Terraform

Terraform runs from `infra/terraform`:

```bash
terraform -chdir=infra/terraform fmt -check -recursive
terraform -chdir=infra/terraform init
terraform -chdir=infra/terraform validate
terraform -chdir=infra/terraform plan -out=netphim.tfplan
```

Always inspect the plan. A plan that replaces the production Droplet, Reserved IP,
firewall or DNS records requires explicit review before apply.

## Kubernetes

Kubernetes manifests in `infra/kubernetes` are not part of the default VPS deploy.
Enable them only for a managed cluster after configuring a secret manager, storage
classes, ingress controller, monitoring and backups.

## Incident checklist

1. Stop rollout and preserve logs.
2. Check OpenResty, web, API, media gateway, Redis, PostgreSQL and provider health.
3. Roll back application images if the regression follows a release.
4. Keep the database online unless corruption is confirmed.
5. Record the timeline, root cause and follow-up actions after recovery.
