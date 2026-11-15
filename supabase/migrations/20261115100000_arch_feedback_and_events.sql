-- Neeran Studio: thumbs up/down on renders, and a light usage log.
-- Additive: two new tables, nothing existing changes.

-- ── Render feedback ────────────────────────────────────────────────────────
-- One vote per person per render. Teammates see each other's votes in shared
-- projects (same rule as renders).
create table if not exists public.arch_render_feedback (
  render_id uuid not null references public.generations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.arch_projects (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  reasons text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (render_id, user_id)
);
create index if not exists arch_render_feedback_project_idx on public.arch_render_feedback (project_id);

alter table public.arch_render_feedback enable row level security;

drop policy if exists arch_render_feedback_read on public.arch_render_feedback;
create policy arch_render_feedback_read on public.arch_render_feedback for select to authenticated
  using (public.arch_can_see_project(project_id::text));

drop policy if exists arch_render_feedback_write on public.arch_render_feedback;
create policy arch_render_feedback_write on public.arch_render_feedback for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.arch_can_see_project(project_id::text));

-- ── Usage events ───────────────────────────────────────────────────────────
-- Insert-only from the app; read with the service role (SQL) to see where
-- people get stuck. No select policy on purpose.
create table if not exists public.arch_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event text not null check (length(event) <= 60),
  project_id uuid,
  props jsonb not null default '{}'::jsonb,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists arch_events_time_idx on public.arch_events (created_at desc);
create index if not exists arch_events_user_idx on public.arch_events (user_id, created_at desc);

alter table public.arch_events enable row level security;

drop policy if exists arch_events_insert on public.arch_events;
create policy arch_events_insert on public.arch_events for insert to authenticated
  with check (auth.uid() = user_id and pg_column_size(props) < 4000);
