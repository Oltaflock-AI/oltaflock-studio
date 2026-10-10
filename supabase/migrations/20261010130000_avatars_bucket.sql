-- Profile photos bucket. Earlier deployments created it in the dashboard; a
-- fresh project (PROMUNCH Studio) needs it from a migration. Used when the R2
-- storage Worker is not configured (see src/lib/storage.ts).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for avatars" on storage.objects;
create policy "Public read access for avatars"
on storage.objects for select
using (bucket_id = 'avatars');

-- Each person writes only under their own folder ({user_id}/...). Upserts need insert and update.
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
