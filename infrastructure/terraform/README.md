# Terraform (AWS) — aspirational, NOT wired to CI

> **Status: aspirational / work-in-progress. Nothing in this repository's CI/CD
> (`.github/`, `scripts/`, `docker-compose.yml`, `Makefile`) references this
> directory, and it is not applied to any AWS account.**

The current deploy targets are:

- **Backend** — Railway
- **Frontend** — Vercel
- **Database** — Supabase (managed Postgres)

This Terraform config (VPC/subnets, RDS Postgres, ElastiCache Redis, ECS Fargate,
ALB, IAM, Secrets Manager) represents a potential future migration away from
Railway/Vercel/Supabase onto self-managed AWS infrastructure. It is **not** the
source of truth for how the app deploys today, so do not assume any of these
resources exist.

If you are restoring/reviewing this as part of that future migration, validate it
against the current application stack before applying:

- App health endpoints and expected env vars (`apps/backend/src`)
- BullMQ/Redis connection options (`getBullMQConnectionOptions` in
  `apps/backend/src/common/config/redis-connection.factory.ts`)
- Whether RDS version, engine, and instance sizing still match
  `apps/backend` dependencies and the `@VersionColumn`/enum usage in migrations
  (`apps/backend/src/database/migrations`)

Delete this directory instead if there is no firm intent to move to AWS — the
config is misleading if left to look like live infrastructure. (IMPLEMENTATION_FIXES.md, Phase 4.3.)