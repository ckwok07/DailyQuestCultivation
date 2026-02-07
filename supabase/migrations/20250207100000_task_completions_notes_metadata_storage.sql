-- Add notes and metadata to task_completions for history (log text, song + reaction, photo url)
alter table public.task_completions
  add column if not exists notes text,
  add column if not exists metadata jsonb default '{}';

-- Storage bucket for document photos (user-scoped paths: user_id/date/filename)
insert into storage.buckets (id, name, public)
values ('document-photos', 'document-photos', false)
on conflict (id) do nothing;

-- RLS: users can only read/insert/update/delete their own folder (user_id/...)
create policy "document_photos_select_own"
  on storage.objects for select
  using (bucket_id = 'document-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "document_photos_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'document-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "document_photos_update_own"
  on storage.objects for update
  using (bucket_id = 'document-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "document_photos_delete_own"
  on storage.objects for delete
  using (bucket_id = 'document-photos' and (storage.foldername(name))[1] = auth.uid()::text);
