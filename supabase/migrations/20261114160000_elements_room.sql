-- Neeran Studio: group saved furniture/materials (elements) by room.
alter table public.elements add column if not exists room text;
alter table public.elements drop constraint if exists elements_room_len;
alter table public.elements add constraint elements_room_len check (room is null or char_length(room) <= 40);
notify pgrst, 'reload schema';
