-- =====================================================================
--  PROPOSAL — Scheduled Surprise Countdown "hard lock" (Tier 2)
--  NOT a migration. Nothing applies this automatically. The project owner
--  reviews and runs it manually in the Supabase SQL editor.
--
--  Goal: before the unlock instant, an anonymous visitor receives ONLY
--  countdown-safe fields — no letters, photo/audio URLs or scene content.
--  Decision uses DATABASE time (now()), never the browser clock.
--
--  ROLLOUT ORDER (do not reorder):
--   1) Deploy the frontend from this PR. It calls get_surprise_by_slug_v2
--      first and falls back to get_surprise_by_slug on 404, so nothing
--      breaks before this SQL exists. middleware.js and api/og.tsx do the
--      same (they only read config.name, which the redacted payload keeps).
--   2) STEP 0 below: verify the current RPC's definition and return shape.
--   3) Apply STEP 1 (create v2) and STEP 2 (grants). Test STEP 4.
--   4) ONLY THEN apply STEP 3 (revoke v1 from anon/authenticated).
--      Until step 3, anyone holding the public anon key can still call the
--      OLD RPC directly and read the full config — the lock is "soft".
--      Do not run step 3 before the frontend from step 1 is live, or
--      share pages, link previews (middleware.js) and OG images (api/og.tsx)
--      will break.
-- =====================================================================


-- ---------------------------------------------------------------------
-- STEP 0 — VERIFY (read-only). The existing RPC is NOT in the repo.
-- Inspect its definition and return type before applying anything:
-- ---------------------------------------------------------------------
select pg_get_functiondef('public.get_surprise_by_slug(text)'::regprocedure);
select pg_get_function_result('public.get_surprise_by_slug(text)'::regprocedure) as returns;
-- VERIFY return type/shape before applying:
--  * The frontend reads `row.config` from either a single row object or a
--    one-element array. STEP 1 assumes get_surprise_by_slug returns a row
--    (or SETOF rows / a table) that has a `config jsonb` column, and calls
--    it via `select to_jsonb(r) from public.get_surprise_by_slug(p_slug) r`.
--  * If it instead RETURNS jsonb, replace the `v_row` lookup in STEP 1 with:
--        v_row := public.get_surprise_by_slug(p_slug);
--    and keep the rest unchanged.
--  * If get_surprise_by_slug is SECURITY INVOKER and relies on RLS for
--    anon (prosecdef = false below), a SECURITY DEFINER wrapper would run
--    it as the owner and could BYPASS that RLS. In that case copy v1's
--    WHERE filters (e.g. is_paid / published) into STEP 1 explicitly.
--        select prosecdef from pg_proc where oid = 'public.get_surprise_by_slug(text)'::regprocedure;
--  * Wrapping (instead of re-querying `surprises`) means the existing
--    function's security/RLS semantics (e.g. published/paid checks) are
--    inherited unchanged.


-- ---------------------------------------------------------------------
-- STEP 1 — Create get_surprise_by_slug_v2 (additive; v1 untouched)
-- ---------------------------------------------------------------------
create or replace function public.get_surprise_by_slug_v2(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row       jsonb;
  v_config    jsonb;
  v_countdown jsonb;
  v_unlock    timestamptz;
  v_enabled   boolean;
begin
  if p_slug is null or p_slug !~ '^[A-Za-z0-9_-]{1,120}$' then
    return null;
  end if;

  -- Inherit the existing function's semantics. See STEP 0 if it returns jsonb.
  select to_jsonb(r) into v_row
  from public.get_surprise_by_slug(p_slug) r
  limit 1;

  if v_row is null or v_row->'config' is null or jsonb_typeof(v_row->'config') <> 'object' then
    return null;
  end if;

  v_config    := v_row->'config';
  v_countdown := v_config->'countdown';
  v_enabled   := coalesce((v_countdown->>'enabled')::boolean, false);

  begin
    v_unlock := (v_countdown->>'unlockAtUtc')::timestamptz;
  exception when others then
    v_unlock := null;
  end;

  if v_enabled and v_unlock is not null and now() < v_unlock then
    -- REDACTED payload: only countdown-safe, display-only fields.
    return jsonb_build_object(
      'locked', true,
      'server_now', to_jsonb(now()),
      'config', jsonb_strip_nulls(jsonb_build_object(
        'name',         v_config->'name',
        '_version',     v_config->'_version',
        'occasionId',   v_config->'occasionId',
        'occasionType', v_config->'occasionType',
        'themeId',      v_config->'themeId',
        'themePreset',  v_config->'themePreset',
        'countdown', jsonb_strip_nulls(jsonb_build_object(
          'enabled',          v_countdown->'enabled',
          'unlockAtUtc',      v_countdown->'unlockAtUtc',
          'timezone',         v_countdown->'timezone',
          'heading',          v_countdown->'heading',
          'recipientName',    v_countdown->'recipientName',
          'message',          v_countdown->'message',
          'labels',           v_countdown->'labels',
          'waitingLine',      v_countdown->'waitingLine',
          'footer',           v_countdown->'footer',
          'showTeaserButton', v_countdown->'showTeaserButton',
          'teaserLabel',      v_countdown->'teaserLabel',
          'teaserReaction',   v_countdown->'teaserReaction',
          'soundEnabled',     v_countdown->'soundEnabled',
          'afterUnlock',      v_countdown->'afterUnlock',
          'openButtonLabel',  v_countdown->'openButtonLabel',
          'style',            v_countdown->'style'
        ))
      ))
    );
  end if;

  -- Unlocked (or no countdown): the normal payload plus lock metadata.
  return jsonb_build_object(
    'locked', false,
    'server_now', to_jsonb(now()),
    'config', v_config
  );
end;
$$;

comment on function public.get_surprise_by_slug_v2(text) is
  'Countdown hard lock: redacts surprise content until config.countdown.unlockAtUtc (DB time). Wraps get_surprise_by_slug.';


-- ---------------------------------------------------------------------
-- STEP 2 — Grants for v2
-- ---------------------------------------------------------------------
revoke all on function public.get_surprise_by_slug_v2(text) from public;
grant execute on function public.get_surprise_by_slug_v2(text) to anon, authenticated;
-- NOTE: v2 is SECURITY DEFINER and calls v1 as the function owner, so v2
-- keeps working after STEP 3 revokes v1 from anon/authenticated.


-- ---------------------------------------------------------------------
-- STEP 3 — ONLY AFTER the new frontend is live and STEP 4 passes:
-- close the bypass (otherwise the old RPC still leaks everything).
-- ---------------------------------------------------------------------
-- revoke execute on function public.get_surprise_by_slug(text) from anon, authenticated, public;


-- ---------------------------------------------------------------------
-- STEP 4 — Tests (replace 'your-slug')
-- ---------------------------------------------------------------------
-- set role anon;
-- select public.get_surprise_by_slug_v2('your-slug');       -- locked:true + redacted while scheduled in the future
-- select public.get_surprise_by_slug('your-slug');          -- after STEP 3: permission denied
-- reset role;


-- ---------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------
-- grant execute on function public.get_surprise_by_slug(text) to anon, authenticated;  -- undo STEP 3
-- drop function if exists public.get_surprise_by_slug_v2(text);                       -- frontend falls back to v1 automatically
