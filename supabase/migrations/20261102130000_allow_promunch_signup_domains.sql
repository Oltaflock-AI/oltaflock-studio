-- PROMUNCH Studio shares this Supabase project. Let its team domains create
-- accounts alongside @oltaflock.ai. Oltaflock Studio's own sign-up form still
-- limits itself to @oltaflock.ai.

create or replace function public.enforce_oltaflock_domain()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null or new.email !~* '@(oltaflock\.ai|promunch\.in|vippysoya\.com)$' then
    raise exception 'Sign-ups are restricted to team email addresses'
      using errcode = '22023';
  end if;
  return new;
end;
$$;
