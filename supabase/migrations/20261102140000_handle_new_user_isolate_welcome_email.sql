-- handle_new_user used to wrap everything in one EXCEPTION block. The welcome
-- email reads vault secret 'supabase_url', which is missing, so every signup
-- silently rolled back its profile and starting credits. Now the account setup
-- runs on its own (a real failure there blocks the signup instead of leaving a
-- half-made account), and only the email is allowed to fail quietly.
-- PROMUNCH Studio accounts (shared project) skip the Oltaflock welcome email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  _name text;
begin
  _name := split_part(new.email, '@', 1);

  insert into public.profiles (user_id, email, display_name, created_at, updated_at)
  values (new.id, new.email, _name, now(), now())
  on conflict (user_id) do nothing;

  insert into public.user_credits (user_id, balance, total_spent, total_generations)
  values (new.id, 1000, 0, 0)
  on conflict (user_id) do nothing;

  insert into public.credit_logs (user_id, balance, credits_used, description, checked_at)
  values (new.id, '1000', 0, 'Initial signup credit grant', now());

  -- Auto-confirm email for @oltaflock.ai domain
  if new.email like '%@oltaflock.ai' then
    update auth.users set email_confirmed_at = now() where id = new.id and email_confirmed_at is null;
  end if;

  if new.email !~* '@(promunch\.in|vippysoya\.com)$' then
    begin
      perform net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/send-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := jsonb_build_object(
          'template', 'welcome',
          'to', new.email,
          'data', jsonb_build_object('name', _name)
        )
      );
    exception when others then
      raise warning 'Welcome email failed: %', sqlerrm;
    end;
  end if;

  return new;
end;
$function$;
