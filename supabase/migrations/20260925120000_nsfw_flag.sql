-- NSFW flag: lets a user mark their own outputs as sensitive so every place
-- that previews them (history, library, presets) blurs them until revealed.
-- Existing owner-scoped UPDATE policies already cover both tables.

alter table public.generations
  add column if not exists is_nsfw boolean not null default false;

alter table public.prompt_library_items
  add column if not exists is_nsfw boolean not null default false;
