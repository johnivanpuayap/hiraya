-- Advisory-lock helpers for `npm run sync-lessons` concurrency safety.
-- Two admins running the sync simultaneously will serialize: the second caller
-- waits until the first releases the lock.

-- Lock key: use hashtext of a fixed string, cast to bigint.
-- The lock is session-scoped; when the client connection ends, the lock
-- is released automatically.

CREATE OR REPLACE FUNCTION public.acquire_sync_lessons_lock()
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_lock(hashtext('sync-lessons')::bigint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.release_sync_lessons_lock()
RETURNS void AS $$
BEGIN
  PERFORM pg_advisory_unlock(hashtext('sync-lessons')::bigint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Only the service role should call these
REVOKE EXECUTE ON FUNCTION public.acquire_sync_lessons_lock() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_sync_lessons_lock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_sync_lessons_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_sync_lessons_lock() TO service_role;
