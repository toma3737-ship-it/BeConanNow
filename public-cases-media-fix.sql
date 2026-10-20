-- BeConanNow: إصلاح ظهور القضايا المنشورة ورفع الأدلة الإعلامية.
-- شغّل هذا الملف مرة واحدة في SQL Editor داخل مشروع BeConanNow الصحيح.
-- لا يحذف أي قضية أو دليل أو جدول.

-- 1) تأكد من أعمدة مرفقات الأدلة.
alter table public.evidence add column if not exists media_url text not null default '';
alter table public.evidence add column if not exists media_type text not null default '';

-- 2) منح الواجهة العامة حق قراءة القضايا المنشورة ومحتوياتها فقط.
-- تبقى case_solutions خاصة ولا تحصل الواجهة العامة على SELECT عليها.
grant select on table public.cases, public.suspects, public.evidence, public.hints to anon, authenticated;
alter table public.cases enable row level security;
alter table public.suspects enable row level security;
alter table public.evidence enable row level security;
alter table public.hints enable row level security;

drop policy if exists bcn_public_read_published_cases on public.cases;
create policy bcn_public_read_published_cases on public.cases
  for select to anon, authenticated using (status = 'published');

drop policy if exists bcn_public_read_published_suspects on public.suspects;
create policy bcn_public_read_published_suspects on public.suspects
  for select to anon, authenticated using (
    exists (select 1 from public.cases c where c.id = suspects.case_id and c.status = 'published')
  );

drop policy if exists bcn_public_read_published_evidence on public.evidence;
create policy bcn_public_read_published_evidence on public.evidence
  for select to anon, authenticated using (
    exists (select 1 from public.cases c where c.id = evidence.case_id and c.status = 'published')
  );

drop policy if exists bcn_public_read_published_hints on public.hints;
create policy bcn_public_read_published_hints on public.hints
  for select to anon, authenticated using (
    exists (select 1 from public.cases c where c.id = hints.case_id and c.status = 'published')
  );

-- 3) إعداد مخزن الملفات للسماح بصور وصوت وفيديو شائع، حتى 50 ميغابايت.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-evidence', 'case-evidence', true, 52428800,
  array[
    'image/*', 'audio/*', 'video/*', 'application/pdf',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = 52428800,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists bcn_evidence_public_read on storage.objects;
create policy bcn_evidence_public_read on storage.objects
  for select to anon, authenticated using (bucket_id = 'case-evidence');

drop policy if exists bcn_evidence_admin_insert on storage.objects;
create policy bcn_evidence_admin_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'case-evidence' and exists (
      select 1 from public.admin_users a where a.user_id = auth.uid()
    )
  );

drop policy if exists bcn_evidence_admin_update on storage.objects;
create policy bcn_evidence_admin_update on storage.objects
  for update to authenticated using (
    bucket_id = 'case-evidence' and exists (
      select 1 from public.admin_users a where a.user_id = auth.uid()
    )
  ) with check (
    bucket_id = 'case-evidence' and exists (
      select 1 from public.admin_users a where a.user_id = auth.uid()
    )
  );

drop policy if exists bcn_evidence_admin_delete on storage.objects;
create policy bcn_evidence_admin_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'case-evidence' and exists (
      select 1 from public.admin_users a where a.user_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
