# Deployment — Marketplace (Phase 14)

Target: Vercel (frontend) + Railway (backend) + Supabase (DB) + Railway Redis.

## Env vars (build-time)
- `NEXT_PUBLIC_API_BASE_URL=https://<railway-api-host>/api`
- Set in Vercel project settings (not `.env.local`).
- `.env.local` deleted (was UTF-16 localhost artifact).

## Production smoke
- `npm run build` passes on both apps.
- `/api/health` responds 200 from deployed API.
- Deployed frontend fetches deployed API over HTTPS (proxy/rewrite recommended via `next.config.ts`).

## Migration discipline
- Stop `synchronize` for prod after Phase 2; use generated migrations.
- Migration runner includes `order_number` now (unified).

## Rollback
- Railway deploy rollback to previous image.
- Vercel rollback to previous deployment.
