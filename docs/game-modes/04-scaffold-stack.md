# 04 · Scaffold Stack

> **Every right answer is another plank. Put it on the wrong side and the whole
> lot starts leaning. How high can you get before it goes over?**

An endless stacking arcade. Answers earn planks; *where you put them* decides
whether the tower stands. The only mode in the app with no fixed length — it
ends when you fall, and the number that matters is how high you got.

- **Mode key**: `scaffold`
- **Session**: endless, typically 2–6 minutes, 25–80 facts
- **`speedCounts`**: `true`

---

## 1. Why it exists

Nothing in the app is currently *endless*. Every mode has a defined finish — 10
questions, 25 questions, 5 minutes — which is right for structured practice and
wrong for the thing children actually do voluntarily, which is chase a high
score. A run-to-failure loop with a personal best is the single most re-entered
shape in children's games, and the app doesn't have one.

Mathematically it's a **volume** mode: sustained recall with a slowly rising
tempo, which is the condition under which fluency actually consolidates. But
two mechanics keep it from being a flashcard treadmill:

- **Placement.** Each plank goes left or right of centre; the tower's lean is
  the running sum of that choice. The child is doing a light balance calculation
  continuously, underneath the arithmetic.
- **Commutativity as a real decision.** A plank's length is one factor of the
  fact you just answered — and you choose *which* factor (see §3.4). `6 × 8` can
  become a 6-plank or an 8-plank. That's the first time the app asks a child to
  do something with the fact that both readings are the same product.

---

## 2. The tower

```
   ┌─────────────────────────────────────┐
   │ SCAFFOLD STACK    height 14   ⚑ 21  │
   ├─────────────────────────────────────┤
   │              lean ◀──┼──▶           │
   │              [ ▁▁▃▃▁ ]  tilt +2     │
   │                                     │
   │         ░░░░░░████                  │  ← 14
   │       ░░░░████████                  │
   │         ░░░░░░████████              │
   │     ░░░░░░░░████                    │
   │       ░░░░████████████              │
   │  ═══════════════════════            │  base
   ├─────────────────────────────────────┤
   │             8 × 7                   │
   │        ┌───┐ ┌───┐ ┌───┐ ┌───┐      │
   │        │ 48│ │ 56│ │ 54│ │ 63│      │
   │        └───┘ └───┘ └───┘ └───┘      │
   ├─────────────────────────────────────┤
   │  place:   [ ◀ LEFT ]   [ RIGHT ▶ ]  │
   └─────────────────────────────────────┘
```

- **Height**: planks placed. The score.
- **⚑**: personal best on this student profile.
- **Tilt meter**: the running lean, `-6 … +6`. At `±6` the tower falls.
- The tower is drawn as stacked planks offset by their placement, so the lean is
  visible in the structure itself, not only in the meter.

---

## 3. Rules

1. A question appears. Answer it.
2. **Correct** → you get a plank and choose **LEFT** or **RIGHT**.
   **Wrong** → no plank, and the tower **wobbles**: tilt moves 1 further in
   whichever direction it's already leaning. (A wrong answer is never free, but
   it never ends the run outright either.)
3. **Tilt** updates by the plank's *weight*:
   - Placing on the light side moves tilt toward centre by 1.
   - Placing on the heavy side moves it away by 1.
   - The plank's **length** (§3.4) doesn't change tilt — it changes score.
4. **Plank length**: after a correct answer to `a × b`, the child picks one of
   the two factors to be the plank's length. Longer plank = more points, but a
   plank longer than 8 also **adds 1 to the tilt magnitude** — big planks are
   top-heavy. So `8 × 7`: take the 7 for safety, the 8 for score.

   *As built*: length and side are **one tap, not two** — the placement panel is
   a 2×2 of `◀ 7 / 7 ▶ / ◀ 8 / 8 ▶`. This resolves open question §12.1 before it
   could bite: at 3.5 s per question, three sequential decisions was one too
   many. The 2-second length auto-choose in §9 is consequently gone, and
   placement is untimed — the tempo lives entirely in the questions, and the
   pause between them is a legitimate breather.
5. **Tempo ramp**: the per-question timer starts at 8 s and drops by 0.25 s
   every 5 planks, floor 3.5 s. Timeout = a wrong answer (wobble, no plank).
6. **Steadying**: every 10 planks, a **brace** is offered instead of a question —
   tap it to pull tilt 2 toward centre. Free, but it costs the plank that turn.
   A real decision at high tempo.
7. **Run ends** when `|tilt| ≥ 6`. The tower topples, the height is recorded, and
   the best-ever marker is drawn on the ruined pile if beaten.
8. **One retry tap.** The results screen's primary button is *Go again*, seeded
   fresh. This mode is meant to be re-entered immediately.

### The tilt model, stated exactly

```ts
// src/lib/game/scaffold.ts   (proposed)

export type Tower = { height: number; tilt: number; planks: Plank[] };
export type Plank = { length: number; side: "left" | "right" };

export function place(tower: Tower, plank: Plank): Tower {
  const towardCentre =
    (tower.tilt > 0 && plank.side === "left") ||
    (tower.tilt < 0 && plank.side === "right") ||
    tower.tilt === 0;

  let tilt = tower.tilt + (towardCentre ? -1 : 1) * Math.sign(tower.tilt || 1);
  if (plank.length > 8) tilt += Math.sign(tilt || 1);      // top-heavy
  return { height: tower.height + 1, tilt, planks: [...tower.planks, plank] };
}

export function wobble(tower: Tower): Tower {
  return { ...tower, tilt: tower.tilt + Math.sign(tower.tilt || 1) };
}

export const TOPPLE_AT = 6;
```

Pure, synchronous, no randomness — the whole run replays from
`(seed, moves[])`, which is what makes the leaderboard honest and the tests
cheap.

---

## 4. Question selection

The ramp needs the questions to get *harder* as well as faster, or the mode
becomes a reflex test on the two-times table.

| Height | Source |
|---|---|
| 1–10 | Strongest tables, multiple choice |
| 11–25 | All unlocked tables, weighted by `practiceWeight`, multiple choice |
| 26–45 | Same, typed entry |
| 46+ | Weakest tables and division (where unlocked), typed entry |

Selection reuses `generateQuestionSet` with a rolling window — questions are
generated 5 ahead, not all at once, since the run has no known length.

---

## 5. Answers emitted

One per question, standard shape. Timeouts record as wrong with
`elapsedMs` = the timer duration.

The plank-length choice (§3.4) is **not** an answer record. It's a strategy
decision, and the child already demonstrated the fact by answering. Recording it
would double-count.

Because runs are unbounded, the submitted `answers[]` needs a ceiling — but the
ceiling is a sanity bound, not a truncation anyone should hit. *As built*: 500,
not the 200 first specified. The reason is that height is paid and recorded
**only** from answers the log can prove, so a truncated log would understate a
real record — 500 planks is over half an hour of unbroken correct answers at the
floor tempo, which is the right place to stop believing the client.

---

## 6. Economy

| Component | Coins |
|---|---|
| Per plank placed | 6 |
| Height milestone (every 10) | +15 |
| New personal best | +50 |
| Toppled below height 5 | 0 (below the floor — nothing to pay for) |

Materials: `1` per 5 planks, capped at 12 per run.

**Daily soft cap: 300 coins.** Past it, the mode still runs, still records
mastery, and still tracks the personal best — it just pays 25%. Stated plainly
on the results screen as *"Nice work — coins are capped for today, but the
record still counts"*. An endless mode without a cap is an invitation to grind
the shop instead of learning, and the cap is a number in `lib/game/scaffold.ts`,
not a lockout.

---

## 7. Feel

This mode lives or dies on the fall, so:

- **The topple is the payoff, not the punishment.** Planks tumble, dust, a
  clatter, and the height number stays on screen the whole way down. It should
  be a little bit funny.
- **Near-miss tension**: at `|tilt| ≥ 4` the tower creaks (audio), the tilt meter
  gains a pulsing edge, and the placement buttons enlarge. The child should feel
  the danger a couple of planks before it happens.
- Placement animates over 180 ms and the camera pans up every 5 planks so the
  tower keeps growing off the top of the screen.
- Personal best is drawn as a **ruler line** across the tower. Passing it is a
  distinct sound and a brief flash of the flag.
- **`reduced_motion`**: no camera pan (the tower scales to fit), no tumble — the
  tower is replaced by a static rubble state with the height called out. Creak
  becomes a static "LEANING" label. Nothing that pulses.

---

## 8. Accessibility

- **Keyboard**: number keys / arrows answer as in the existing runner; then
  `←`/`→` place the plank; `1`/`2` pick the plank length; `B` uses a brace.
- **Screen reader**: after each placement, `"Height 14, leaning right, 2 of 6"`.
  The lean is announced as a fraction of the topple threshold, so a non-visual
  player has exactly the information the meter gives.
- **Tilt is never colour-only**: it's a numeric readout, a labelled direction,
  and the tower's own visible offset.
- **`timer_mode: extended`** → the app's own `resolveTimer` doubles every clock,
  so the ramp runs 16 s down to a 7 s floor. The ramp itself is defined once in
  `timerSecondsFor` and the preference is applied on top, rather than the mode
  carrying a second set of numbers to keep in sync.
- **`timer_mode: off`** → **the ramp becomes plank-count-based instead of
  time-based**: there's no timer at all, and difficulty escalates purely through
  the source table progression in §4. The run still ends by toppling. This keeps
  the mode's identity (endless, high score) without a clock, which matters
  because this is the most re-entered mode in the set and excluding
  timer-off children from it would be a real loss.
- **`text_scale`**: the tower graphic yields space to the question and buttons
  above 1.4× — the tower can shrink, the question cannot.

---

## 9. Edge cases

| Case | Behaviour |
|---|---|
| Tilt is 0 and the child places | Tilt moves to ±1 in the placed direction. There's no perfectly neutral plank; the tower is always leaning slightly, which is what keeps the decision live. |
| First question answered wrong | Wobble from tilt 0 → tilt 1. No plank. Cannot topple from a single early mistake. |
| Very long run (500+ planks) | Timer is at the floor and questions are at the hardest tier; the mode is stable but the answer submission caps at 200 (§5). Consider a 999 display cap. |
| Child never chooses a plank length | Not reachable as built — length and side are a single tap (§3.4), and placement is untimed. Keyboard users who press an arrow without picking a factor get the shorter, safer one. |
| App backgrounded | Run pauses immediately. Resumes with a 3-2-1 count. A backgrounded tower does not fall. |
| Network fails at submit | Height and personal best are held locally and shown; the payload retries. A record must never be lost to a dropout. |
| Only one table unlocked | Plays fine — §4's tiers all collapse to that table, and the ramp comes from tempo alone. |

---

## 10. Proposed files (net-new)

```
src/lib/game/scaffold.ts               tilt model, ramp, question tiers, caps
src/app/play/modes/scaffold/page.tsx   server: unlocks, weights, personal best
src/components/play/scaffold-tower.tsx client: tower, placement, question host
```

Personal best needs somewhere to live. Options, in preference order:

1. Derive it: `max(runs.questions)` where `mode = 'scaffold'` — **no schema
   change at all**, and `runs` already indexes by student and finish time.
   Height ≈ correct answers, so store height as `runs.correct` and read it back.
2. A `student_records` table, if other modes later want the same thing.

Option 1 is specified. Adding a table for one integer would be the wrong trade.

---

## 11. Test plan

- **Tilt model** (unit, exhaustive over tilt ∈ [-6, 6] × side × length bands):
  `place` and `wobble` produce the documented values; `TOPPLE_AT` is reachable
  from every state in a bounded number of moves.
- **Replay determinism**: `(seed, moves[])` reproduces an identical run.
- **Ramp**: timer at height 5 is 7.75 s, at height 100 is the 3.5 s floor;
  `timer_mode: off` produces no timer at any height.
- **Caps**: coins pay full to the daily line and a quarter beyond it, while
  mastery keeps recording and the personal best still counts.
- **e2e**: fixed seed, keyboard-only run to a scripted topple, assert height on
  the results screen and one `finishRun` call.

---

## 12. Open questions

1. ~~**Is the plank-length choice one decision too many at high tempo?**~~
   **Resolved in the build**: length and side collapsed into a single tap on a
   2×2 panel, so the child makes one decision, not three. Still worth watching
   in playtest whether four buttons is too much to read at the floor tempo — the
   fallback is to drop to two buttons and auto-assign the larger factor.
2. **Should braces be bankable?** Holding up to 2 braces would add planning. It
   also adds inventory UI. Currently: use it or lose it.
3. **Leaderboards.** Height begs for a crew leaderboard, but cross-family
   visibility is deliberately narrow (`crew_roster` exposes name, avatar, rank —
   nothing else). Any leaderboard here must go through that view and would need
   height added to it, which is a real privacy decision and is explicitly **out
   of scope** for this spec. Personal best only, for now.
