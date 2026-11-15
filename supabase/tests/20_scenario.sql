\set ON_ERROR_STOP 1
-- utenti
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-00000000000a','owner@bar'),
 ('00000000-0000-0000-0000-0000000000b1','mario@x'),
 ('00000000-0000-0000-0000-0000000000b2','gigi@x'),
 ('00000000-0000-0000-0000-0000000000b3','teo@x'),
 ('00000000-0000-0000-0000-0000000000c1','barista@bar');
insert into staff values ('00000000-0000-0000-0000-00000000000a','owner'), ('00000000-0000-0000-0000-0000000000c1','barista');

create or replace function as_user(u text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u, false); end $$;
grant execute on function as_user(text) to authenticated;

create or replace function expect_error(q text, msg text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm not like '%'||msg||'%' then raise exception 'Errore inatteso per %: %', q, sqlerrm; end if;
    raise notice 'OK errore atteso: %', sqlerrm; return;
  end;
  raise exception 'Mi aspettavo un errore per: %', q;
end $$;
grant execute on function expect_error(text,text) to authenticated;

set role authenticated;

-- iscrizione
select as_user('00000000-0000-0000-0000-0000000000b1');
insert into profiles (id, nickname, type_ids, adult_confirmed) values (auth.uid(), 'Mario', '{1,4}', true);
select expect_error($$update profiles set xp = 9999 where id = auth.uid()$$, 'permission denied');
select expect_error($$update profiles set status = 'approved' where id = auth.uid()$$, 'permission denied');
select expect_error($$select do_checkin('x')$$, 'in attesa');
select expect_error($$select add_points(auth.uid(),'manual',10,0,0)$$, 'permission denied');

select as_user('00000000-0000-0000-0000-0000000000b2');
insert into profiles (id, nickname, type_ids, adult_confirmed) values (auth.uid(), 'Gigi', '{2}', true);
select as_user('00000000-0000-0000-0000-0000000000b3');
insert into profiles (id, nickname, type_ids, adult_confirmed, birth_day, birth_month)
  values (auth.uid(), 'Teo', '{3}', true, extract(day from current_date)::int, extract(month from current_date)::int);
select expect_error($$select use_invite((select invite_code from profiles where nickname = 'Teo'))$$, 'non valido');
select expect_error($$select staff_checkin_code()$$, 'Solo il personale');
-- Teo non vede ancora le schede degli altri (in attesa)
select case when (select count(*) from profiles) = 1 then 'OK solo la propria scheda' else 'FAIL visibilita' end;

-- approvazione
select as_user('00000000-0000-0000-0000-00000000000a');
select staff_review_profile(id, true) from profiles;
create temp table code as select staff_checkin_code() c;
grant select on code to authenticated;

-- check-in
select as_user('00000000-0000-0000-0000-0000000000b1');
select do_checkin((select c from code));
select expect_error($$select do_checkin((select c from code))$$, 'già fatto');
select expect_error($$select do_checkin('C.1.abcdef')$$, 'QR scaduto');
select as_user('00000000-0000-0000-0000-0000000000b2');
select do_checkin((select c from code));

-- catture
select as_user('00000000-0000-0000-0000-0000000000b2');
create temp table gigi_code as select my_capture_code() c;
grant select on gigi_code to authenticated;
select as_user('00000000-0000-0000-0000-0000000000b3');
select expect_error($$select do_capture((select c from gigi_code))$$, 'check-in');
select as_user('00000000-0000-0000-0000-0000000000b1');
select do_capture((select c from gigi_code));
select do_capture((select c from gigi_code)) ->> 'new' as seconda_cattura_nuova;
select expect_error($$select do_capture(replace((select c from gigi_code), right((select c from gigi_code),4), '0000'))$$, 'scaduto');

select nickname, xp, tokens, level from profiles order by nickname;
select kind, xp, tokens, season_points from point_events where profile_id = auth.uid() order by id;
select b.code from profile_badges pb join badges b on b.id = pb.badge_id where pb.profile_id = auth.uid();

-- equipaggiare oggetto non sbloccato
select expect_error($$update profiles set sprite = '{"equipped":{"cappello":12}}' where id = auth.uid()$$, 'non ancora sbloccato');
update profiles set sprite = '{"equipped":{"cornice":1}}' where id = auth.uid();
select 'OK cornice indossata';

-- personaggio: pezzi base liberi, validati
update profiles set sprite = jsonb_build_object('base', jsonb_build_object(
  'capelli', (select id from sprite_parts where kind='capelli' limit 1),
  'pelle',   (select id from sprite_parts where kind='pelle' limit 1)), 'equipped', '{"cornice":1}'::jsonb) where id = auth.uid();
select 'OK personaggio cambiato';
select expect_error($$update profiles set sprite = jsonb_build_object('base', jsonb_build_object('capelli', (select id from sprite_parts where kind='pelle' limit 1))) where id = auth.uid()$$, 'non valido');

-- il barista non tocca punti e prezzi
select as_user('00000000-0000-0000-0000-0000000000c1');
select expect_error($$select owner_award_points('00000000-0000-0000-0000-0000000000b1', 10, 0, 0, 'x')$$, 'Solo il proprietario');
update rewards set cost = 1;
select case when (select min(cost) from rewards) = 15 then 'OK barista non cambia i prezzi' else 'FAIL prezzi' end;
update settings set checkin_xp = 999;
select case when (select checkin_xp from settings) = 20 then 'OK barista non cambia i punti' else 'FAIL punti' end;
insert into events (kind, title, starts_at) values ('festa', 'Festa del barista', now());
select 'OK il barista crea eventi';

-- punti dal proprietario + annullo
select as_user('00000000-0000-0000-0000-00000000000a');
select owner_award_points('00000000-0000-0000-0000-0000000000b1', 300, 30, 50, 'Serata speciale');
select nickname, xp, tokens, level from profiles where nickname='Mario';
select level, rarity_for_level(level) from profiles where nickname='Mario';

-- premio
select as_user('00000000-0000-0000-0000-0000000000b1');
create temp table rd as select start_redemption((select id from rewards where name='Caffè')) j;
grant select on rd to authenticated;
select as_user('00000000-0000-0000-0000-0000000000b2');
select expect_error($$select staff_validate_redemption((select j->>'code' from rd))$$, 'Solo il personale');
select as_user('00000000-0000-0000-0000-00000000000a');
select staff_validate_redemption((select j->>'code' from rd));
select expect_error($$select staff_validate_redemption((select j->>'code' from rd))$$, 'già consegnato');
select nickname, xp, tokens, level from profiles where nickname='Mario';

-- annullo movimento manuale
select owner_revert_points((select max(id) from point_events where kind='manual'));
select nickname, xp, tokens, level from profiles where nickname='Mario';

-- evento calcio x5 -> missione tifoso
insert into events (kind, title, starts_at) select 'calcio', 'Partita '||g, now() from generate_series(1,5) g;
select staff_mark_attendance(id, array['00000000-0000-0000-0000-0000000000b2'::uuid]) from events order by id;
select b.code from profile_badges pb join badges b on b.id=pb.badge_id where pb.profile_id='00000000-0000-0000-0000-0000000000b2';

-- squadre
select as_user('00000000-0000-0000-0000-0000000000b1');
select create_team('I Galli', '{}');
select as_user('00000000-0000-0000-0000-0000000000b3');
select expect_error($$select join_team((select id from teams limit 1))$$, 'amico del capitano');
select as_user('00000000-0000-0000-0000-0000000000b2');
select join_team((select id from teams limit 1));

-- classifiche, bacheca, outbox
select p.nickname, l.points from season_leaderboard l join profiles p on p.id=l.profile_id order by points desc;
select * from team_leaderboard;
select kind, count(*) from feed_posts group by kind order by kind;
select as_user('00000000-0000-0000-0000-0000000000b3');
select case when (select count(*) from point_events)=0 then 'OK Teo non vede i movimenti altrui' else 'FAIL' end;
select my_season_recap(current_season());

-- torneo
select as_user('00000000-0000-0000-0000-00000000000a');
insert into events (kind, title, starts_at) values ('carte','Torneo beccaccino', now());
insert into tournaments (event_id, game) select max(id), 'beccaccino' from events;
insert into tournament_pairs (tournament_id, player_a, player_b) select max(id), '00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2' from tournaments;
select staff_close_tournament((select max(id) from tournaments), (select max(id) from tournament_pairs));
select owner_stats();
select staff_close_season(current_season());
reset role;
select kind, count(*) from notification_outbox group by kind order by kind;

-- inviti
reset role;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b4','ugo@x'), ('00000000-0000-0000-0000-0000000000b5','zeno@x');
create temp table codes as select nickname, invite_code from profiles;
grant select on codes to authenticated;
set role authenticated;
select as_user('00000000-0000-0000-0000-0000000000b4');
insert into profiles (id, nickname, type_ids, adult_confirmed) values (auth.uid(), 'Ugo', '{1}', true);
select use_invite((select invite_code from codes where nickname = 'Mario'));
select expect_error($$select use_invite((select invite_code from codes where nickname = 'Gigi'))$$, 'già usato');
select as_user('00000000-0000-0000-0000-00000000000a');
select staff_review_profile('00000000-0000-0000-0000-0000000000b4', true);
create temp table code2 as select staff_checkin_code() c;
grant select on code2 to authenticated;
select as_user('00000000-0000-0000-0000-0000000000b4');
select do_checkin((select c from code2));
reset role;
select case when (select count(*) from point_events where kind = 'invite') = 2 then 'OK invito premiato a entrambi' else 'FAIL invito' end;

-- iscrizioni con posti limitati e torneo dalle iscrizioni
set role authenticated;
select as_user('00000000-0000-0000-0000-0000000000c1');
insert into events (kind, title, starts_at, capacity, registration) values ('carte', 'Briscola del giovedì', now() + interval '2 hours', 3, true);
insert into tournaments (event_id, game) select max(id), 'briscola' from events;
select as_user('00000000-0000-0000-0000-0000000000b1');
select register_event((select max(id) from events), '00000000-0000-0000-0000-0000000000b2');
select as_user('00000000-0000-0000-0000-0000000000b2');
select expect_error($$select register_event((select max(id) from events))$$, 'già iscritto');
select as_user('00000000-0000-0000-0000-0000000000b3');
select register_event((select max(id) from events));
select as_user('00000000-0000-0000-0000-0000000000b5');
select as_user('00000000-0000-0000-0000-0000000000b4');
select expect_error($$select register_event((select max(id) from events))$$, 'Posti esauriti');
select as_user('00000000-0000-0000-0000-0000000000c1');
select staff_build_bracket((select max(id) from tournaments)) as partite_primo_turno;

-- lavori giornalieri
reset role;
insert into profiles (id, nickname, type_ids, adult_confirmed, status) values ('00000000-0000-0000-0000-0000000000b5', 'Zeno', '{1}', true, 'approved');
insert into checkins (profile_id, day) values ('00000000-0000-0000-0000-0000000000b5', current_date - 14);
update events set starts_at = now() + interval '1 minute' where id = (select max(id) from events);
select daily_jobs();
select daily_jobs();  -- seconda esecuzione: nessun doppione
select case when (select count(*) from point_events where kind = 'birthday') = 1 then 'OK compleanno una volta' else 'FAIL compleanno' end;
select case when (select comeback_bonus from profiles where nickname = 'Zeno') then 'OK ci manchi' else 'FAIL ci manchi' end;
select kind, count(*) from notification_outbox where kind in ('birthday','miss_you','event_reminder','invite','event') group by kind order by kind;
set role authenticated;
select as_user('00000000-0000-0000-0000-0000000000b5');
select do_checkin((select c from code2));
reset role;
select case when exists (select 1 from point_events where kind = 'comeback') and not (select comeback_bonus from profiles where nickname='Zeno')
  then 'OK bonus bentornato' else 'FAIL bentornato' end;
set role authenticated;

-- cancellazione account
set role authenticated;
select as_user('00000000-0000-0000-0000-0000000000b3');
select delete_my_account();
reset role;
select count(*) as profili_rimasti from profiles;
