# Final DevOps Demonstration Checklist

## 1. Repository and automation

- [ ] Show the organization repository and the `main` branch.
- [ ] Show the commit history and the monorepo structure.
- [ ] Open GitHub Actions and show successful CI, Security, and Docker smoke test runs.
- [ ] Show the smoke-test logs artifact if a previous run failed.

## 2. Local stack

From the repository root:

```powershell
docker compose build
docker compose up -d
docker compose ps
docker compose exec backend php bin/console doctrine:migrations:status
```

Expected: database, backend, and frontend report `healthy`; Doctrine reports no pending migrations.

Open the application:

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:8000>

## 3. Security evidence

- [ ] Show Gitleaks and Trivy workflow results.
- [ ] Show that the backend and frontend images use non-root users:

```powershell
docker compose exec backend id
docker compose exec frontend id
```

- [ ] Explain that local JWT keys, environment files, and uploaded files are excluded from Git.
- [ ] Mention any remaining moderate dependency advisories transparently.

## 4. Operations and rollback

- [ ] Show service health and recent logs:

```powershell
docker compose ps
docker compose logs --tail=50 backend
docker compose logs --tail=50 frontend
```

- [ ] Explain the incident steps and database-volume precaution in [operations.md](./operations.md).
- [ ] Explain the rollback procedure and why database schema rollback is handled separately.

## 5. Finish

```powershell
docker compose down
```

Do not add `-v` when you want to preserve the local PostgreSQL data volume.
