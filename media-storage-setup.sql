-- شغّل هذا الملف مرة واحدة في SQL Editor ضمن مشروع BeConanNow الصحيح.
-- تحديث آمن لدعم ملفات الأدلة (صور/صوت/فيديو/PDF)
alter table public.evidence add column if not exists media_url text not null default '';
alter table public.evidence add column if not exists media_type text not null default '';
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-evidence', 'case-evidence', true, 20971520, array['image/*','audio/*','video/mp4','video/webm','application/pdf'])
on conflict (id) do update set public=true, file_size_limit=20971520, allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists bcn_evidence_public_read on storage.objects;
create policy bcn_evidence_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'case-evidence');
drop policy if exists bcn_evidence_admin_insert on storage.objects;
create policy bcn_evidence_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'case-evidence' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists bcn_evidence_admin_update on storage.objects;
create policy bcn_evidence_admin_update on storage.objects for update to authenticated using (bucket_id = 'case-evidence' and exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (bucket_id = 'case-evidence' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists bcn_evidence_admin_delete on storage.objects;
create policy bcn_evidence_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'case-evidence' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
notify pgrst, 'reload schema';
