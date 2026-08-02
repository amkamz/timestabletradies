# Integration contract

How the five specified modes would attach to the existing app. **Nothing here is
implemented.** This document exists so each mode spec can say "funnels through
the standard seam" instead of re-deriving it five times.

---

## 1. The seam

Every completed session in the app already lands in exactly one place:

```ts
// src/lib/actions/play.ts
finishRun(payload: RunPayload): Promise<RunResult>
```

It re-scores from the answer log, writes `runs` + `answers`, folds mastery via
`recordMastery`, banks materials into the house, and returns the celebration
data. Jobs, modes, boss battles and races all use it today.

**All five new modes use it unchanged in shape.** A mode is therefore only ever
responsible for three things:

1. Deciding which facts to serve (its own generator).
2. Running its own interaction until it ends.
3. Emitting an ordered `answers[]` array of `{ a, b, operation, correct, elapsedMs }`.

Everything downstream — coins, materials, mastery, division unlocks, house
stages, rank — is the existing pipeline's job. No new mode computes its own
payout client-side, and none of them writes to `students` directly.

### What counts as one "answer"

Each mode spec defines this explicitly, because it isn't obvious for a board
game. The rule across all five: **one `answers[]` entry per fact the child
committed to.** A move they considered and abandoned is not an answer. A move
the board rejected *is* an answer (it's a wrong idea, committed).

---

## 2. Changes to existing files

> **Status: applied.** These landed alongside Scaffold Stack. §2.1 is a
> migration that **must be run against the Supabase project before the app will
> accept any run submission at all** — `recordMastery` now writes
> `fact_mastery.speed_attempts`, so every mode fails until the column exists.

### 2.1 `runs.mode` check constraint — additive migration

Written as `supabase/migrations/0002_new_modes.sql`, which also adds the
`speed_attempts` column from §2.3 and backfills it.

```sql
alter table runs drop constraint runs_mode_check;
alter table runs add constraint runs_mode_check check (mode in (
  'job', 'garage', 'yard', 'inspection', 'toolbox',
  'bigjob', 'boss', 'crewrace', 'expo', 'challenge',
  -- new
  'cablerun', 'rally', 'tooloff', 'scaffold', 'floorplan'
));
```

### 2.2 `RunMode` union in `src/lib/supabase/types.ts`

Same five string literals appended. Hand-maintained file, one-line change.

### 2.3 An untimed-attempt flag in mastery

This is the only *behavioural* change required, and it fixes a latent problem
that already exists.

`applyAttempt` folds every answer's `elapsedMs` into a rolling `avgMs`, and
`stageForFact` uses that mean to decide Gold and Blue. Modes with no clock feed
it wall-clock thinking time, which drags the mean up and can hold a fluent fact
at Silver. Toolbox Time has this problem today; Cable Run and Floor Plan would
make it worse, because a child *should* sit and think on a puzzle.

As shipped in `src/lib/game/mastery.ts` — `countsForSpeed` defaults to true, so
every existing caller is unaffected:

```ts
export function applyAttempt(
  stats: FactStats,
  input: { correct: boolean; elapsedMs: number; at?: Date; countsForSpeed?: boolean },
): FactStats {
  const countsForSpeed = input.countsForSpeed ?? true;

  // The mean is taken over speed-counted attempts only, which needs its own
  // counter: weighting it by `attempts` would let untimed answers dilute the
  // average even while being excluded from it.
  const speedAttempts = stats.speedAttempts + (countsForSpeed ? 1 : 0);
  const avgMs = countsForSpeed
    ? Math.round((stats.avgMs * stats.speedAttempts + input.elapsedMs) / speedAttempts)
    : stats.avgMs;

  // A non-speed attempt raises accuracy but never advances retention.
  const fluent = countsForSpeed && input.correct && input.elapsedMs <= FLUENT_MS;
}
```

`stageForFact` gained the matching guard: Gold and Blue now require
`speedAttempts > 0`, so a fact only ever practised untimed tops out at Silver
however accurate it is. A miss still resets retention whether timed or not.

`attempts` and `correct` still move, so untimed modes count toward accuracy and
can lift a fact off `none`/`bronze` — they simply can't *certify* fluency, which
is correct: fluency is a claim about speed, and an untimed mode didn't measure
speed. `RunPayload` grows an optional `speedCounts?: boolean` that `finishRun`
passes through to `recordMastery`.

| Mode | `speedCounts` |
|---|---|
| Cable Run | `false` |
| Floor Plan | `false` |
| Ute Rally | `true` |
| Scaffold Stack | `true` |
| The Tool-Off | `true` (turn clock is real, if generous) |

### 2.4 The practice hub list

Two places list modes, not one — `src/app/play/modes/page.tsx` holds a
hard-coded `MODES` array for the student hub, and `src/app/dashboard/modes/page.tsx`
holds a separate `MODE_LABELS` map for the parent dashboard. A mode added to
only the first shows up in the dashboard as a raw database key.

Both move to `lib/game/modes.ts` so there is one source of truth:

```ts
export const MODE_LABELS: Record<RunMode, string>;   // every runs.mode value
export const PRACTICE_MODES: readonly PracticeMode[]; // what the hub offers
```

**Status: done.** `src/lib/game/modes.ts` exists and both pages read from it.

---

## 3. Proposed file layout

All net-new. Mirrors the existing convention: rules in `lib/game`, screens in
`app/play`, interaction in `components/play`.

```
src/lib/game/
  cable-run.ts        board generation, legal-move rules, solver
  rally.ts            track generation, fork tables, opponent pacing
  tool-off.ts         duel state machine, rival roster, damage rules
  scaffold.ts         piece generation, balance model, speed ramp
  floor-plan.ts       room generation, tile catalogue, placement rules

src/app/play/modes/
  cable-run/page.tsx
  rally/page.tsx
  tool-off/page.tsx
  scaffold/page.tsx
  floor-plan/page.tsx

src/components/play/
  cable-grid.tsx
  rally-track.tsx
  duel-board.tsx
  scaffold-tower.tsx
  floor-grid.tsx
```

Each `lib/game/*.ts` module is pure and seeded — no React, no Supabase, no
`Date.now()` — so it is unit-testable and a session is reproducible from its
seed. This mirrors `questions.ts` / `mastery.ts` and is what makes the e2e
suite able to assert on a fixed board.

### Seeding

Reuse `makeRng(seed)` from `lib/game/questions.ts`. Seed format:
`` `${mode}-${studentId}-${YYYY-MM-DD}-${index}` ``. Same-day replays of a daily
board are therefore identical, which is what makes "beat your own time" honest.

---

## 4. Shared reward calibration

Existing anchors: a Quick Job pays ~60 coins for 10 questions; the Garage pays a
flat 10/correct; shop items run 90–2200 coins. New modes are calibrated to
**8–14 coins per fact actually recalled**, so no mode is the obviously
optimal grind. Modes that ask for more thinking per fact pay more per fact, not
more per minute.

| Mode | Facts / session | Target coins | Materials | Notes |
|---|---|---|---|---|
| Cable Run | 8–14 | 80–140 | 4–8 | + efficiency bonus, capped |
| Ute Rally | 20–30 | 140–260 | 6–10 | Placement bonus, not win-only |
| The Tool-Off | 12–20 | 110–200 | 5–9 | Win bonus + flawless bonus |
| Scaffold Stack | Unbounded | 6/floor, soft cap 300 | 1 per 5 floors | Endless: cap prevents grind |
| Floor Plan | 6–12 | 70–130 | 4–8 | + perfect-fit bonus |

Materials feed the house project via `bankMaterials`, unchanged.

**Daily caps.** Endless and repeatable modes (Scaffold, Cable Run, Floor Plan)
carry a soft daily coin cap, after which they still count for mastery and still
show scores but pay 25%. Rationale: the shop is the reward for playing, not the
reason to keep playing past the point of learning. The cap is a number in
`lib/game/*`, not a nag screen.

---

## 5. Accessibility floor

Non-negotiable, per mode:

- **Keyboard**: every board is arrow-key navigable with Enter to commit and Esc
  to cancel a selection. Focus order follows reading order of the board.
- **Screen reader**: each board cell has an accessible name of the form
  `"row 3, column 4, junction 42, reachable"`. Board state changes fire a polite
  live-region announcement; timer ticks never do.
- **`timer_mode`**: `standard` → spec values; `extended` → whatever
  `A11yProvider.resolveTimer` does, which is **×2** (not the ×1.5 these specs
  originally assumed — the code is the authority); `off` → the clock becomes a
  non-blocking counter and *nothing* fails on time. Each spec states what its mode becomes at `off`, because for a
  race that's a real design question, not a config value.
- **`reduced_motion`**: no parallax, no screen shake, no continuous motion.
  Movement becomes an instant state change with a 120 ms cross-fade.
- **`read_aloud`**: every prompt and every board-state change has a `spoken`
  string, in the same shape `Question.spoken` uses today.
- **`dyslexia_font`, `high_contrast`, `text_scale`**: boards must reflow at
  `text_scale: 2.0` without clipping. This constrains board sizes — noted in
  each spec where it bites.

---

## 6. Build status

All five are built. 133 unit tests, `tsc` and `eslint` clean, production build
routes every mode.

| Mode | Rules module | Tests | Route | Payout |
|---|---|---|---|---|
| Scaffold Stack | `lib/game/scaffold.ts` | 30 | `/play/modes/scaffold` | Server, from the answer log |
| Cable Run | `lib/game/cable-run.ts` | 25 | `/play/modes/cable-run` | Server, full replay |
| The Tool-Off | `lib/game/tool-off.ts` | 25 | `/play/modes/tool-off` | Server, full replay |
| Floor Plan | `lib/game/floor-plan.ts` | 31 | `/play/modes/floor-plan` | Server, full replay |
| Ute Rally | `lib/game/rally.ts` | 22 | `/play/modes/rally` | Server, routes verified |

### How the puzzle modes are paid

Cable Run, The Tool-Off and Floor Plan send **no answer log at all**. They send
the seed they were given and the moves they made; `finishRun` regenerates the
board from that seed and replays the moves, and both the payout *and* the
mastery log come out of the replay. A tampered client can claim an easier or
harder board, but it then has to actually solve that board.

Ute Rally is the one exception, because its questions are ordinary questions:
it sends answers like any timed mode, plus the road taken each leg. Those roads
are **verified** — each leg's questions are regenerated for the claimed road and
matched against the facts the answers cover, so claiming the dirt for triple
distance means having answered the dirt's questions. An unverified leg falls
back to the sealed rate rather than being thrown away.

This is why belt composition, road selection and shield factors are derived from
**unlock order rather than mastery weights**: the server must rebuild the exact
same content at submit time, and weights shift underneath a run. It's a real
loss of adaptivity, recorded in each spec, and the fix is to store the weight
snapshot alongside the run.

### Shared rules

`lib/game/economy.ts` holds the daily coin cap every repeatable mode uses: full
rate up to 300 coins per mode per day, a quarter beyond it, mastery unaffected.
It is also what stops a solved puzzle proof being resubmitted for the payout —
`runs` has no seed column to deduplicate against, and the cap bounds the same
behaviour without one.

### Unit tests

There was no unit-test runner in the repo — only Playwright. Rather than add a
framework, tests run on Node's built-in runner with native type stripping:

```bash
npm test        # node --import ./test/register.mjs --test "src/**/*.test.ts"
```

`test/ts-resolve.mjs` is a ~25-line resolver hook that teaches Node's ESM
resolver the two things the app's import style assumes and Node doesn't:
extensionless specifiers (`./questions`) and the `@/` path alias. No
dependencies were added.

### Blocked

1. **Migration 0002 has not been applied** to the Supabase project — the CLI
   isn't linked and `.env.local` carries only the publishable key, so it needs
   running by hand via the SQL editor or `npx supabase db push`. **Until then
   every run submission fails**, in existing modes too.
2. **The Playwright suite can't run** — `e2e/global-setup.ts` refuses to start
   because the Supabase project still has email confirmation ON. That's a
   pre-existing precondition of the suite, unrelated to these modes:
   Dashboard → Authentication → Providers → Email → turn off "Confirm email".
