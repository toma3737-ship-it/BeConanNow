-- BeConanNow: إضافة اللعب الجماعي دون حذف أو تعديل الجداول الحالية.
-- شغّل هذا الملف مرة واحدة في SQL Editor داخل مشروع Supabase الخاص بـ BeConanNow.

create table if not exists public.bcn_game_sessions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  session_code text not null unique,
  mode text not null check (mode in ('cooperation','competition')),
  host_token uuid not null,
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.bcn_game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bcn_game_sessions(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 32),
  player_token uuid not null,
  joined_at timestamptz not null default now(),
  unique (session_id, player_token)
);

create table if not exists public.bcn_game_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.bcn_game_sessions(id) on delete cascade,
  player_id uuid references public.bcn_game_players(id) on delete cascade,
  suspect_id uuid not null references public.suspects(id),
  reasoning text not null,
  is_correct boolean not null,
  explanation text not null default '',
  submitted_at timestamptz not null default now()
);

create unique index if not exists bcn_game_one_answer_per_player
  on public.bcn_game_answers(session_id, player_id) where player_id is not null;
create unique index if not exists bcn_game_one_shared_answer
  on public.bcn_game_answers(session_id) where player_id is null;
create index if not exists bcn_game_players_session_idx on public.bcn_game_players(session_id);

alter table public.bcn_game_sessions enable row level security;
alter table public.bcn_game_players enable row level security;
alter table public.bcn_game_answers enable row level security;

-- لا تمنح الواجهة وصولًا مباشرًا إلى الجداول الجديدة؛ التفاعل عبر الدوال أدناه فقط.
revoke all on table public.bcn_game_sessions from anon, authenticated;
revoke all on table public.bcn_game_players from anon, authenticated;
revoke all on table public.bcn_game_answers from anon, authenticated;

create or replace function public.bcn_create_game_session(
  p_case_id uuid, p_mode text, p_player_name text, p_player_token uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_player public.bcn_game_players; v_code text;
begin
  if p_mode not in ('cooperation','competition') then raise exception 'Invalid game mode'; end if;
  if nullif(trim(p_player_name),'') is null or char_length(trim(p_player_name)) > 32 then raise exception 'Player name must be 1 to 32 characters'; end if;
  if not exists (select 1 from public.cases c where c.id=p_case_id and c.status='published') then raise exception 'Case is not published'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
    exit when not exists(select 1 from public.bcn_game_sessions s where s.session_code=v_code);
  end loop;
  insert into public.bcn_game_sessions(case_id,session_code,mode,host_token) values(p_case_id,v_code,p_mode,p_player_token) returning * into v_session;
  insert into public.bcn_game_players(session_id,display_name,player_token) values(v_session.id,trim(p_player_name),p_player_token) returning * into v_player;
  return jsonb_build_object('session_id',v_session.id,'session_code',v_session.session_code,'case_id',v_session.case_id,'mode',v_session.mode,'player_id',v_player.id);
end; $$;

create or replace function public.bcn_join_game_session(
  p_code text, p_player_name text, p_player_token uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_player public.bcn_game_players;
begin
  if nullif(trim(p_player_name),'') is null or char_length(trim(p_player_name)) > 32 then raise exception 'Player name must be 1 to 32 characters'; end if;
  select * into v_session from public.bcn_game_sessions s where s.session_code=upper(trim(p_code)) and s.status='active';
  if not found then raise exception 'Room not found or closed'; end if;
  if (select count(*) from public.bcn_game_players p where p.session_id=v_session.id) >= 12 then raise exception 'Room is full'; end if;
  insert into public.bcn_game_players(session_id,display_name,player_token) values(v_session.id,trim(p_player_name),p_player_token) returning * into v_player;
  return jsonb_build_object('session_id',v_session.id,'session_code',v_session.session_code,'case_id',v_session.case_id,'mode',v_session.mode,'player_id',v_player.id);
end; $$;

create or replace function public.bcn_get_game_session(p_code text, p_player_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_player public.bcn_game_players; v_my_answer public.bcn_game_answers; v_shared public.bcn_game_answers; v_players jsonb; v_my_result jsonb; v_shared_result jsonb;
begin
  select * into v_session from public.bcn_game_sessions s where s.session_code=upper(trim(p_code)) and s.status='active';
  if not found then raise exception 'Room not found or closed'; end if;
  select * into v_player from public.bcn_game_players p where p.session_id=v_session.id and p.player_token=p_player_token;
  if not found then raise exception 'Player token is not valid for this room'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('display_name',p.display_name,'is_host',(p.player_token=v_session.host_token),'has_submitted',exists(select 1 from public.bcn_game_answers a where a.session_id=v_session.id and ((v_session.mode='cooperation' and a.player_id is null) or a.player_id=p.id))) order by p.joined_at),'[]'::jsonb)
  into v_players from public.bcn_game_players p where p.session_id=v_session.id;
  if v_session.mode='competition' then
    select * into v_my_answer from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id=v_player.id;
    if found then v_my_result:=jsonb_build_object('correct',v_my_answer.is_correct,'explanation',case when v_my_answer.is_correct then v_my_answer.explanation else '' end); end if;
  else
    select * into v_shared from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is null;
    if found then v_shared_result:=jsonb_build_object('correct',v_shared.is_correct,'explanation',case when v_shared.is_correct then v_shared.explanation else '' end); end if;
  end if;
  return jsonb_build_object('session_id',v_session.id,'session_code',v_session.session_code,'case_id',v_session.case_id,'mode',v_session.mode,'players',v_players,'my_has_submitted',case when v_session.mode='cooperation' then v_shared.id is not null else v_my_answer.id is not null end,'my_result',v_my_result,'shared_result',v_shared_result);
end; $$;

create or replace function public.bcn_submit_game_answer(
  p_code text, p_player_token uuid, p_suspect_id uuid, p_reasoning text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_player public.bcn_game_players; v_correct_id uuid; v_explanation text; v_is_correct boolean;
begin
  if char_length(trim(coalesce(p_reasoning,''))) < 8 then raise exception 'Reasoning must contain at least 8 characters'; end if;
  select * into v_session from public.bcn_game_sessions s where s.session_code=upper(trim(p_code)) and s.status='active';
  if not found then raise exception 'Room not found or closed'; end if;
  select * into v_player from public.bcn_game_players p where p.session_id=v_session.id and p.player_token=p_player_token;
  if not found then raise exception 'Player token is not valid for this room'; end if;
  if not exists(select 1 from public.suspects s where s.id=p_suspect_id and s.case_id=v_session.case_id) then raise exception 'Suspect does not belong to this case'; end if;
  if v_session.mode='competition' and exists(select 1 from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id=v_player.id) then raise exception 'You have already submitted an answer'; end if;
  if v_session.mode='cooperation' and exists(select 1 from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is null) then raise exception 'The shared answer has already been submitted'; end if;
  select cs.correct_suspect_id,cs.explanation into v_correct_id,v_explanation from public.case_solutions cs where cs.case_id=v_session.case_id;
  if v_correct_id is null then raise exception 'Solution is not configured'; end if;
  v_is_correct := p_suspect_id=v_correct_id;
  insert into public.bcn_game_answers(session_id,player_id,suspect_id,reasoning,is_correct,explanation)
  values(v_session.id,case when v_session.mode='cooperation' then null else v_player.id end,p_suspect_id,trim(p_reasoning),v_is_correct,case when v_is_correct then coalesce(v_explanation,'') else '' end);
  return jsonb_build_object('correct',v_is_correct,'explanation',case when v_is_correct then coalesce(v_explanation,'') else '' end);
end; $$;

revoke all on function public.bcn_create_game_session(uuid,text,text,uuid) from public;
revoke all on function public.bcn_join_game_session(text,text,uuid) from public;
revoke all on function public.bcn_get_game_session(text,uuid) from public;
revoke all on function public.bcn_submit_game_answer(text,uuid,uuid,text) from public;
grant execute on function public.bcn_create_game_session(uuid,text,text,uuid) to anon, authenticated;
grant execute on function public.bcn_join_game_session(text,text,uuid) to anon, authenticated;
grant execute on function public.bcn_get_game_session(text,uuid) to anon, authenticated;
grant execute on function public.bcn_submit_game_answer(text,uuid,uuid,text) to anon, authenticated;

notify pgrst, 'reload schema';
