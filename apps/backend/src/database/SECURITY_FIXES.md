# Manual Database Security Actions Required

The following steps must be executed MANUALLY (do not rotate credentials here):

1. Remove insecure password fallbacks (`|| 'postgres'`) in `load-test.ts` and `seed.ts` for production environments.
2. Change `ssl: false` to `ssl: { rejectUnauthorized: true }` or `ssl: true` with proper CA certificates.
3. For cloud DB URLs (Supabase, etc.): set `ssl: { rejectUnauthorized: true, ca: <cert> }` instead of `rejectUnauthorized: false`.
4. Verify `DATABASE_URL` includes `sslmode=require` for production.
5. Ensure DB credentials are set exclusively via environment variables (not fallbacks) and TLS is enforced.
