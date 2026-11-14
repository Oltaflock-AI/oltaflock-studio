-- Neeran Studio: a shared team (owner + employees) and client presentations.
-- Additive. Oltaflock Studio's own rows are unaffected: every new policy
-- only matches rows that carry an arch team or are arch renders.

-- ── Teams ──────────────────────────────────────────────────────────────────
create table if not exists public.arch_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.arch_team_members (
  team_id uuid not null references public.arch_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  name text,
  email text,
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index if not exists arch_team_members_user_idx on public.arch_team_members (user_id);

-- Emails allowed to have accounts besides the team domains (the owner adds
-- employees through the neeran-team function, which writes here first).
create table if not exists public.arch_allowed_emails (
  email text primary key,
  added_at timestamptz not null default now()
);
insert into public.arch_allowed_emails (email) values ('preetimutha@gmail.com') on conflict do nothing;

-- Team ids of the signed-in user. Security definer so policies can use it
-- without recursing into arch_team_members' own policy.
create or replace function public.arch_my_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.arch_team_members where user_id = auth.uid()
$$;
revoke all on function public.arch_my_team_ids() from public, anon;
grant execute on function public.arch_my_team_ids() to authenticated, service_role;

alter table public.arch_teams enable row level security;
alter table public.arch_team_members enable row level security;
alter table public.arch_allowed_emails enable row level security; -- no policies: service role only

drop policy if exists arch_teams_read on public.arch_teams;
create policy arch_teams_read on public.arch_teams for select to authenticated
  using (id in (select public.arch_my_team_ids()));

drop policy if exists arch_team_members_read on public.arch_team_members;
create policy arch_team_members_read on public.arch_team_members for select to authenticated
  using (team_id in (select public.arch_my_team_ids()));
-- Membership changes go through the neeran-team edge function (service role).

-- ── Sign-up rule: team domains or an allowed email ─────────────────────────
create or replace function public.enforce_oltaflock_domain()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.email is null or not (
       new.email ~* '@(oltaflock\.ai|promunch\.in|vippysoya\.com)$'
       or exists (select 1 from public.arch_allowed_emails a where a.email = lower(new.email))
     ) then
    raise exception 'Sign-ups are restricted to team email addresses'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

-- ── Projects & drawings: shared within the team ────────────────────────────
alter table public.arch_projects add column if not exists team_id uuid references public.arch_teams (id) on delete set null;
create index if not exists arch_projects_team_idx on public.arch_projects (team_id, updated_at desc);

-- Client presentation: chosen renders, notes and a private share link.
alter table public.arch_projects add column if not exists presentation jsonb not null default '{}'::jsonb;
alter table public.arch_projects add column if not exists share_token uuid;
create unique index if not exists arch_projects_share_token_idx on public.arch_projects (share_token) where share_token is not null;

drop policy if exists arch_projects_own on public.arch_projects;
drop policy if exists arch_projects_access on public.arch_projects;
create policy arch_projects_access on public.arch_projects for all to authenticated
  using (auth.uid() = user_id or team_id in (select public.arch_my_team_ids()))
  with check (auth.uid() = user_id or team_id in (select public.arch_my_team_ids()));

drop policy if exists arch_drawings_own on public.arch_drawings;
drop policy if exists arch_drawings_access on public.arch_drawings;
create policy arch_drawings_access on public.arch_drawings for all to authenticated
  using (exists (
    select 1 from public.arch_projects p
    where p.id = project_id and (p.user_id = auth.uid() or p.team_id in (select public.arch_my_team_ids()))
  ))
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.arch_projects p
      where p.id = project_id and (p.user_id = auth.uid() or p.team_id in (select public.arch_my_team_ids()))
    )
  );

-- ── Renders (generations rows tagged source = 'arch'): teammates can see and
-- delete each other's renders in shared projects. Inserts stay own-only.
create or replace function public.arch_can_see_project(p_project text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.arch_projects p
    where p.id::text = p_project
      and (p.user_id = auth.uid() or p.team_id in (select team_id from public.arch_team_members where user_id = auth.uid()))
  )
$$;
revoke all on function public.arch_can_see_project(text) from public, anon;
grant execute on function public.arch_can_see_project(text) to authenticated, service_role;

drop policy if exists generations_arch_team_read on public.generations;
create policy generations_arch_team_read on public.generations for select to authenticated
  using (model_params->>'source' = 'arch' and public.arch_can_see_project(model_params->>'project_id'));

drop policy if exists generations_arch_team_delete on public.generations;
create policy generations_arch_team_delete on public.generations for delete to authenticated
  using (model_params->>'source' = 'arch' and public.arch_can_see_project(model_params->>'project_id'));

-- ── Saved furniture & materials (elements): shared library ────────────────
alter table public.elements add column if not exists team_id uuid references public.arch_teams (id) on delete set null;
-- Names were unique per user; in a shared library two people may each save
-- "Grey-sofa". Keep the per-user rule (it is what the existing index enforces).

drop policy if exists elements_team_read on public.elements;
create policy elements_team_read on public.elements for select to authenticated
  using (team_id is not null and team_id in (select public.arch_my_team_ids()));
drop policy if exists elements_team_update on public.elements;
create policy elements_team_update on public.elements for update to authenticated
  using (team_id is not null and team_id in (select public.arch_my_team_ids()))
  with check (team_id is not null and team_id in (select public.arch_my_team_ids()));
drop policy if exists elements_team_delete on public.elements;
create policy elements_team_delete on public.elements for delete to authenticated
  using (team_id is not null and team_id in (select public.arch_my_team_ids()));

-- ── Seed: Preeti's team, holding everything she already has ───────────────
do $$
declare
  v_owner uuid;
  v_team uuid;
begin
  select id into v_owner from auth.users where lower(email) = 'preetimutha@gmail.com';
  if v_owner is null then return; end if;

  select id into v_team from public.arch_teams where owner_id = v_owner limit 1;
  if v_team is null then
    insert into public.arch_teams (name, owner_id) values ('Neeran Design Co.', v_owner) returning id into v_team;
  end if;

  insert into public.arch_team_members (team_id, user_id, role, name, email)
  values (v_team, v_owner, 'owner', 'Preeti', 'preetimutha@gmail.com')
  on conflict (team_id, user_id) do update set role = 'owner';

  update public.arch_projects set team_id = v_team where user_id = v_owner and team_id is null;
  update public.elements set team_id = v_team where user_id = v_owner and team_id is null;
end $$;

notify pgrst, 'reload schema';
