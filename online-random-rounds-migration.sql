-- BeConanNow: جولات عشوائية متزامنة للغرف الجماعية عبر رابط الدعوة.
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor بعد إعداد اللعب الجماعي والتحديث السابق.
-- لا يحذف بيانات أو جداول موجودة؛ يضيف حقولًا ودوال للجولات فقط.

alter table public.bcn_game_sessions
  add column if not exists round_case_ids uuid[] not null default '{}';
alter table public.bcn_game_sessions
  add column if not exists round_index integer not null default 1;

create or replace function public.bcn_configure_game_rounds(
  p_code text, p_host_token uuid, p_case_ids uuid[]
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_count integer;
begin
  select * into v_session from public.bcn_game_sessions s
   where s.session_code=upper(trim(p_code)) and s.status='active' for update;
  if not found then raise exception 'Room not found or closed'; end if;
  if v_session.host_token <> p_host_token then raise exception 'Only the host can configure the round'; end if;
  v_count := coalesce(array_length(p_case_ids,1),0);
  if v_count < 1 or v_count > 30 then raise exception 'Round must contain 1 to 30 cases'; end if;
  if (select count(distinct x) from unnest(p_case_ids) x) <> v_count then raise exception 'Duplicate cases are not allowed in a round'; end if;
  if exists(select 1 from unnest(p_case_ids) x left join public.cases c on c.id=x where c.id is null or c.status <> 'published') then
    raise exception 'Every round case must be published';
  end if;
  update public.bcn_game_sessions set round_case_ids=p_case_ids,round_index=1,case_id=p_case_ids[1] where id=v_session.id;
  return jsonb_build_object('configured',true,'round_index',1,'round_count',v_count,'case_id',p_case_ids[1]);
end; $$;

create or replace function public.bcn_get_round_status(p_code text, p_player_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_player public.bcn_game_players; v_total integer; v_done integer; v_completed boolean; v_count integer;
begin
  select * into v_session from public.bcn_game_sessions s where s.session_code=upper(trim(p_code)) and s.status='active';
  if not found then raise exception 'Room not found or closed'; end if;
  select * into v_player from public.bcn_game_players p where p.session_id=v_session.id and p.player_token=p_player_token;
  if not found then raise exception 'Player token is not valid for this room'; end if;
  select count(*) into v_total from public.bcn_game_players p where p.session_id=v_session.id;
  if v_session.mode='cooperation' then
    select count(*) into v_done from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is null;
    v_completed := v_done > 0;
  else
    select count(distinct a.player_id) into v_done from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is not null;
    v_completed := v_total > 0 and v_done >= v_total;
  end if;
  v_count := coalesce(array_length(v_session.round_case_ids,1),1);
  return jsonb_build_object('case_id',v_session.case_id,'round_index',greatest(v_session.round_index,1),'round_count',v_count,
    'is_host',(v_session.host_token=p_player_token),'completed',coalesce(v_completed,false),
    'has_next',(greatest(v_session.round_index,1)<v_count),'players_done',v_done,'players_total',v_total);
end; $$;

create or replace function public.bcn_advance_game_round(p_code text, p_host_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_total integer; v_done integer; v_next integer; v_count integer;
begin
  select * into v_session from public.bcn_game_sessions s where s.session_code=upper(trim(p_code)) and s.status='active' for update;
  if not found then raise exception 'Room not found or closed'; end if;
  if v_session.host_token <> p_host_token then raise exception 'Only the host can advance the round'; end if;
  if v_session.mode='cooperation' then
    select count(*) into v_done from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is null;
    if v_done=0 then raise exception 'The shared answer has not been submitted'; end if;
  else
    select count(*) into v_total from public.bcn_game_players p where p.session_id=v_session.id;
    select count(distinct a.player_id) into v_done from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is not null;
    if v_total=0 or v_done<v_total then raise exception 'Wait until every player submits an answer'; end if;
  end if;
  v_count := coalesce(array_length(v_session.round_case_ids,1),1);
  v_next := greatest(v_session.round_index,1)+1;
  if v_next>v_count then raise exception 'This is the last case in the round'; end if;
  delete from public.bcn_game_answers where session_id=v_session.id;
  update public.bcn_game_sessions set case_id=round_case_ids[v_next],round_index=v_next where id=v_session.id;
  return jsonb_build_object('advanced',true,'case_id',v_session.round_case_ids[v_next],'round_index',v_next,'round_count',v_count);
end; $$;

revoke all on function public.bcn_configure_game_rounds(text,uuid,uuid[]) from public;
revoke all on function public.bcn_get_round_status(text,uuid) from public;
revoke all on function public.bcn_advance_game_round(text,uuid) from public;
grant execute on function public.bcn_configure_game_rounds(text,uuid,uuid[]) to anon, authenticated;
grant execute on function public.bcn_get_round_status(text,uuid) to anon, authenticated;
grant execute on function public.bcn_advance_game_round(text,uuid) to anon, authenticated;
notify pgrst, 'reload schema';
