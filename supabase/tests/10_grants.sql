-- Supabase dà questi permessi di default sulle tabelle in public; li replichiamo
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
-- poi ri-applichiamo le restrizioni di colonna come in schema.sql
revoke select on profiles from authenticated;
grant select (id, nickname, description, type_ids, sprite, photo_path, status, hidden, title_id, team_id,
              xp, level, first_visit, created_at) on profiles to authenticated;
revoke insert, update on profiles from authenticated;
grant insert (id, nickname, description, type_ids, sprite, photo_path, adult_confirmed, birth_day, birth_month) on profiles to authenticated;
grant update (nickname, description, type_ids, sprite, photo_path, hidden, title_id, birth_day, birth_month) on profiles to authenticated;
revoke insert, update, delete on teams from authenticated;
grant update (name, crest) on teams to authenticated;
