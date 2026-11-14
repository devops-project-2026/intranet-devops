# Operations Guide

## Service checks

Run these commands from the repository root:

```powershell
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose exec backend php bin/console doctrine:migrations:status
```

The expected state is `healthy` for PostgreSQL, backend and frontend.

## Incident response

1. Check the service status and recent logs.
2. Confirm whether the failure affects one service or the whole stack.
3. Do not delete the database volume during an incident.
4. Capture logs with:

```powershell
docker compose logs --no-color > compose-logs.txt
```

5. If the failure follows a new image or configuration change, preserve the logs and identify the last known-good commit.

## Local rollback

For a local, isolated rollback demonstration, switch to a known-good revision and rebuild the application services:

```powershell
git log --oneline -5
git switch --detach <known-good-commit>
docker compose up -d --build
docker compose ps
git switch main
```

Keep the database volume. Do not roll back schema migrations by deleting the volume or running destructive SQL. Database schema changes need a separately reviewed, backward-compatible migration or a verified database backup and restore plan.

For a change already shared on `main`, use a reviewed revert commit or pull request. Never force-push over the shared branch.
