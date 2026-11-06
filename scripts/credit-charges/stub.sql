-- Minimal stand-ins for the Supabase objects the credit migration touches, so
-- it can be tested on a throwaway local Postgres (scripts/credit-charges/run.sh).
-- Never run this against the real project.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant select, insert on auth.users to service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  model text not null default 'Test model',
  status text not null default 'queued',
  model_params jsonb,
  created_at timestamptz default now()
);
create table public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null,
  balance numeric not null default 1000,
  total_spent numeric not null default 0,
  total_generations integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table public.credit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  balance text not null,
  credits_used numeric,
  generation_id uuid,
  model text,
  description text,
  raw_response jsonb,
  checked_at timestamptz not null default now()
);
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
-- Supabase's default privileges: new tables and functions in public are granted
-- to anon/authenticated/service_role, so RLS and explicit revokes do the work.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
