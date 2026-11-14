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

5. If the failure follows a new image or configuration change, stop the stack and use the previous Git commit.

## Local rollback

```powershell
git log --oneline -5
git checkout <known-good-commit>
docker compose down
docker compose build
docker compose up -d
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```

After verification, return to the main branch and apply the fix through a pull request. Never force-push over the shared `main` branch.
