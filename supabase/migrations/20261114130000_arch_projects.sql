-- Spaces Studio (architecture render app, separate frontend on this backend).
-- A project is one client/site. Drawings belong to a project and carry the
-- AI reading of the drawing (spaces found, summary). Renders are ordinary
-- `generations` rows tagged with model_params.source = 'arch' and
-- model_params.project_id, so billing, caps and polling work unchanged.

create table if not exists public.arch_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  client text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint arch_projects_name_len check (char_length(btrim(name)) between 1 and 80)
);
create index if not exists arch_projects_user_idx on public.arch_projects (user_id, updated_at desc);

create table if not exists public.arch_drawings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.arch_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  image_url text not null,
  analysis jsonb,
  created_at timestamptz not null default now()
);
create index if not exists arch_drawings_project_idx on public.arch_drawings (project_id, created_at);

alter table public.arch_projects enable row level security;
alter table public.arch_drawings enable row level security;

drop policy if exists arch_projects_own on public.arch_projects;
create policy arch_projects_own on public.arch_projects for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists arch_drawings_own on public.arch_drawings;
create policy arch_drawings_own on public.arch_drawings for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.arch_projects p where p.id = project_id and p.user_id = auth.uid())
  );

create index if not exists generations_arch_project_idx
  on public.generations ((model_params->>'project_id'))
  where model_params->>'source' = 'arch';

notify pgrst, 'reload schema';
