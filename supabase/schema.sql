-- =====================================================================
-- Stuoiedex — schema del database (Supabase / Postgres 15+)
-- Eseguire una volta nell'SQL editor di Supabase.
-- Regola d'oro: il client legge, ma tutto ciò che vale punti passa da
-- funzioni SECURITY DEFINER che controllano e calcolano lato server.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Impostazioni e segreti
-- ---------------------------------------------------------------------

create table settings (
  id                    boolean primary key default true check (id),
  team_max_members      int  not null default 5,
  event_xp              int  not null default 40,
  event_tokens          int  not null default 4,
  event_season          int  not null default 20,
  tournament_xp         int  not null default 100,
  tournament_tokens     int  not null default 10,
  tournament_season     int  not null default 50,
  qr_window_seconds     int  not null default 120,
  redemption_minutes    int  not null default 5,
  checkin_xp            int  not null default 20,
  checkin_tokens        int  not null default 2,
  checkin_season        int  not null default 10,
  streak_xp             int  not null default 15,
  capture_xp            int  not null default 30,
  capture_tokens        int  not null default 3,
  capture_season        int  not null default 15,
  quiet_from            time not null default '23:00',
  quiet_to              time not null default '09:00',
  max_push_per_day      int  not null default 3,
  invite_xp             int  not null default 50,
  invite_tokens         int  not null default 5,
  comeback_after_days   int  not null default 14,
  comeback_xp           int  not null default 30,
  comeback_tokens       int  not null default 3,
  birthday_xp           int  not null default 50,
  birthday_tokens       int  not null default 15
);
insert into settings default values;

-- Segreto per firmare i QR: mai leggibile dal client.
create table app_secrets (
  id      boolean primary key default true check (id),
  qr_key  text not null default encode(gen_random_bytes(32), 'hex')
);
insert into app_secrets default values;

-- ---------------------------------------------------------------------
-- Personale
-- ---------------------------------------------------------------------

create type staff_role as enum ('owner', 'barista');

create table staff (
  user_id  uuid primary key references auth.users on delete cascade,
  role     staff_role not null default 'barista'
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid())
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and role = 'owner')
$$;

-- ---------------------------------------------------------------------
-- Catalogo: tipi, oggetti, medaglie, stagioni
-- ---------------------------------------------------------------------

create table creature_types (
  id     serial primary key,
  name   text not null unique,
  color  text not null,
  icon   text not null
);

create table seasons (
  id         serial primary key,
  name       text not null,
  starts_on  date not null,
  ends_on    date not null,
  theme      text,                      -- es. 'natale', 'estate', 'sagra'; null = mese normale
  closed     boolean not null default false,
  check (ends_on >= starts_on)
);

create or replace function current_season() returns int
language sql stable set search_path = public as $$
  select id from seasons
  where current_date between starts_on and ends_on and not closed
  order by starts_on desc limit 1
$$;

create type item_slot as enum ('cappello', 'occhiali', 'sciarpa', 'mano', 'sfondo', 'cornice');

create table items (
  id            serial primary key,
  slot          item_slot not null,
  name          text not null,
  asset         text not null,          -- percorso dello sprite nello Storage
  unlock_level  int,                    -- sbloccato a questo livello
  season_id     int references seasons  -- se legato a una stagione a tema
);

-- Pezzi base del personaggio: sempre gratuiti, si cambiano quando si vuole.
create type part_kind as enum
  ('corporatura', 'pelle', 'viso', 'occhi', 'sopracciglia', 'bocca', 'capelli', 'colore_capelli',
   'barba', 'maglia', 'colore_maglia', 'pantaloni', 'scarpe', 'posa');

create table sprite_parts (
  id     serial primary key,
  kind   part_kind not null,
  name   text not null,
  asset  text,               -- livello pixel art nello Storage; null per i colori
  color  text,               -- per pelle, colore capelli e maglia
  sort   int not null default 0,
  unique (kind, name)
);

create table titles (
  id    serial primary key,
  name  text not null unique
);

create table badges (
  id               serial primary key,
  code             text not null unique,
  name             text not null,
  description      text not null,
  icon             text not null,
  secret           boolean not null default false,
  season_id        int references seasons,
  unlocks_item_id  int references items,
  unlocks_title_id int references titles
);

-- ---------------------------------------------------------------------
-- Squadre e profili
-- ---------------------------------------------------------------------

create table teams (
  id          serial primary key,
  name        text not null unique check (char_length(name) between 2 and 24),
  crest       jsonb not null default '{}',
  captain_id  uuid not null,
  created_at  timestamptz not null default now()
);

create type profile_status as enum ('pending', 'approved', 'rejected');

create table profiles (
  id              uuid primary key references auth.users on delete cascade,
  nickname        text not null unique check (char_length(nickname) between 2 and 20),
  description     text not null default '' check (char_length(description) <= 140),
  type_ids        int[] not null default '{}' check (cardinality(type_ids) between 1 and 2),
  sprite          jsonb not null default '{}',   -- {"base":{kind:part_id}, "equipped":{slot:item_id}}
  photo_path      text,
  status          profile_status not null default 'pending',
  moderation_note text,
  hidden          boolean not null default false,
  adult_confirmed boolean not null check (adult_confirmed),
  title_id        int references titles,
  team_id         int references teams on delete set null,
  xp              int not null default 0,
  tokens          int not null default 0 check (tokens >= 0),
  level           int not null default 1,
  first_visit     date,
  invite_code     text not null unique default upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6)),
  invited_by      uuid references profiles on delete set null,
  invite_rewarded boolean not null default false,
  birth_day       smallint check (birth_day between 1 and 31),
  birth_month     smallint check (birth_month between 1 and 12),
  comeback_bonus  boolean not null default false,
  missed_notified_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table teams add constraint teams_captain_fk
  foreign key (captain_id) references profiles on delete cascade;

-- Curva dei livelli: XP totale per raggiungere il livello L = 25·(L−1)^1.8, massimo 30.
create or replace function xp_for_level(l int) returns int
language sql immutable as $$ select round(25 * power(greatest(l - 1, 0), 1.8))::int $$;

create or replace function level_for_xp(x int) returns int
language sql immutable as $$
  select coalesce(max(l), 1) from generate_series(1, 30) l where xp_for_level(l) <= x
$$;

create or replace function rarity_for_level(l int) returns text
language sql immutable as $$
  select case when l >= 30 then 'leggendario'
              when l >= 20 then 'raro'
              when l >= 10 then 'non_comune'
              else 'comune' end
$$;

create table profile_items (
  profile_id  uuid references profiles on delete cascade,
  item_id     int  references items on delete cascade,
  obtained_at timestamptz not null default now(),
  primary key (profile_id, item_id)
);

create table profile_titles (
  profile_id  uuid references profiles on delete cascade,
  title_id    int  references titles on delete cascade,
  primary key (profile_id, title_id)
);

create table profile_badges (
  profile_id  uuid references profiles on delete cascade,
  badge_id    int  references badges on delete cascade,
  obtained_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

-- ---------------------------------------------------------------------
-- Registro punti: unica fonte di verità per XP, gettoni e punti stagione
-- ---------------------------------------------------------------------

create type point_kind as enum
  ('checkin', 'streak', 'capture', 'mission', 'event', 'tournament', 'manual', 'redemption',
   'invite', 'comeback', 'birthday');

create table point_events (
  id            bigserial primary key,
  profile_id    uuid not null references profiles on delete cascade,
  kind          point_kind not null,
  xp            int not null default 0,
  tokens        int not null default 0,
  season_points int not null default 0,
  season_id     int references seasons,
  reason        text,
  ref           text,                      -- id dell'oggetto che ha generato i punti
  created_by    uuid,                      -- membro del personale, se assegnati a mano
  created_at    timestamptz not null default now(),
  reverted_at   timestamptz,
  reverted_by   uuid
);
create index on point_events (profile_id, created_at desc);
create index on point_events (season_id, profile_id) where reverted_at is null;

-- Bacheca e notifiche (definite qui perché usate dalle funzioni sotto)
create type feed_kind as enum ('level_up', 'rarity_up', 'badge', 'event_winner', 'announcement');

create table feed_posts (
  id          bigserial primary key,
  kind        feed_kind not null,
  profile_id  uuid references profiles on delete cascade,
  payload     jsonb not null default '{}',
  pinned      boolean not null default false,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index on feed_posts (pinned desc, created_at desc);

create table feed_reactions (
  post_id     bigint references feed_posts on delete cascade,
  profile_id  uuid references profiles on delete cascade,
  primary key (post_id, profile_id)
);

create type notif_kind as enum
  ('mission', 'event', 'announcement', 'badge', 'overtaken', 'friend_request', 'season_end',
   'invite', 'miss_you', 'birthday', 'event_reminder');

create table notification_prefs (
  profile_id  uuid references profiles on delete cascade,
  kind        notif_kind,
  enabled     boolean not null default true,
  primary key (profile_id, kind)
);

create table push_subscriptions (
  id          bigserial primary key,
  profile_id  uuid not null references profiles on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

-- Coda letta dalla Edge Function che invia le push (rispetta prefs, silenzio e limite giornaliero).
create table notification_outbox (
  id          bigserial primary key,
  profile_id  uuid not null references profiles on delete cascade,
  kind        notif_kind not null,
  title       text not null,
  body        text not null,
  url         text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  skipped     text
);

create or replace function notify(p uuid, k notif_kind, t text, b text, u text default null)
returns void language sql security definer set search_path = public as $$
  insert into notification_outbox (profile_id, kind, title, body, url) values (p, k, t, b, u)
$$;

-- Assegna un oggetto/titolo/medaglia (idempotente)
create or replace function grant_badge(p uuid, badge_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare b badges;
begin
  select * into b from badges where code = badge_code;
  if not found then return false; end if;
  insert into profile_badges (profile_id, badge_id) values (p, b.id) on conflict do nothing;
  if not found then return false; end if;
  if b.unlocks_item_id is not null then
    insert into profile_items (profile_id, item_id) values (p, b.unlocks_item_id) on conflict do nothing;
  end if;
  if b.unlocks_title_id is not null then
    insert into profile_titles (profile_id, title_id) values (p, b.unlocks_title_id) on conflict do nothing;
  end if;
  insert into feed_posts (kind, profile_id, payload) values ('badge', p, jsonb_build_object('badge_id', b.id));
  perform notify(p, 'badge', 'Nuova medaglia', b.name);
  return true;
end $$;

-- Ricalcola i totali di un profilo e gestisce level up, rarità, oggetti, sorpassi.
create or replace function apply_points_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pid uuid := coalesce(new.profile_id, old.profile_id);
  old_level int; new_level int; new_xp int; new_tokens int;
begin
  select level into old_level from profiles where id = pid for update;
  select coalesce(sum(xp), 0), coalesce(sum(tokens), 0)
    into new_xp, new_tokens
    from point_events where profile_id = pid and reverted_at is null;
  new_level := level_for_xp(new_xp);

  update profiles set xp = new_xp, tokens = greatest(new_tokens, 0), level = new_level where id = pid;

  if new_level > old_level then
    insert into profile_items (profile_id, item_id)
      select pid, id from items where unlock_level is not null and unlock_level <= new_level
      on conflict do nothing;
    insert into feed_posts (kind, profile_id, payload)
      values ('level_up', pid, jsonb_build_object('level', new_level));
    if rarity_for_level(new_level) <> rarity_for_level(old_level) then
      insert into feed_posts (kind, profile_id, payload)
        values ('rarity_up', pid, jsonb_build_object('rarity', rarity_for_level(new_level)));
    end if;
  end if;
  return null;
end $$;

create trigger point_events_apply
  after insert or update of reverted_at on point_events
  for each row execute function apply_points_trigger();

-- Inserisce punti e avvisa chi viene sorpassato in classifica.
create or replace function add_points(
  p uuid, k point_kind, x int, t int, s int, why text default null, r text default null, by_staff uuid default null
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  sid int := current_season();
  before_pts int; after_pts int; ev bigint;
begin
  if sid is null then s := 0; end if;
  select coalesce(sum(season_points), 0) into before_pts
    from point_events where profile_id = p and season_id = sid and reverted_at is null;

  insert into point_events (profile_id, kind, xp, tokens, season_points, season_id, reason, ref, created_by)
  values (p, k, x, t, s, sid, why, r, by_staff) returning id into ev;

  if s > 0 then
    after_pts := before_pts + s;
    -- chi aveva punti tra prima e dopo è stato appena sorpassato
    perform notify(q.profile_id, 'overtaken', 'Ti hanno superato',
                   (select nickname from profiles where id = p) || ' ti ha appena superato in classifica')
    from (
      select profile_id, sum(season_points) pts from point_events
      where season_id = sid and reverted_at is null and profile_id <> p
      group by profile_id
    ) q
    where q.pts >= before_pts and q.pts < after_pts;
  end if;
  return ev;
end $$;

-- ---------------------------------------------------------------------
-- QR firmati che cambiano nel tempo
-- ---------------------------------------------------------------------

create or replace function qr_sign(payload text) returns text
language sql stable security definer set search_path = public, extensions as $$
  select substr(encode(hmac(payload, (select qr_key from app_secrets), 'sha256'), 'hex'), 1, 12)
$$;

create or replace function qr_window() returns bigint
language sql stable set search_path = public as $$
  select floor(extract(epoch from now()) / (select qr_window_seconds from settings))::bigint
$$;

-- Valido nella finestra attuale e in quella precedente (tolleranza per chi scansiona al cambio).
create or replace function qr_valid(payload_prefix text, code text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare w bigint := qr_window(); i int;
begin
  for i in 0..1 loop
    if code = payload_prefix || '.' || (w - i) || '.' || qr_sign(payload_prefix || '.' || (w - i)) then
      return true;
    end if;
  end loop;
  return false;
end $$;

-- Codice di check-in da mostrare sul tablet del bar (solo personale).
create or replace function staff_checkin_code() returns text
language plpgsql stable security definer set search_path = public as $$
declare w bigint := qr_window();
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  return 'C.' || w || '.' || qr_sign('C.' || w);
end $$;

-- QR personale del cliente, per farsi catturare.
create or replace function my_capture_code() returns text
language plpgsql stable security definer set search_path = public as $$
declare w bigint := qr_window(); pfx text := 'P' || replace(auth.uid()::text, '-', '');
begin
  if auth.uid() is null then raise exception 'Accesso richiesto'; end if;
  return pfx || '.' || w || '.' || qr_sign(pfx || '.' || w);
end $$;

-- ---------------------------------------------------------------------
-- Check-in e serie di presenze
-- ---------------------------------------------------------------------

create table checkins (
  profile_id  uuid references profiles on delete cascade,
  day         date not null default current_date,
  created_at  timestamptz not null default now(),
  primary key (profile_id, day)
);

create or replace function require_approved() returns profiles
language plpgsql stable security definer set search_path = public as $$
declare me profiles;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'Profilo non trovato'; end if;
  if me.status <> 'approved' then raise exception 'La tua scheda è in attesa di approvazione'; end if;
  return me;
end $$;

create or replace function do_checkin(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := require_approved();
  st settings; visits_week int; streak boolean := false;
begin
  select * into st from settings;
  if not qr_valid('C', code) then raise exception 'QR scaduto: inquadra quello sul tablet del bar'; end if;

  insert into checkins (profile_id) values (me.id) on conflict do nothing;
  if not found then raise exception 'Check-in già fatto oggi'; end if;

  update profiles set first_visit = coalesce(first_visit, current_date) where id = me.id;
  perform add_points(me.id, 'checkin', st.checkin_xp, st.checkin_tokens, st.checkin_season);

  -- bentornato: bonus una tantum dopo la notifica "ci manchi"
  if me.comeback_bonus then
    perform add_points(me.id, 'comeback', st.comeback_xp, st.comeback_tokens, 0, 'Bentornato');
    update profiles set comeback_bonus = false where id = me.id;
  end if;

  -- invito: al primo check-in dell'invitato, premio a tutti e due
  if me.invited_by is not null and not me.invite_rewarded then
    perform add_points(me.id, 'invite', st.invite_xp, st.invite_tokens, 0, 'Invito', me.invited_by::text);
    perform add_points(me.invited_by, 'invite', st.invite_xp, st.invite_tokens, 0, 'Invito', me.id::text);
    update profiles set invite_rewarded = true where id = me.id;
    perform notify(me.invited_by, 'invite', 'Invito riuscito', me.nickname || ' è arrivato al bar');
  end if;

  -- Serie: terza visita negli ultimi 8 giorni (una settimana più un giorno di tolleranza)
  select count(*) into visits_week from checkins
    where profile_id = me.id and day > current_date - 8;
  if visits_week = 3 then
    perform add_points(me.id, 'streak', st.streak_xp, 1, 5, 'Serie di presenze');
    streak := true;
  end if;

  perform advance_missions(me.id, 'checkins');
  perform check_milestones(me.id);
  return jsonb_build_object('ok', true, 'streak', streak);
end $$;

-- ---------------------------------------------------------------------
-- Amicizie e catture
-- ---------------------------------------------------------------------

create table friendships (
  requester  uuid references profiles on delete cascade,
  addressee  uuid references profiles on delete cascade,
  accepted   boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);

create table captures (
  catcher    uuid references profiles on delete cascade,
  caught     uuid references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (catcher, caught),
  check (catcher <> caught)
);

create or replace function request_friend(other uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := require_approved();
begin
  if exists (select 1 from friendships where requester = other and addressee = me.id) then
    update friendships set accepted = true where requester = other and addressee = me.id;
    return;
  end if;
  insert into friendships (requester, addressee) values (me.id, other) on conflict do nothing;
  perform notify(other, 'friend_request', 'Richiesta d''amicizia', me.nickname || ' vuole essere tuo amico');
end $$;

create or replace function answer_friend(other uuid, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if accept then
    update friendships set accepted = true where requester = other and addressee = auth.uid();
  else
    delete from friendships where requester = other and addressee = auth.uid();
  end if;
end $$;

create or replace function do_capture(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me profiles := require_approved();
  st settings; other uuid; first_time boolean;
begin
  select * into st from settings;
  if code !~ '^P[0-9a-f]{32}\.' then raise exception 'Questo non è il QR di un cliente'; end if;
  other := (substr(split_part(code, '.', 1), 2))::uuid;
  if other = me.id then raise exception 'Non puoi catturare te stesso'; end if;
  if not qr_valid(split_part(code, '.', 1), code) then raise exception 'QR scaduto: fallo aggiornare'; end if;
  if not exists (select 1 from profiles where id = other and status = 'approved') then
    raise exception 'Cliente non trovato';
  end if;
  if not exists (select 1 from checkins where profile_id = me.id and day = current_date)
     or not exists (select 1 from checkins where profile_id = other and day = current_date) then
    raise exception 'Dovete aver fatto entrambi il check-in oggi';
  end if;

  insert into captures (catcher, caught) values (me.id, other) on conflict do nothing;
  first_time := found;

  -- catturarsi significa anche essere amici
  insert into friendships (requester, addressee, accepted) values (me.id, other, true)
    on conflict (requester, addressee) do update set accepted = true;
  update friendships set accepted = true where requester = other and addressee = me.id;

  -- punti solo la prima volta per ogni coppia, a entrambi
  if first_time and not exists (select 1 from captures where catcher = other and caught = me.id) then
    perform add_points(me.id,  'capture', st.capture_xp, st.capture_tokens, st.capture_season, null, other::text);
    perform add_points(other, 'capture', st.capture_xp, st.capture_tokens, st.capture_season, null, me.id::text);
    perform advance_missions(me.id, 'captures');
    perform advance_missions(other, 'captures');
  end if;
  perform check_milestones(me.id);
  return jsonb_build_object('ok', true, 'new', first_time, 'caught', other);
end $$;

-- ---------------------------------------------------------------------
-- Missioni
-- ---------------------------------------------------------------------

create type mission_goal as enum ('checkins', 'captures', 'event_calcio', 'event_carte', 'event_any', 'manual');

create table missions (
  id            serial primary key,
  title         text not null,
  goal          mission_goal not null,
  target        int  not null check (target > 0),
  xp            int  not null default 0,
  tokens        int  not null default 0,
  season_points int  not null default 0,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz not null,
  season_id     int references seasons,
  badge_code    text references badges (code),
  created_at    timestamptz not null default now()
);

create table mission_progress (
  mission_id   int  references missions on delete cascade,
  profile_id   uuid references profiles on delete cascade,
  progress     int  not null default 0,
  completed_at timestamptz,
  primary key (mission_id, profile_id)
);

create or replace function advance_missions(p uuid, g text) returns void
language plpgsql security definer set search_path = public as $$
declare m missions; done boolean;
begin
  for m in select * from missions
           where now() between starts_at and ends_at
             and (goal::text = g or (goal = 'event_any' and g like 'event_%'))
  loop
    insert into mission_progress (mission_id, profile_id, progress) values (m.id, p, 1)
      on conflict (mission_id, profile_id)
      do update set progress = mission_progress.progress + 1
      where mission_progress.completed_at is null;

    update mission_progress set completed_at = now()
      where mission_id = m.id and profile_id = p and completed_at is null and progress >= m.target
      returning true into done;

    if done then
      perform add_points(p, 'mission', m.xp, m.tokens, m.season_points, m.title, m.id::text);
      if m.badge_code is not null then perform grant_badge(p, m.badge_code); end if;
    end if;
    done := null;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Eventi e tornei di carte
-- ---------------------------------------------------------------------

create type event_kind as enum ('calcio', 'carte', 'festa');

create table events (
  id            serial primary key,
  kind          event_kind not null,
  title         text not null,
  starts_at     timestamptz not null,
  created_at    timestamptz not null default now()
);

create table event_attendance (
  event_id    int  references events on delete cascade,
  profile_id  uuid references profiles on delete cascade,
  primary key (event_id, profile_id)
);

create type card_game as enum ('beccaccino', 'briscola');

create table tournaments (
  id          serial primary key,
  event_id    int not null unique references events on delete cascade,
  game        card_game not null,
  winner_pair int
);

create table tournament_pairs (
  id             serial primary key,
  tournament_id  int not null references tournaments on delete cascade,
  player_a       uuid not null references profiles,
  player_b       uuid not null references profiles,
  name           text
);

alter table tournaments add constraint tournaments_winner_fk
  foreign key (winner_pair) references tournament_pairs on delete set null;

create table tournament_matches (
  id             serial primary key,
  tournament_id  int not null references tournaments on delete cascade,
  round          int not null,
  slot           int not null,
  pair_a         int references tournament_pairs,
  pair_b         int references tournament_pairs,
  winner         int references tournament_pairs,
  score          text,
  unique (tournament_id, round, slot)
);

-- Il personale segna i presenti: punti e avanzamento missioni.
create or replace function staff_mark_attendance(ev int, people uuid[]) returns int
language plpgsql security definer set search_path = public as $$
declare e events; st settings; p uuid; n int := 0;
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  select * into e from events where id = ev;
  select * into st from settings;
  foreach p in array people loop
    insert into event_attendance values (ev, p) on conflict do nothing;
    if found then
      perform add_points(p, 'event', st.event_xp, st.event_tokens, st.event_season, e.title, ev::text, auth.uid());
      perform advance_missions(p, 'event_' || e.kind);
      perform check_milestones(p);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function staff_close_tournament(t int, winning_pair int) returns void
language plpgsql security definer set search_path = public as $$
declare tp tournament_pairs; tr tournaments; st settings;
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  select * into tp from tournament_pairs where id = winning_pair and tournament_id = t;
  if not found then raise exception 'Coppia non valida'; end if;
  select * into st from settings;
  update tournaments set winner_pair = winning_pair where id = t returning * into tr;
  perform add_points(tp.player_a, 'tournament', st.tournament_xp, st.tournament_tokens, st.tournament_season, 'Vittoria torneo', t::text, auth.uid());
  perform add_points(tp.player_b, 'tournament', st.tournament_xp, st.tournament_tokens, st.tournament_season, 'Vittoria torneo', t::text, auth.uid());
  perform grant_badge(tp.player_a, 'campione_' || tr.game);
  perform grant_badge(tp.player_b, 'campione_' || tr.game);
  insert into feed_posts (kind, payload, created_by)
    values ('event_winner', jsonb_build_object('tournament_id', t, 'pair_id', winning_pair), auth.uid());
end $$;

-- ---------------------------------------------------------------------
-- Traguardi automatici (medaglie di presenze e catture)
-- ---------------------------------------------------------------------

create or replace function check_milestones(p uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v int; c int;
begin
  select count(*) into v from checkins where profile_id = p;
  select count(*) into c from captures where catcher = p;
  if v >= 1   then perform grant_badge(p, 'prima_visita'); end if;
  if v >= 10  then perform grant_badge(p, 'habitue'); end if;
  if v >= 30  then perform grant_badge(p, 'di_casa'); end if;
  if v >= 100 then perform grant_badge(p, 'colonna_del_bar'); end if;
  if c >= 1   then perform grant_badge(p, 'prima_cattura'); end if;
  if c >= 10  then perform grant_badge(p, 'collezionista'); end if;
  if c >= (select count(*) - 1 from profiles where status = 'approved') and c >= 20 then
    perform grant_badge(p, 'stuoiedex_completo');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Premi e riscatti
-- ---------------------------------------------------------------------

create table rewards (
  id          serial primary key,
  name        text not null,
  cost        int  not null check (cost > 0),
  alcoholic   boolean not null default false,
  season_id   int references seasons,
  active      boolean not null default true
);

create type redemption_status as enum ('pending', 'validated', 'expired');

create table redemptions (
  id            bigserial primary key,
  profile_id    uuid not null references profiles on delete cascade,
  reward_id     int  not null references rewards,
  code          text not null unique,
  expires_at    timestamptz not null,
  status        redemption_status not null default 'pending',
  validated_by  uuid,
  validated_at  timestamptz,
  created_at    timestamptz not null default now()
);

create or replace function start_redemption(rid int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles := require_approved(); r rewards; c text; exp timestamptz;
begin
  select * into r from rewards where id = rid and active
    and (season_id is null or season_id = current_season());
  if not found then raise exception 'Premio non disponibile'; end if;
  if me.tokens < r.cost then raise exception 'Gettoni insufficienti'; end if;

  update redemptions set status = 'expired' where profile_id = me.id and status = 'pending';
  c := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  exp := now() + make_interval(mins => (select redemption_minutes from settings));
  insert into redemptions (profile_id, reward_id, code, expires_at) values (me.id, rid, c, exp);
  return jsonb_build_object('code', 'R.' || c, 'expires_at', exp);
end $$;

create or replace function staff_validate_redemption(code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare rd redemptions; r rewards; p profiles;
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  select * into rd from redemptions where redemptions.code = replace(staff_validate_redemption.code, 'R.', '')
    for update;
  if not found then raise exception 'Codice non valido'; end if;
  if rd.status = 'validated' then raise exception 'Premio già consegnato'; end if;
  if rd.status = 'expired' or rd.expires_at < now() then
    update redemptions set status = 'expired' where id = rd.id;
    raise exception 'Codice scaduto: fallo rigenerare al cliente';
  end if;
  select * into r from rewards where id = rd.reward_id;
  select * into p from profiles where id = rd.profile_id for update;
  if p.tokens < r.cost then raise exception 'Gettoni insufficienti'; end if;

  perform add_points(p.id, 'redemption', 0, -r.cost, 0, r.name, rd.id::text, auth.uid());
  update redemptions set status = 'validated', validated_by = auth.uid(), validated_at = now() where id = rd.id;
  return jsonb_build_object('reward', r.name, 'nickname', p.nickname);
end $$;

-- ---------------------------------------------------------------------
-- Funzioni del personale
-- ---------------------------------------------------------------------

create or replace function staff_review_profile(p uuid, approve boolean, note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  update profiles
    set status = case when approve then 'approved'::profile_status else 'rejected'::profile_status end,
        moderation_note = note
    where id = p;
end $$;

create or replace function owner_award_points(p uuid, x int, t int, s int, why text) returns bigint
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Solo il proprietario'; end if;
  if x < 0 or t < 0 or s < 0 then raise exception 'Per togliere punti annulla il movimento'; end if;
  return add_points(p, 'manual', x, t, s, why, null, auth.uid());
end $$;

create or replace function owner_revert_points(ev bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Solo il proprietario'; end if;
  update point_events set reverted_at = now(), reverted_by = auth.uid()
    where id = ev and reverted_at is null and kind <> 'redemption';
  if not found then raise exception 'Movimento non annullabile'; end if;
end $$;

create or replace function staff_announce(t text, body text, pin boolean default false) returns bigint
language plpgsql security definer set search_path = public as $$
declare pid bigint;
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  insert into feed_posts (kind, payload, pinned, created_by)
    values ('announcement', jsonb_build_object('title', t, 'body', body), pin, auth.uid())
    returning id into pid;
  perform notify(id, 'announcement', t, body) from profiles where status = 'approved';
  return pid;
end $$;

-- Chiude la stagione: medaglia al primo, notifica a tutti, la classifica riparte da zero.
create or replace function staff_close_season(sid int) returns uuid
language plpgsql security definer set search_path = public as $$
declare winner uuid;
begin
  if not is_owner() then raise exception 'Solo il proprietario'; end if;
  select profile_id into winner from season_leaderboard where season_id = sid order by points desc limit 1;
  update seasons set closed = true where id = sid;
  if winner is not null then
    perform grant_badge(winner, 'campione_del_mese');
    insert into feed_posts (kind, profile_id, payload, created_by)
      values ('event_winner', winner, jsonb_build_object('season_id', sid), auth.uid());
  end if;
  perform notify(id, 'season_end', 'Stagione chiusa', 'Guarda il tuo riepilogo') from profiles where status = 'approved';
  return winner;
end $$;

-- ---------------------------------------------------------------------
-- Squadre
-- ---------------------------------------------------------------------

create or replace function create_team(n text, c jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare me profiles := require_approved(); tid int;
begin
  if me.team_id is not null then raise exception 'Sei già in una squadra'; end if;
  insert into teams (name, crest, captain_id) values (n, c, me.id) returning id into tid;
  update profiles set team_id = tid where id = me.id;
  return tid;
end $$;

create or replace function join_team(tid int) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := require_approved(); cap uuid;
begin
  if me.team_id is not null then raise exception 'Sei già in una squadra'; end if;
  select captain_id into cap from teams where id = tid for update;
  if not found then raise exception 'Squadra non trovata'; end if;
  if not exists (select 1 from friendships
                 where accepted and ((requester = me.id and addressee = cap) or (requester = cap and addressee = me.id))) then
    raise exception 'Devi essere amico del capitano';
  end if;
  if (select count(*) from profiles where team_id = tid) >= (select team_max_members from settings) then
    raise exception 'La squadra è al completo';
  end if;
  update profiles set team_id = tid where id = me.id;
end $$;

create or replace function leave_team() returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := require_approved(); heir uuid;
begin
  if me.team_id is null then return; end if;
  update profiles set team_id = null where id = me.id;
  if (select captain_id from teams where id = me.team_id) = me.id then
    select id into heir from profiles where team_id = me.team_id order by created_at limit 1;
    if heir is null then delete from teams where id = me.team_id;
    else update teams set captain_id = heir where id = me.team_id; end if;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Profilo: solo i campi personali sono modificabili dal cliente
-- ---------------------------------------------------------------------

create or replace function profile_guard() returns trigger
language plpgsql set search_path = public as $$
declare slot_item record; part record;
begin
  -- pezzi base: devono esistere e corrispondere alla categoria
  for part in select key, value from jsonb_each(coalesce(new.sprite -> 'base', '{}')) loop
    if jsonb_typeof(part.value) <> 'number' or not exists (
         select 1 from sprite_parts where id = part.value::text::int and kind::text = part.key) then
      raise exception 'Pezzo del personaggio non valido: %', part.key;
    end if;
  end loop;
  -- ogni modifica di testo rimanda la scheda in revisione se era stata rifiutata
  if tg_op = 'UPDATE' and old.status = 'rejected'
     and (new.nickname <> old.nickname or new.description <> old.description) then
    new.status := 'pending';
  end if;
  -- si possono indossare solo oggetti posseduti
  for slot_item in select value::text::int as item_id
                   from jsonb_each(coalesce(new.sprite -> 'equipped', '{}'))
                   where jsonb_typeof(value) = 'number'
  loop
    if not exists (select 1 from profile_items where profile_id = new.id and item_id = slot_item.item_id) then
      raise exception 'Oggetto non ancora sbloccato';
    end if;
  end loop;
  if new.title_id is not null and new.title_id is distinct from (case when tg_op = 'UPDATE' then old.title_id end)
     and not exists (select 1 from profile_titles where profile_id = new.id and title_id = new.title_id) then
    raise exception 'Titolo non ancora sbloccato';
  end if;
  return new;
end $$;

create trigger profiles_guard before insert or update on profiles
  for each row execute function profile_guard();

-- ---------------------------------------------------------------------
-- Classifiche
-- ---------------------------------------------------------------------

create view season_leaderboard with (security_invoker = false) as
  select pe.season_id, pe.profile_id, sum(pe.season_points)::int as points
  from point_events pe
  join profiles p on p.id = pe.profile_id and p.status = 'approved' and not p.hidden
  where pe.reverted_at is null and pe.season_id is not null
  group by pe.season_id, pe.profile_id;

create view team_leaderboard with (security_invoker = false) as
  select l.season_id, p.team_id, sum(l.points)::int as points
  from season_leaderboard l join profiles p on p.id = l.profile_id
  where p.team_id is not null
  group by l.season_id, p.team_id;

-- Riepilogo di fine stagione per la condivisione
create or replace function my_season_recap(sid int) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visits',   (select count(*) from checkins c join seasons s on s.id = sid
                 where c.profile_id = auth.uid() and c.day between s.starts_on and s.ends_on),
    'captures', (select count(*) from captures c join seasons s on s.id = sid
                 where c.catcher = auth.uid() and c.created_at::date between s.starts_on and s.ends_on),
    'badges',   (select count(*) from profile_badges b join seasons s on s.id = sid
                 where b.profile_id = auth.uid() and b.obtained_at::date between s.starts_on and s.ends_on),
    'points',   (select points from season_leaderboard where season_id = sid and profile_id = auth.uid()),
    'rank',     (select r from (select profile_id, rank() over (order by points desc) r
                                from season_leaderboard where season_id = sid) x
                 where profile_id = auth.uid())
  )
$$;

-- Statistiche per il proprietario
create or replace function owner_stats(days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  return jsonb_build_object(
    'active',      (select count(distinct profile_id) from checkins where day > current_date - days),
    'per_day',     (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', n) order by day), '[]')
                    from (select day, count(*) n from checkins where day > current_date - days group by day) d),
    'redeemed',    (select count(*) from redemptions where status = 'validated' and validated_at > now() - make_interval(days => days)),
    'top_missions',(select coalesce(jsonb_agg(x), '[]') from (
                      select m.title, count(*) done from mission_progress mp join missions m on m.id = mp.mission_id
                      where mp.completed_at > now() - make_interval(days => days)
                      group by m.title order by done desc limit 5) x)
  );
end $$;

-- ---------------------------------------------------------------------
-- Cancellazione account (GDPR): cancella l'utente e a cascata tutto il resto
-- ---------------------------------------------------------------------

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid(); tid int;
begin
  if me is null then raise exception 'Accesso richiesto'; end if;
  select team_id into tid from profiles where id = me;
  if tid is not null then perform leave_team(); end if;
  delete from auth.users where id = me;
end $$;

-- ---------------------------------------------------------------------
-- Inviti
-- ---------------------------------------------------------------------

-- Si usa una volta sola, prima del primo check-in.
create or replace function use_invite(code text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; host uuid;
begin
  select * into me from profiles where id = auth.uid();
  if not found then raise exception 'Crea prima la tua scheda'; end if;
  if me.invited_by is not null then raise exception 'Hai già usato un invito'; end if;
  if exists (select 1 from checkins where profile_id = me.id) then
    raise exception 'L''invito vale solo prima della prima visita';
  end if;
  select id into host from profiles where invite_code = upper(code) and id <> me.id;
  if host is null then raise exception 'Codice invito non valido'; end if;
  update profiles set invited_by = host where id = me.id;
end $$;

-- ---------------------------------------------------------------------
-- Iscrizioni a eventi e tornei, promemoria
-- ---------------------------------------------------------------------

alter table events add column capacity int check (capacity > 0);
alter table events add column registration boolean not null default false;
alter table events add column reminded boolean not null default false;

create table event_registrations (
  event_id    int  references events on delete cascade,
  profile_id  uuid references profiles on delete cascade,
  partner_id  uuid references profiles on delete set null,   -- coppia per i tornei di carte
  created_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create or replace function register_event(ev int, partner uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles := require_approved(); e events; taken int;
begin
  select * into e from events where id = ev for update;
  if not found or not e.registration then raise exception 'Iscrizioni chiuse'; end if;
  if e.starts_at < now() then raise exception 'L''evento è già iniziato'; end if;
  if exists (select 1 from event_registrations where event_id = ev and (profile_id = me.id or partner_id = me.id)) then
    raise exception 'Sei già iscritto';
  end if;
  if partner is not null then
    if partner = me.id or not exists (select 1 from profiles where id = partner and status = 'approved') then
      raise exception 'Compagno non valido';
    end if;
    if exists (select 1 from event_registrations where event_id = ev and (profile_id = partner or partner_id = partner)) then
      raise exception 'Il tuo compagno è già iscritto';
    end if;
  end if;
  select count(*) + count(partner_id) into taken from event_registrations where event_id = ev;
  if e.capacity is not null and taken + 1 + (partner is not null)::int > e.capacity then
    raise exception 'Posti esauriti';
  end if;
  insert into event_registrations (event_id, profile_id, partner_id) values (ev, me.id, partner);
  if partner is not null then
    perform notify(partner, 'event', 'Sei in coppia', me.nickname || ' ti ha iscritto a ' || e.title);
  end if;
end $$;

create or replace function unregister_event(ev int) returns void
language sql security definer set search_path = public as $$
  delete from event_registrations
  where event_id = ev and profile_id = auth.uid()
    and (select starts_at from events where id = ev) > now()
$$;

-- Il personale trasforma le coppie iscritte nel tabellone del torneo.
create or replace function staff_build_bracket(t int) returns int
language plpgsql security definer set search_path = public as $$
declare tr tournaments; n int := 0; r record; ids int[] := '{}'; i int;
begin
  if not is_staff() then raise exception 'Solo il personale'; end if;
  select * into tr from tournaments where id = t;
  delete from tournament_matches where tournament_id = t;
  delete from tournament_pairs where tournament_id = t;
  for r in select profile_id, partner_id from event_registrations
           where event_id = tr.event_id and partner_id is not null order by random() loop
    insert into tournament_pairs (tournament_id, player_a, player_b) values (t, r.profile_id, r.partner_id);
    ids := ids || currval('tournament_pairs_id_seq')::int;
  end loop;
  i := 1;
  while i <= coalesce(array_length(ids, 1), 0) loop
    n := n + 1;
    insert into tournament_matches (tournament_id, round, slot, pair_a, pair_b)
      values (t, 1, n, ids[i], ids[i + 1]);   -- coppia senza avversario passa il turno
    i := i + 2;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Lavori giornalieri: compleanni, "ci manchi", promemoria eventi
-- (pianificati con pg_cron in fondo al file)
-- ---------------------------------------------------------------------

create or replace function daily_jobs() returns void
language plpgsql security definer set search_path = public as $$
declare st settings; p profiles; e events;
begin
  select * into st from settings;

  -- compleanni
  for p in select * from profiles
           where status = 'approved'
             and birth_day = extract(day from current_date) and birth_month = extract(month from current_date)
             and not exists (select 1 from point_events pe where pe.profile_id = profiles.id
                             and pe.kind = 'birthday' and pe.created_at::date = current_date)
  loop
    perform add_points(p.id, 'birthday', st.birthday_xp, st.birthday_tokens, 0, 'Buon compleanno');
    perform grant_badge(p.id, 'compleanno');
    perform notify(p.id, 'birthday', 'Buon compleanno!', 'Ti aspetta un regalo al Bar Stuoie');
  end loop;

  -- ci manchi: una volta sola per assenza
  for p in select pr.* from profiles pr
           where pr.status = 'approved' and not pr.comeback_bonus
             and (select max(day) from checkins c where c.profile_id = pr.id) = current_date - st.comeback_after_days
  loop
    update profiles set comeback_bonus = true, missed_notified_at = now() where id = p.id;
    perform notify(p.id, 'miss_you', 'Al bar si sente la tua mancanza', 'Torna a trovarci: c''è un bonus ad aspettarti');
  end loop;

  -- promemoria per gli eventi di oggi
  for e in select * from events where starts_at::date = current_date and not reminded loop
    perform notify(r.profile_id, 'event_reminder', e.title, 'Stasera alle ' || to_char(e.starts_at, 'HH24:MI'))
      from event_registrations r where r.event_id = e.id;
    perform notify(r.partner_id, 'event_reminder', e.title, 'Stasera alle ' || to_char(e.starts_at, 'HH24:MI'))
      from event_registrations r where r.event_id = e.id and r.partner_id is not null;
    update events set reminded = true where id = e.id;
  end loop;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table settings            enable row level security;
alter table app_secrets         enable row level security;
alter table staff               enable row level security;
alter table creature_types      enable row level security;
alter table seasons             enable row level security;
alter table items               enable row level security;
alter table titles              enable row level security;
alter table badges              enable row level security;
alter table teams               enable row level security;
alter table profiles            enable row level security;
alter table profile_items       enable row level security;
alter table profile_titles      enable row level security;
alter table profile_badges      enable row level security;
alter table point_events        enable row level security;
alter table feed_posts          enable row level security;
alter table feed_reactions      enable row level security;
alter table notification_prefs  enable row level security;
alter table push_subscriptions  enable row level security;
alter table notification_outbox enable row level security;
alter table checkins            enable row level security;
alter table friendships         enable row level security;
alter table captures            enable row level security;
alter table missions            enable row level security;
alter table mission_progress    enable row level security;
alter table events              enable row level security;
alter table event_attendance    enable row level security;
alter table tournaments         enable row level security;
alter table tournament_pairs    enable row level security;
alter table tournament_matches  enable row level security;
alter table rewards             enable row level security;
alter table redemptions         enable row level security;
alter table event_registrations enable row level security;

-- app_secrets e notification_outbox: nessuna policy = nessun accesso dal client.

-- Catalogo leggibile da tutti gli iscritti, modificabile dal personale
do $$
declare t text;
begin
  -- il personale gestisce eventi e tornei
  foreach t in array array['events','tournaments','tournament_pairs','tournament_matches']
  loop
    execute format('create policy "%1$s_read" on %1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s_staff" on %1$I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
  -- punti, prezzi e catalogo: solo il gestionale del proprietario
  foreach t in array array['creature_types','seasons','items','titles','missions','rewards','sprite_parts']
  loop
    execute format('create policy "%1$s_read" on %1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s_owner" on %1$I for all to authenticated using (is_owner()) with check (is_owner())', t);
  end loop;
end $$;

-- I badge segreti si vedono solo dopo averli ottenuti
create policy badges_read on badges for select to authenticated
  using (not secret or is_owner()
         or exists (select 1 from profile_badges pb where pb.badge_id = badges.id and pb.profile_id = auth.uid()));
create policy badges_owner on badges for all to authenticated using (is_owner()) with check (is_owner());

create policy settings_read  on settings for select to authenticated using (true);
create policy settings_owner on settings for update to authenticated using (is_owner()) with check (is_owner());

create policy staff_read  on staff for select to authenticated using (user_id = auth.uid() or is_staff());
create policy staff_owner on staff for all to authenticated using (is_owner()) with check (is_owner());

-- Profili
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or is_staff() or (status = 'approved' and not hidden));
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Colonne protette: il cliente modifica solo i campi personali
revoke insert, update on profiles from authenticated, anon;
grant insert (id, nickname, description, type_ids, sprite, photo_path, adult_confirmed, birth_day, birth_month) on profiles to authenticated;
grant update (nickname, description, type_ids, sprite, photo_path, hidden, title_id, birth_day, birth_month) on profiles to authenticated;

create policy teams_read on teams for select to authenticated using (true);
create policy teams_update on teams for update to authenticated
  using (captain_id = auth.uid()) with check (captain_id = auth.uid());
revoke insert, update, delete on teams from authenticated, anon;
grant update (name, crest) on teams to authenticated;

-- Collezioni: pubbliche come le schede
create policy profile_items_read  on profile_items  for select to authenticated using (true);
create policy profile_titles_read on profile_titles for select to authenticated using (true);
create policy profile_badges_read on profile_badges for select to authenticated using (true);

-- Movimenti punti: ognuno vede i suoi, il personale tutti
create policy point_events_read on point_events for select to authenticated
  using (profile_id = auth.uid() or is_staff());

create policy feed_read on feed_posts for select to authenticated using (true);
create policy feed_staff on feed_posts for update to authenticated using (is_staff()) with check (is_staff());
create policy feed_staff_delete on feed_posts for delete to authenticated using (is_staff());

create policy reactions_read on feed_reactions for select to authenticated using (true);
create policy reactions_own on feed_reactions for insert to authenticated with check (profile_id = auth.uid());
create policy reactions_del on feed_reactions for delete to authenticated using (profile_id = auth.uid());

create policy prefs_own on notification_prefs for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy push_own on push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy checkins_read on checkins for select to authenticated
  using (profile_id = auth.uid() or is_staff());

create policy friendships_read on friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
create policy friendships_delete on friendships for delete to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

create policy captures_read on captures for select to authenticated using (true);

create policy mission_progress_read on mission_progress for select to authenticated
  using (profile_id = auth.uid() or is_staff());
create policy attendance_read on event_attendance for select to authenticated using (true);

create policy registrations_read on event_registrations for select to authenticated using (true);

create policy redemptions_read on redemptions for select to authenticated
  using (profile_id = auth.uid() or is_staff());

-- Le viste delle classifiche girano coi permessi del proprietario: espongono solo punteggi pubblici
grant select on season_leaderboard, team_leaderboard to authenticated;

-- Funzioni interne: non richiamabili dal client
revoke execute on function add_points(uuid, point_kind, int, int, int, text, text, uuid) from public, authenticated, anon;
revoke execute on function grant_badge(uuid, text)        from public, authenticated, anon;
revoke execute on function notify(uuid, notif_kind, text, text, text) from public, authenticated, anon;
revoke execute on function advance_missions(uuid, text)   from public, authenticated, anon;
revoke execute on function check_milestones(uuid)         from public, authenticated, anon;
revoke execute on function qr_sign(text)                  from public, authenticated, anon;
revoke execute on function qr_valid(text, text)           from public, authenticated, anon;
revoke execute on function daily_jobs()                    from public, authenticated, anon;

-- Realtime: classifiche e bacheca si aggiornano da sole
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table feed_posts, point_events, feed_reactions;
  end if;
end $$;

-- Ogni mattina alle 10 (ora di Roma ≈ 9 UTC): compleanni, "ci manchi", promemoria
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('stuoiedex-daily', '0 9 * * *', 'select public.daily_jobs()');
  end if;
end $$;
