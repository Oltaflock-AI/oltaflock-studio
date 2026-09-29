-- Elements: a user's reusable, named references (a character, a product, a logo,
-- a place…). Each has 1–8 reference images and an optional description. In a
-- prompt, "@Name" attaches the images and adds the description at generate time.

create table if not exists public.elements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null default 'other',
  description text,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint elements_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint elements_name_token check (name !~ '[@\s]'),
  constraint elements_kind check (kind in ('character', 'product', 'logo', 'place', 'style', 'other')),
  constraint elements_description_len check (description is null or char_length(description) <= 600),
  constraint elements_images_count check (cardinality(image_urls) between 1 and 8)
);

create unique index if not exists elements_user_name_idx on public.elements (user_id, lower(name));

alter table public.elements enable row level security;

drop policy if exists elements_select_own on public.elements;
create policy elements_select_own on public.elements for select using (auth.uid() = user_id);

drop policy if exists elements_insert_own on public.elements;
create policy elements_insert_own on public.elements for insert with check (auth.uid() = user_id);

drop policy if exists elements_update_own on public.elements;
create policy elements_update_own on public.elements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists elements_delete_own on public.elements;
create policy elements_delete_own on public.elements for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
