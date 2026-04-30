-- Sync-lessons advisory lock — moved to client side.
--
-- Background:
-- The previous version of this migration defined two RPC helpers,
-- public.acquire_sync_lessons_lock() and public.release_sync_lessons_lock(),
-- which wrapped pg_advisory_lock / pg_advisory_unlock. The sync script called
-- them through the supabase-js admin client, which talks to the database via
-- PostgREST + PgBouncer (transaction-pooling mode). pg_advisory_lock is
-- session-scoped, so the lock is bound to whatever pooled backend handles the
-- acquire RPC. The next RPC (any data write, the unlock RPC, anything) may
-- land on a different backend, which means the original lock is never seen
-- again — it leaks until that backend is recycled, and the unlock call is a
-- no-op. The serialization guarantee was effectively broken.
--
-- Fix: hold the lock client-side. `scripts/sync-lessons.ts` now opens a
-- direct `pg.Client` connection using SUPABASE_DB_URL (session-mode, port
-- 5432, same connection style as `scripts/migrate.ts`), runs
-- `pg_advisory_lock(hashtext('sync-lessons')::bigint)` on that connection,
-- performs the sync via the supabase-js admin client, and unlocks +
-- disconnects in a finally block. Because the lock and unlock run on the
-- same physical session, this works correctly.
--
-- This migration drops the obsolete RPC helpers if they exist. It is kept in
-- the migrations table so existing deployments that already applied the
-- previous version of this file pick up the cleanup, and so the migration
-- ordering is preserved for fresh deployments.

DROP FUNCTION IF EXISTS public.acquire_sync_lessons_lock();
DROP FUNCTION IF EXISTS public.release_sync_lessons_lock();
