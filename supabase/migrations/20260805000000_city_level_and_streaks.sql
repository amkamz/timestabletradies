-- City level, XP and streaks — docs/native/vision.md.
--
-- Replaces Trade Rank with a number that can only rise. Rank was recomputed
-- from a *single* Yard round and could fall, which made it useless as a gate:
-- anything keyed off it could vanish after one bad speed test, and to a child
-- a thing that disappears reads as punishment rather than as a bad round.
--
-- `rank_rung` is left in place rather than dropped. Nothing reads it after
-- this migration, but it is the only record of what a student had achieved
-- under the old ladder and dropping a column is not reversible.

begin;

/* ------------------------------------------------------------- city level */

-- Only XP is stored. The level is derived from it by `levelFromXp`
-- (`lib/game/city-level.ts`), so the two can never disagree — which they
-- eventually would if both were columns.
alter table students
  add column if not exists city_xp int not null default 0 check (city_xp >= 0);

comment on column students.city_xp is
  'Total XP earned. City level is derived from this by levelFromXp() — never '
  'stored, so a level and its bar cannot drift apart.';

comment on column students.rank_rung is
  'DEPRECATED. Trade Rank was replaced by city level (city_xp) because a rank '
  'recomputed per Yard round could fall, and a gate that vanishes reads to a '
  'child as punishment. Kept for history; nothing reads it.';

-- Seed XP from the old ladder so nobody who had earned a rank wakes up on
-- level 1. Each rung maps to two city levels, matching the shop thresholds
-- that moved from requiresRank to requiresLevel.
update students
set city_xp = case rank_rung
  when 1 then 60      -- level 2
  when 2 then 340     -- level 4
  when 3 then 780     -- level 6
  when 4 then 1380    -- level 8
  when 5 then 2140    -- level 10
  when 6 then 3060    -- level 12
  when 7 then 4140    -- level 14
  when 8 then 5380    -- level 16
  when 9 then 6780    -- level 18
  when 10 then 8340   -- level 20
  else 0
end
where city_xp = 0;

/* ----------------------------------------------------------------- streak */

-- Two numbers, deliberately. `streak_tier` is the earn *rate* and decays one
-- step per missed day; `streak_points` is the spendable balance and is never
-- clawed back. Deriving the tier from a consecutive-day count would take a
-- child from tier 9 to nothing over one swimming lesson.
alter table students
  add column if not exists streak_tier int not null default 0
    check (streak_tier between 0 and 10),
  add column if not exists streak_points int not null default 0
    check (streak_points >= 0),
  add column if not exists streak_days_into_block int not null default 0
    check (streak_days_into_block between 0 and 9),
  add column if not exists streak_last_played_on date;

comment on column students.streak_tier is
  'Earn rate, 0-10. Rises one step per ten consecutive days played, falls one '
  'step per day missed.';

comment on column students.streak_points is
  'Spendable balance. A completed ten-day block pays out streak_tier points. '
  'Never reduced by a missed day — only by spending.';

comment on column students.streak_last_played_on is
  'Date of the last day any run was finished. Makes recordPlay idempotent '
  'within a day, which matters because it is called per run, not per morning.';

/* ------------------------------------------------------------- crew view */

-- The crew roster showed a rank beside each crewmate's name. It shows a city
-- level now, which is the same one number a child compares themselves on.
--
-- Still the only cross-family read and still deliberately minimal: a name, a
-- look, and one progress number. No coins, no mastery, no accuracy, no age.
-- Runs as the view owner rather than the invoker, so `auth_crew_student_ids()`
-- is what scopes it.
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
  s.city_xp
from students s
where s.id in (select auth_crew_student_ids());

commit;
