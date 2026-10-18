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
