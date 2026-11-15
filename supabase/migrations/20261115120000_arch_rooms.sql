-- Neeran Studio: rooms inside a project, each with its material schedule
-- (finalised marbles, veneers, laminates, furniture...) used for the final render.
-- Additive: one new table, nothing existing changes.

create table if not exists public.arch_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.arch_projects (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  kind text not null default 'other',
  -- Which drawing (and which part of it) the room is rendered from.
  drawing_id uuid references public.arch_drawings (id) on delete set null,
  space_name text,
  style_id text not null default 'reference',
  -- [{id, where, name, prompt, catalog:{surface,id}|null, image_urls[], locked, from_ai, why}]
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and pg_column_size(items) < 200000),
  notes text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists arch_rooms_project_idx on public.arch_rooms (project_id, position);

alter table public.arch_rooms enable row level security;

-- Anyone who can see the project (owner or team) can read and edit its rooms.
drop policy if exists arch_rooms_all on public.arch_rooms;
create policy arch_rooms_all on public.arch_rooms for all to authenticated
  using (public.arch_can_see_project(project_id::text))
  with check (public.arch_can_see_project(project_id::text));
