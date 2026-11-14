-- Allow one personal address (family account for architecture renders)
-- alongside the team domains. Keep this list to exact addresses.

create or replace function public.enforce_oltaflock_domain()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null or not (
       new.email ~* '@(oltaflock\.ai|promunch\.in|vippysoya\.com)$'
       or lower(new.email) in ('preetimutha@gmail.com')
     ) then
    raise exception 'Sign-ups are restricted to team email addresses'
      using errcode = '22023';
  end if;
  return new;
end;
$$;
