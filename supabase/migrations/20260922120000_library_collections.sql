-- Library collections: a free-text label grouping a user's saved library items.
-- A collection is just a label on the row (no separate table). The existing
-- owner-scoped UPDATE policy ("library_update_own") already lets a user set it
-- on their own non-curated rows; SELECT/INSERT/DELETE policies are unchanged.

alter table public.prompt_library_items
  add column if not exists collection text;

alter table public.prompt_library_items
  drop constraint if exists prompt_library_collection_len;

alter table public.prompt_library_items
  add constraint prompt_library_collection_len
  check (collection is null or char_length(btrim(collection)) between 1 and 60);

create index if not exists prompt_library_user_collection_idx
  on public.prompt_library_items (user_id, collection)
  where collection is not null;
