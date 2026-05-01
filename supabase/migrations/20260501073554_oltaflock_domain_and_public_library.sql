-- 1. Enforce @oltaflock.ai email domain on all signups (frontend + magic link + invite)
-- 2. Make prompt library readable by every authenticated user (saves and curated alike).
--    Inserts/updates/deletes still scoped to the owner.

-- ─── Domain enforcement on auth.users ─────────────────────────────────────

create or replace function public.enforce_oltaflock_domain()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null or new.email !~* '@oltaflock\.ai$' then
    raise exception 'Sign-ups are restricted to @oltaflock.ai email addresses'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_oltaflock_domain on auth.users;
create trigger enforce_oltaflock_domain
  before insert on auth.users
  for each row execute function public.enforce_oltaflock_domain();

-- ─── Open up library SELECT to all authenticated users ────────────────────

drop policy if exists "library_select_own_or_curated" on public.prompt_library_items;

create policy "library_select_authenticated"
  on public.prompt_library_items
  for select
  to authenticated
  using (true);

-- INSERT/UPDATE/DELETE policies are unchanged: still owner-scoped, no curated writes.
