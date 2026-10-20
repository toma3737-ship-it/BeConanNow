-- BeConanNow: إظهار الحل النهائي بعد اكتمال الإجابات، دون منح قراءة مباشرة للحلول.
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor بعد إعداد اللعب الجماعي.
create or replace function public.bcn_get_final_solution(p_code text, p_player_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_session public.bcn_game_sessions; v_player public.bcn_game_players; v_total integer; v_done integer; v_expected text; v_explanation text; v_correct_name text; v_answer_type text;
begin
  select * into v_session from public.bcn_game_sessions s where s.session_code=upper(trim(p_code)) and s.status='active';
  if not found then raise exception 'Room not found or closed'; end if;
  select * into v_player from public.bcn_game_players p where p.session_id=v_session.id and p.player_token=p_player_token;
  if not found then raise exception 'Player token is not valid for this room'; end if;
  select count(*) into v_total from public.bcn_game_players p where p.session_id=v_session.id;
  if v_session.mode='cooperation' then
    select count(*) into v_done from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is null;
  else
    select count(*) into v_done from public.bcn_game_answers a where a.session_id=v_session.id and a.player_id is not null;
  end if;
  if v_total=0 or v_done=0 or (v_session.mode='competition' and v_done<v_total) then return jsonb_build_object('ready',false); end if;
  select coalesce(c.answer_type,'suspect') into v_answer_type from public.cases c where c.id=v_session.case_id;
  select coalesce(cs.expected_answer,''),coalesce(cs.explanation,''),coalesce(s.name,'') into v_expected,v_explanation,v_correct_name
  from public.case_solutions cs left join public.suspects s on s.id=cs.correct_suspect_id where cs.case_id=v_session.case_id;
  if not found then raise exception 'Solution is not configured'; end if;
  return jsonb_build_object('ready',true,'answer_type',v_answer_type,'expected_answer',v_expected,'correct_suspect_name',v_correct_name,'explanation',v_explanation);
end; $$;
revoke all on function public.bcn_get_final_solution(text,uuid) from public;
grant execute on function public.bcn_get_final_solution(text,uuid) to anon, authenticated;
notify pgrst, 'reload schema';
