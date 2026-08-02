-- ============================================================================
-- pending_runs — board delivery (docs/native/README.md §0.2, §1.3).
--
-- The client used to be handed a *seed* and expand it into a question set or a
-- board. Both sides ran the same PRNG and had to agree fact-for-fact, forever,
-- across every language a client is written in. That is a bug waiting for a
-- second platform.
--
-- Now the server generates the content, stores it here, and sends it. At
-- finish, the run is verified against the row — so the server scores what it
-- actually asked, not what the client claims it was asked.
--
-- Written only by the server holding the service role. A client that could
-- insert here could hand itself a board of x1 facts and call it a Boss Battle.
-- ============================================================================

create table if not exists pending_runs (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  mode         text not null,
  job_type     text,
  table_no     int,

  -- The content exactly as delivered: questions, or a board for the puzzle
  -- modes. jsonb rather than a seed, which is the whole point.
  content      jsonb not null,

  -- What the job board advertised, so finish can't be told a bigger number.
  reward       jsonb,

  created_at   timestamptz not null default now(),

  -- A run left open forever is a run that can be submitted forever. Two hours
  -- is long enough for a child to be interrupted and come back.
  expires_at   timestamptz not null default (now() + interval '2 hours'),

  -- Set on submission. Non-null means already scored — the replay guard.
  consumed_at  timestamptz
);

create index if not exists pending_runs_student_idx
  on pending_runs(student_id, created_at desc);

alter table pending_runs enable row level security;

-- Readable by the family it belongs to, so a client can re-read a run it was
-- handed if the app restarts mid-session.
drop policy if exists pending_runs_read on pending_runs;
create policy pending_runs_read on pending_runs
  for select using (student_id in (select auth_student_ids()));

-- Deliberately no insert, update or delete policy. See the header.

comment on table pending_runs is
  'Content as delivered to a client, for verification at finish. Written only '
  'by the server with the service role - never by a client.';
