-- شغّل هذا الملف في SQL Editor داخل مشروع BeConanNow.
-- يضيف الحقول التي تحتاجها الواجهة إلى الجداول الموجودة، دون حذف أي بيانات.
alter table public.cases
  add column if not exists category text not null default 'لغز مغلق',
  add column if not exists briefing text not null default '',
  add column if not exists victim text not null default '',
  add column if not exists timeline text not null default '',
  add column if not exists visual text not null default 'visual-night';

alter table public.suspects
  add column if not exists role text not null default '';

alter table public.evidence
  add column if not exists evidence_number text not null default '',
  add column if not exists sort_order integer not null default 0;

-- تأكد من أن الحلول لا تُقرأ مباشرة من الواجهة العامة.
alter table public.case_solutions enable row level security;

-- التحقق من الإجابة وكشف تفسير الحل بعد تسليم إجابة لقضية منشورة.
-- الواجهة لا تحصل على صلاحية SELECT مباشرة على case_solutions.
create or replace function public.submit_case_answer(
  p_case_id uuid,
  p_suspect_id uuid
)
returns table (
  correct boolean,
  correct_suspect_name text,
  explanation text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_correct_id uuid;
  v_correct_name text;
  v_explanation text;
begin
  select c.status into v_status
  from public.cases c
  where c.id = p_case_id;

  if v_status is distinct from 'published' then
    raise exception 'Case is not published';
  end if;

  if not exists (
    select 1 from public.suspects s
    where s.id = p_suspect_id and s.case_id = p_case_id
  ) then
    raise exception 'Suspect does not belong to this case';
  end if;

  select cs.correct_suspect_id, cs.explanation
  into v_correct_id, v_explanation
  from public.case_solutions cs
  where cs.case_id = p_case_id;

  if v_correct_id is null then
    raise exception 'Solution is not configured';
  end if;

  select s.name into v_correct_name
  from public.suspects s
  where s.id = v_correct_id and s.case_id = p_case_id;

  -- لا تكشف اسم المشتبه الصحيح أو التفسير عند الإجابة الخاطئة.
  return query
  select
    (p_suspect_id = v_correct_id),
    case when p_suspect_id = v_correct_id then coalesce(v_correct_name, '') else '' end,
    case when p_suspect_id = v_correct_id then coalesce(v_explanation, '') else '' end;
end;
$$;

revoke all on function public.submit_case_answer(uuid, uuid) from public;
grant execute on function public.submit_case_answer(uuid, uuid) to anon, authenticated;


-- صلاحيات إدارة القضايا: هذه السياسات تسمح للحسابات الموجودة في admin_users
-- بإنشاء القضايا وتعديلها وحذفها وإدارة عناصرها التابعة.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists bcn_admin_manage_cases on public.cases;
create policy bcn_admin_manage_cases on public.cases
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists bcn_admin_manage_suspects on public.suspects;
create policy bcn_admin_manage_suspects on public.suspects
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists bcn_admin_manage_evidence on public.evidence;
create policy bcn_admin_manage_evidence on public.evidence
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists bcn_admin_manage_hints on public.hints;
create policy bcn_admin_manage_hints on public.hints
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

drop policy if exists bcn_admin_manage_case_solutions on public.case_solutions;
create policy bcn_admin_manage_case_solutions on public.case_solutions
for all to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

-- حدّث مخبأ مخطط PostgREST حتى تظهر الدالة للواجهة مباشرة.
notify pgrst, 'reload schema';


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
