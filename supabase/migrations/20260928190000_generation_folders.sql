-- Library folders: a user's own folders for organising their generations.
-- Each generation sits in at most one folder (generations.folder_id); deleting
-- a folder moves its generations back to "unfiled" instead of deleting them.
-- The existing owner-scoped UPDATE policy on generations already lets a user
-- set folder_id on their own rows.

create table if not exists public.generation_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generation_folders_name_len check (char_length(btrim(name)) between 1 and 60)
);

create unique index if not exists generation_folders_user_name_idx
  on public.generation_folders (user_id, lower(btrim(name)));

alter table public.generation_folders enable row level security;

drop policy if exists generation_folders_select_own on public.generation_folders;
create policy generation_folders_select_own on public.generation_folders
  for select using (auth.uid() = user_id);

drop policy if exists generation_folders_insert_own on public.generation_folders;
create policy generation_folders_insert_own on public.generation_folders
  for insert with check (auth.uid() = user_id);

drop policy if exists generation_folders_update_own on public.generation_folders;
create policy generation_folders_update_own on public.generation_folders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists generation_folders_delete_own on public.generation_folders;
create policy generation_folders_delete_own on public.generation_folders
  for delete using (auth.uid() = user_id);

alter table public.generations
  add column if not exists folder_id uuid references public.generation_folders (id) on delete set null;

create index if not exists generations_user_folder_idx
  on public.generations (user_id, folder_id);

-- Human-readable name for a generation: written by the name-generation edge
-- function from the prompt, editable by the user, used for downloads.
alter table public.generations
  add column if not exists title text;

alter table public.generations
  drop constraint if exists generations_title_len;

alter table public.generations
  add constraint generations_title_len
  check (title is null or char_length(btrim(title)) between 1 and 120);
