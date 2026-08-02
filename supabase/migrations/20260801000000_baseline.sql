-- ============================================================================
-- Times Table Tradies — consolidated baseline schema
--
-- Replaces 0001_init, 0002_new_modes, 0003_tutorial_zone and 0004_entitlements.
-- Those were split across four files and partly applied by hand through the
-- SQL editor, which left the CLI's migration history unable to reconcile.
--
-- **This script is idempotent.** It is safe to run against an empty database,
-- against one that already has the original schema, and against one that has
-- already had this script run. Every create is guarded, every constraint is
-- dropped before being re-added, and the one destructive statement in the old
-- 0002 (the speed_attempts backfill) only fires when the column is genuinely
-- new.
--
-- Shape of the world (spec §2):
--   families ── family_members ── auth.users   (parents + grandparents)
--       └───── students                        (profiles, no own login)
--
-- Auth model: the *parent* holds the Supabase auth session. Student profiles
-- live under the family and are selected in-session — kids never hold
-- credentials, can't search for other users, and can't reach billing.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- families

create table if not exists families (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  plan          text not null default 'annual' check (plan in ('annual', 'monthly')),
  plan_status   text not null default 'trialing'
                  check (plan_status in ('trialing', 'active', 'past_due', 'canceled')),
  -- Opaque reference to the payment processor. No card data is ever stored here.
  billing_ref   text,
  created_at    timestamptz not null default now()
);

-- Roles within a family. 'parent' is the root admin (max 2, spec §2).
-- 'grandparent' is a deliberately narrow role: stickers only.
create table if not exists family_members (
  family_id  uuid not null references families(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('parent', 'grandparent')),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index if not exists family_members_user_idx on family_members(user_id);

-- ---------------------------------------------------------------- students

create table if not exists students (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references families(id) on delete cascade,
  display_name   text not null,
  age            int check (age between 4 and 18),
  year_level     text,

  -- Tradie name, assembled only from the vetted pools (spec §7).
  name_trade     text,
  name_adjective text,
  name_surname   text,

  -- Character look. Model is an index into the gallery; nothing here
  -- encodes or implies gender (spec §7).
  look_model     int not null default 1 check (look_model between 1 and 200),
  look_skin      text not null default 's3',
  look_hair      text not null default 'h1',

  -- Progression
  coins          int not null default 0 check (coins >= 0),
  rank_rung      int not null default 1 check (rank_rung between 1 and 10),
  house_stage    int not null default 0 check (house_stage >= 0),
  house_loads    int not null default 0 check (house_loads >= 0),
  onboarded_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists students_family_idx on students(family_id);

-- Which tables a student has unlocked, and whether division has opened up
-- for each (multiplication-first rule, spec §4).
create table if not exists student_tables (
  student_id        uuid not null references students(id) on delete cascade,
  table_no          int not null check (table_no between 1 and 99),
  unlocked_at       timestamptz not null default now(),
  -- Set once the student finishes a full multiplication round on this table.
  division_unlocked boolean not null default false,
  primary key (student_id, table_no)
);

comment on table student_tables is
  'Zones a student has unlocked. x1 (Labouring) is the tutorial zone and leads '
  'the default order; it counts toward unlock thresholds like any other table, '
  'but the puzzle generators skip it - see puzzleTables() in lib/game/zones.';

-- ---------------------------------------------------------------- mastery

-- One row per individual fact cell (spec §11). Stage is derived in the app
-- from these counters rather than stored, so the ladder rules live in one place.
create table if not exists fact_mastery (
  student_id     uuid not null references students(id) on delete cascade,
  a              int not null check (a between 1 and 99),
  b              int not null check (b between 1 and 12),
  attempts       int not null default 0,
  correct        int not null default 0,
  avg_ms         int not null default 0,
  retention_hits int not null default 0,
  last_seen_at   timestamptz,
  primary key (student_id, a, b)
);

-- `avg_ms` is a rolling mean, and originally every attempt fed it. Untimed
-- modes (Cable Run, Floor Plan, Toolbox Time) submit wall-clock thinking time,
-- which pushes the mean up and can hold a genuinely fluent fact at Silver.
--
-- Attempts that don't measure speed increment `attempts` and `correct` but not
-- `speed_attempts`, and the mean is taken over `speed_attempts` alone.
--
-- The backfill is guarded: it seeds the counter from `attempts` only when the
-- column is genuinely new. Re-running it on a live database would erase the
-- distinction between timed and untimed attempts, which is the whole point of
-- the column.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'fact_mastery'
      and column_name = 'speed_attempts'
  ) then
    alter table fact_mastery add column speed_attempts int not null default 0;
    update fact_mastery set speed_attempts = attempts;
  end if;
end $$;

comment on column fact_mastery.speed_attempts is
  'Attempts that fed avg_ms. Untimed modes increment attempts but not this.';

-- ------------------------------------------------------------------- runs

-- One row per completed job / mode session.
create table if not exists runs (
  student_id  uuid not null references students(id) on delete cascade,
  id          uuid primary key default gen_random_uuid(),
  mode        text not null,
  job_type    text check (job_type in ('quick','delivery','measure','build','muster')),
  table_no    int,
  operation   text not null default 'multiply' check (operation in ('multiply','divide','both')),
  questions   int not null default 0,
  correct     int not null default 0,
  avg_ms      int not null default 0,
  coins       int not null default 0,
  materials   int not null default 0,
  -- Big Job results are visible to the teacher automatically (spec §6.1).
  shared_with_teacher boolean not null default false,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- Applied unconditionally so a database created before the five new modes
-- ends up with exactly the same constraint as a fresh one.
alter table runs drop constraint if exists runs_mode_check;
alter table runs add constraint runs_mode_check check (mode in (
  'job', 'garage', 'yard', 'inspection', 'toolbox',
  'bigjob', 'boss', 'crewrace', 'expo', 'challenge',
  -- docs/game-modes/
  'cablerun', 'rally', 'tooloff', 'scaffold', 'floorplan'
));

create index if not exists runs_student_idx on runs(student_id, finished_at desc);

-- Individual answers, kept for speed/accuracy trends in the dashboard.
create table if not exists answers (
  id         bigserial primary key,
  run_id     uuid not null references runs(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  a          int not null,
  b          int not null,
  operation  text not null check (operation in ('multiply','divide')),
  correct    boolean not null,
  elapsed_ms int not null
);

create index if not exists answers_run_idx on answers(run_id);
create index if not exists answers_student_idx on answers(student_id);

-- --------------------------------------------------------------- cosmetics

create table if not exists student_cosmetics (
  student_id uuid not null references students(id) on delete cascade,
  item_key   text not null,
  equipped   boolean not null default false,
  bought_at  timestamptz not null default now(),
  primary key (student_id, item_key)
);

-- Rare house items, only obtainable from Boss Battle wins (spec §8).
create table if not exists student_rare_items (
  student_id uuid not null references students(id) on delete cascade,
  item_key   text not null,
  won_at     timestamptz not null default now(),
  primary key (student_id, item_key)
);

-- ------------------------------------------------------------------- crew

-- Parent-to-parent links. Once two families are linked, their students
-- become visible to each other as crew (spec §2). Kids never create these.
create table if not exists crew_links (
  id           uuid primary key default gen_random_uuid(),
  family_a     uuid not null references families(id) on delete cascade,
  family_b     uuid not null references families(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','active','blocked')),
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- Store each pair once, in a stable order.
  constraint crew_links_ordered check (family_a < family_b),
  constraint crew_links_unique unique (family_a, family_b)
);

-- Single-use invite codes, issued by a parent.
create table if not exists invites (
  code        text primary key,
  family_id   uuid not null references families(id) on delete cascade,
  kind        text not null check (kind in ('parent', 'grandparent', 'crew')),
  created_by  uuid not null references auth.users(id) on delete cascade,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null
);

-- ---------------------------------------------------------------- stickers

-- The only thing a grandparent account can do (spec §2).
create table if not exists stickers (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  sticker_key text not null,
  sent_at     timestamptz not null default now(),
  seen_at     timestamptz
);

create index if not exists stickers_student_idx on stickers(student_id, sent_at desc);

-- -------------------------------------------------------------- challenges

-- Head-to-head async challenges between linked crew (spec §6.2).
create table if not exists challenges (
  id           uuid primary key default gen_random_uuid(),
  seed         text not null,
  table_no     int,
  questions    int not null default 10,
  from_student uuid not null references students(id) on delete cascade,
  to_student   uuid references students(id) on delete cascade,
  from_run     uuid references runs(id) on delete set null,
  to_run       uuid references runs(id) on delete set null,
  status       text not null default 'sent' check (status in ('sent','complete','expired')),
  created_at   timestamptz not null default now()
);

-- -------------------------------------------------------------- classrooms

create table if not exists classrooms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  join_code  text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists classroom_students (
  classroom_id uuid not null references classrooms(id) on delete cascade,
  student_id   uuid not null references students(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (classroom_id, student_id)
);

-- Teacher-set focus: which tables The Garage should target (spec §6.1).
create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  student_id   uuid references students(id) on delete cascade,
  tables       int[] not null default '{}',
  operation    text not null default 'multiply' check (operation in ('multiply','divide','both')),
  note         text,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------------ a11y

create table if not exists student_settings (
  student_id      uuid primary key references students(id) on delete cascade,
  read_aloud      boolean not null default false,
  dyslexia_font   boolean not null default false,
  high_contrast   boolean not null default false,
  reduced_motion  boolean not null default false,
  text_scale      numeric not null default 1.0 check (text_scale between 0.8 and 2.0),
  -- Timers can be extended or switched off entirely on every timed mode (spec §13).
  timer_mode      text not null default 'standard'
                    check (timer_mode in ('standard', 'extended', 'off'))
);

-- ------------------------------------------------------------ entitlements

-- The product is freemium: x1, x2 and x10 are free, everything past them needs
-- a subscription. That subscription can be bought on the web (no store
-- commission), through the App Store or through Play, and the app must not
-- care which — so entitlement is one server-side fact that any channel grants.
--
-- `families.plan` and `families.plan_status` stay where they are. They record
-- what the parent *chose*; this table records what they are actually owed, as
-- confirmed by a processor. A selected plan is not a paid one.
create table if not exists entitlements (
  family_id    uuid primary key references families(id) on delete cascade,

  -- 'free' is the absence of a subscription, stored explicitly so a lapse is
  -- distinguishable from a family that never had one.
  tier         text not null default 'full' check (tier in ('free', 'full')),

  -- Where it was bought. 'trial' and 'comp' are internal grants.
  channel      text not null
                 check (channel in ('web_stripe', 'apple', 'google', 'trial', 'comp')),

  -- 'grace' is a payment that failed but has not yet lapsed — the child keeps
  -- playing while the parent sorts the card out.
  status       text not null check (status in ('active', 'grace', 'expired')),

  -- Null means it does not expire on its own (a comp, or a live subscription
  -- whose renewal is tracked by the processor).
  expires_at   timestamptz,

  -- Stripe subscription id, App Store original_transaction_id, or the Play
  -- purchase token. Opaque; no card data is ever stored here.
  external_ref text,

  updated_at   timestamptz not null default now()
);

comment on table entitlements is
  'What a family is owed, independent of which channel paid for it. Written '
  'only by the server after receipt or webhook validation - never by a client.';

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Families the current user belongs to, in any role.
create or replace function auth_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from family_members where user_id = auth.uid();
$$;

-- Families the current user is a *parent* of. Grandparents are excluded,
-- which is what keeps stats and billing out of their reach.
create or replace function auth_parent_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from family_members
  where user_id = auth.uid() and role = 'parent';
$$;

-- Students the current user can administer (their own family's kids).
create or replace function auth_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id from students s
  where s.family_id in (select auth_parent_family_ids());
$$;

-- Students a grandparent may send stickers to.
create or replace function auth_grandchild_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id from students s
  join family_members m on m.family_id = s.family_id
  where m.user_id = auth.uid() and m.role = 'grandparent';
$$;

-- Students visible to the current user as *crew* — i.e. kids under a family
-- their family has explicitly linked (spec §2). Read-only, and only ever
-- surfaces a display name and score, never stats.
create or replace function auth_crew_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from students s
  where s.family_id in (
    select case when l.family_a = f.family_id then l.family_b else l.family_a end
    from crew_links l
    cross join auth_parent_family_ids() as f(family_id)
    where l.status = 'active'
      and f.family_id in (l.family_a, l.family_b)
  );
$$;

-- Students in classrooms the current user teaches.
create or replace function auth_taught_student_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cs.student_id
  from classroom_students cs
  join classrooms c on c.id = cs.classroom_id
  where c.teacher_id = auth.uid();
$$;

-- ============================================================================
-- Row Level Security
--
-- `enable row level security` is a no-op when already enabled. Policies have
-- no CREATE OR REPLACE, so each is dropped by name first — which also means
-- editing a policy here and re-running this file actually updates it.
-- ============================================================================

alter table families           enable row level security;
alter table family_members     enable row level security;
alter table students           enable row level security;
alter table student_tables     enable row level security;
alter table fact_mastery       enable row level security;
alter table runs               enable row level security;
alter table answers            enable row level security;
alter table student_cosmetics  enable row level security;
alter table student_rare_items enable row level security;
alter table crew_links         enable row level security;
alter table invites            enable row level security;
alter table stickers           enable row level security;
alter table challenges         enable row level security;
alter table classrooms         enable row level security;
alter table classroom_students enable row level security;
alter table assignments        enable row level security;
alter table student_settings   enable row level security;
alter table entitlements       enable row level security;

-- ---- families -------------------------------------------------------------

drop policy if exists families_read on families;
create policy families_read on families
  for select using (id in (select auth_family_ids()));

-- Only parents can change family-level settings, which includes the plan.
drop policy if exists families_write on families;
create policy families_write on families
  for update using (id in (select auth_parent_family_ids()))
  with check (id in (select auth_parent_family_ids()));

drop policy if exists families_insert on families;
create policy families_insert on families
  for insert with check (true);

-- ---- family_members -------------------------------------------------------

drop policy if exists family_members_read on family_members;
create policy family_members_read on family_members
  for select using (family_id in (select auth_family_ids()));

drop policy if exists family_members_insert on family_members;
create policy family_members_insert on family_members
  for insert with check (
    -- Bootstrapping your own membership, or a parent adding someone.
    user_id = auth.uid() or family_id in (select auth_parent_family_ids())
  );

drop policy if exists family_members_delete on family_members;
create policy family_members_delete on family_members
  for delete using (family_id in (select auth_parent_family_ids()));

-- ---- students -------------------------------------------------------------

-- Parents see and manage their own kids. Grandparents see only names (the
-- app selects just the name column for them). Teachers see kids in their class.
-- Crew visibility is intentionally *not* granted here — crew reads go through
-- a dedicated view so no progression data leaks between families.
drop policy if exists students_read on students;
create policy students_read on students
  for select using (
    family_id in (select auth_family_ids())
    or id in (select auth_taught_student_ids())
  );

drop policy if exists students_write on students;
create policy students_write on students
  for update using (family_id in (select auth_parent_family_ids()))
  with check (family_id in (select auth_parent_family_ids()));

drop policy if exists students_insert on students;
create policy students_insert on students
  for insert with check (family_id in (select auth_parent_family_ids()));

drop policy if exists students_delete on students;
create policy students_delete on students
  for delete using (family_id in (select auth_parent_family_ids()));

-- ---- per-student data -----------------------------------------------------

-- Same rule for every table hanging off a student: your own family's kids,
-- or kids you teach (read-only for teachers is enforced by the write policies).

drop policy if exists student_tables_read on student_tables;
create policy student_tables_read on student_tables
  for select using (
    student_id in (select auth_student_ids())
    or student_id in (select auth_taught_student_ids())
  );
drop policy if exists student_tables_write on student_tables;
create policy student_tables_write on student_tables
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

drop policy if exists fact_mastery_read on fact_mastery;
create policy fact_mastery_read on fact_mastery
  for select using (
    student_id in (select auth_student_ids())
    or student_id in (select auth_taught_student_ids())
  );
drop policy if exists fact_mastery_write on fact_mastery;
create policy fact_mastery_write on fact_mastery
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

drop policy if exists runs_read on runs;
create policy runs_read on runs
  for select using (
    student_id in (select auth_student_ids())
    or student_id in (select auth_taught_student_ids())
  );
drop policy if exists runs_write on runs;
create policy runs_write on runs
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

drop policy if exists answers_read on answers;
create policy answers_read on answers
  for select using (
    student_id in (select auth_student_ids())
    or student_id in (select auth_taught_student_ids())
  );
drop policy if exists answers_write on answers;
create policy answers_write on answers
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

drop policy if exists cosmetics_read on student_cosmetics;
create policy cosmetics_read on student_cosmetics
  for select using (student_id in (select auth_student_ids()));
drop policy if exists cosmetics_write on student_cosmetics;
create policy cosmetics_write on student_cosmetics
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

drop policy if exists rare_items_read on student_rare_items;
create policy rare_items_read on student_rare_items
  for select using (
    student_id in (select auth_student_ids())
    or student_id in (select auth_taught_student_ids())
  );
drop policy if exists rare_items_write on student_rare_items;
create policy rare_items_write on student_rare_items
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

drop policy if exists student_settings_read on student_settings;
create policy student_settings_read on student_settings
  for select using (student_id in (select auth_student_ids()));
drop policy if exists student_settings_write on student_settings;
create policy student_settings_write on student_settings
  for all using (student_id in (select auth_student_ids()))
  with check (student_id in (select auth_student_ids()));

-- ---- crew -----------------------------------------------------------------

-- Only parents can see or create crew links. This is the mechanism that
-- keeps kids from adding anyone themselves.
drop policy if exists crew_links_read on crew_links;
create policy crew_links_read on crew_links
  for select using (
    family_a in (select auth_parent_family_ids())
    or family_b in (select auth_parent_family_ids())
  );

drop policy if exists crew_links_insert on crew_links;
create policy crew_links_insert on crew_links
  for insert with check (
    created_by = auth.uid()
    and (family_a in (select auth_parent_family_ids())
         or family_b in (select auth_parent_family_ids()))
  );

drop policy if exists crew_links_update on crew_links;
create policy crew_links_update on crew_links
  for update using (
    family_a in (select auth_parent_family_ids())
    or family_b in (select auth_parent_family_ids())
  );

drop policy if exists crew_links_delete on crew_links;
create policy crew_links_delete on crew_links
  for delete using (
    family_a in (select auth_parent_family_ids())
    or family_b in (select auth_parent_family_ids())
  );

-- ---- invites --------------------------------------------------------------

drop policy if exists invites_read on invites;
create policy invites_read on invites
  for select using (family_id in (select auth_parent_family_ids()));

drop policy if exists invites_insert on invites;
create policy invites_insert on invites
  for insert with check (
    created_by = auth.uid() and family_id in (select auth_parent_family_ids())
  );

drop policy if exists invites_delete on invites;
create policy invites_delete on invites
  for delete using (family_id in (select auth_parent_family_ids()));

-- ---- stickers -------------------------------------------------------------

-- Readable by the kid's own family. Writable by anyone in the family who has
-- a relationship to that student — which for grandparents is their only write.
drop policy if exists stickers_read on stickers;
create policy stickers_read on stickers
  for select using (
    student_id in (select auth_student_ids())
    or sender_id = auth.uid()
  );

drop policy if exists stickers_insert on stickers;
create policy stickers_insert on stickers
  for insert with check (
    sender_id = auth.uid()
    and (
      student_id in (select auth_student_ids())
      or student_id in (select auth_grandchild_ids())
    )
  );

drop policy if exists stickers_update on stickers;
create policy stickers_update on stickers
  for update using (student_id in (select auth_student_ids()));

-- ---- challenges -----------------------------------------------------------

drop policy if exists challenges_read on challenges;
create policy challenges_read on challenges
  for select using (
    from_student in (select auth_student_ids())
    or to_student in (select auth_student_ids())
  );

drop policy if exists challenges_insert on challenges;
create policy challenges_insert on challenges
  for insert with check (
    from_student in (select auth_student_ids())
    -- The recipient must be linked crew. A kid can't challenge a stranger.
    and (to_student is null or to_student in (select auth_crew_student_ids()))
  );

drop policy if exists challenges_update on challenges;
create policy challenges_update on challenges
  for update using (
    from_student in (select auth_student_ids())
    or to_student in (select auth_student_ids())
  );

-- ---- classrooms -----------------------------------------------------------

drop policy if exists classrooms_owner on classrooms;
create policy classrooms_owner on classrooms
  for all using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists classroom_students_read on classroom_students;
create policy classroom_students_read on classroom_students
  for select using (
    student_id in (select auth_student_ids())
    or classroom_id in (select id from classrooms where teacher_id = auth.uid())
  );

drop policy if exists classroom_students_write on classroom_students;
create policy classroom_students_write on classroom_students
  for all using (
    student_id in (select auth_student_ids())
    or classroom_id in (select id from classrooms where teacher_id = auth.uid())
  )
  with check (
    student_id in (select auth_student_ids())
    or classroom_id in (select id from classrooms where teacher_id = auth.uid())
  );

drop policy if exists assignments_read on assignments;
create policy assignments_read on assignments
  for select using (
    student_id in (select auth_student_ids())
    or classroom_id in (select id from classrooms where teacher_id = auth.uid())
  );

drop policy if exists assignments_write on assignments;
create policy assignments_write on assignments
  for all using (classroom_id in (select id from classrooms where teacher_id = auth.uid()))
  with check (classroom_id in (select id from classrooms where teacher_id = auth.uid()));

-- ---- entitlements ---------------------------------------------------------

-- Parents may read what their family is entitled to, so the dashboard can show
-- it. Nothing else is granted.
drop policy if exists entitlements_read on entitlements;
create policy entitlements_read on entitlements
  for select using (family_id in (select auth_family_ids()));

-- Deliberately no insert, update or delete policy.
--
-- Entitlement is written only by the server, holding the service role, after
-- validating a Stripe webhook or a store receipt. A client that could write
-- this table could grant itself the paid tier, so no client can — including
-- the parent's own session.

-- ============================================================================
-- Crew view — the only cross-family read, deliberately minimal.
-- Exposes a display name and tradie name for race lobbies. No coins, no
-- mastery, no accuracy, no age, nothing a parent hasn't implicitly shared.
-- ============================================================================

-- Runs as the view owner (NOT security_invoker), so it can reach past the
-- students RLS policy — which deliberately does not grant cross-family reads.
-- The auth_crew_student_ids() filter is what scopes it, per request.
drop view if exists crew_roster;
create view crew_roster
with (security_invoker = false)
as
select
  s.id,
  s.display_name,
  s.name_trade,
  s.name_adjective,
  s.name_surname,
  s.look_model,
  s.look_skin,
  s.look_hair,
  s.rank_rung
from students s
where s.id in (select auth_crew_student_ids());

-- ============================================================================
-- Data backfills
--
-- Both are idempotent by construction, so re-running this file changes nothing.
-- ============================================================================

-- x1 (Labouring) is the tutorial zone and now leads DEFAULT_UNLOCK_ORDER, where
-- a new player learns the keypad and the shape of a job at zero maths load.
--
-- Students created before that change started on x2, so getUnlockState would
-- compute their nextTable as x1 and offer the tutorial zone as their *next*
-- reward — sending them backwards down the curriculum.
--
-- Division is deliberately left locked. The rule that division opens only after
-- a full multiplication round is what makes the multiplication-first sequence
-- hold, and there is no reason to make x1 the one exception.
insert into student_tables (student_id, table_no)
select id, 1 from students
on conflict (student_id, table_no) do nothing;

-- Everyone who already has an account keeps full access. They signed up before
-- there was a free tier and must not wake up locked out of x5.
--
-- New families get no row at all, which reads as the free tier. If a trial is
-- wanted later it is an ordinary row — channel 'trial', status 'active', with
-- an expires_at — and needs no schema change.
insert into entitlements (family_id, tier, channel, status)
select id, 'full', 'comp', 'active' from families
on conflict (family_id) do nothing;
