-- PROMUNCH Studio: one team, invite only.
--
-- 1. Replace the old email-domain rule with invite-only sign-up: a new account
--    is allowed when it was invited (Supabase sets invited_at) or when it is
--    the very first account, who becomes the first admin.
-- 2. Team roles: admin (can invite and remove people) and member.
-- 3. The team shares its work: everyone can see everyone's generations,
--    folders and profiles, and edit the shared brand assets (Elements).
-- 4. Reviews: anyone on the team can approve a result or ask for changes.

-- ─── 1. Invite-only sign-up ────────────────────────────────────────────────

drop trigger if exists enforce_oltaflock_domain on auth.users;
drop function if exists public.enforce_oltaflock_domain();

create table if not exists public.team_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

create or replace function public.enforce_invite_only()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.invited_at is null and exists (select 1 from public.team_members) then
    raise exception 'PROMUNCH Studio is invite only. Ask your admin for an invite.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_invite_only on auth.users;
create trigger enforce_invite_only
  before insert on auth.users
  for each row execute function public.enforce_invite_only();

-- Every new account joins the team; the first one is the admin.
create or replace function public.join_team()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.team_members (user_id, role, invited_by)
  values (
    new.id,
    case when exists (select 1 from public.team_members) then 'member' else 'admin' end,
    nullif(new.raw_user_meta_data ->> 'invited_by', '')::uuid
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists join_team on auth.users;
create trigger join_team
  after insert on auth.users
  for each row execute function public.join_team();

-- Accounts that existed before this migration join the team too.
insert into public.team_members (user_id, role)
select u.id, 'member' from auth.users u
on conflict (user_id) do nothing;
update public.team_members set role = 'admin'
where user_id = (select user_id from public.team_members order by created_at limit 1)
  and not exists (select 1 from public.team_members where role = 'admin');

create or replace function public.is_team_member(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.team_members where user_id = uid);
$$;

create or replace function public.is_team_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.team_members where user_id = uid and role = 'admin');
$$;

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select to authenticated using (public.is_team_member());

drop policy if exists team_members_admin_update on public.team_members;
create policy team_members_admin_update on public.team_members
  for update to authenticated using (public.is_team_admin()) with check (public.is_team_admin());

-- Removing people goes through the team-admin function (it deletes the account).

-- ─── 3. Shared team visibility ────────────────────────────────────────────

drop policy if exists generations_team_select on public.generations;
create policy generations_team_select on public.generations
  for select to authenticated using (public.is_team_member());

drop policy if exists generation_folders_team_select on public.generation_folders;
create policy generation_folders_team_select on public.generation_folders
  for select to authenticated using (public.is_team_member());

drop policy if exists profiles_team_select on public.profiles;
create policy profiles_team_select on public.profiles
  for select to authenticated using (public.is_team_member());

-- Pack shots and the logo belong to the whole team.
drop policy if exists elements_team_select on public.elements;
create policy elements_team_select on public.elements
  for select to authenticated using (public.is_team_member());

drop policy if exists elements_team_update on public.elements;
create policy elements_team_update on public.elements
  for update to authenticated using (public.is_team_member()) with check (public.is_team_member());

drop policy if exists elements_team_delete on public.elements;
create policy elements_team_delete on public.elements
  for delete to authenticated using (public.is_team_member());

-- One team, one @Name: two people can't both create @MasalaMania.
drop index if exists public.elements_user_name_idx;
create unique index if not exists elements_team_name_idx on public.elements (lower(name));

-- ─── 4. Reviews ───────────────────────────────────────────────────────────

create table if not exists public.brand_reviews (
  generation_id uuid primary key references public.generations (id) on delete cascade,
  status text not null check (status in ('approved', 'changes')),
  note text check (note is null or char_length(note) <= 1000),
  reviewer_id uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.brand_reviews enable row level security;

drop policy if exists brand_reviews_team_all on public.brand_reviews;
create policy brand_reviews_team_all on public.brand_reviews
  for all to authenticated
  using (public.is_team_member())
  with check (public.is_team_member() and reviewer_id = auth.uid());
