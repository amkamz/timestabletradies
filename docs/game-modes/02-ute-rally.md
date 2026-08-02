# 02 · Ute Rally

> **Loaded up and heading to site. Four utes, one dirt road, and a shortcut that
> only pays off if you can hold your nerve on the sevens.**

A head-to-head race where the questions drive a vehicle down a track, and every
few hundred metres the road forks: the sealed road is easy and slow, the dirt
shortcut is harder and faster. Speed matters, but *choosing* matters more.

- **Mode key**: `rally`
- **Session**: one race, 20–30 questions, 2.5–4 minutes
- **Opponents**: linked crew if present, simulated crew otherwise (labelled)
- **`speedCounts`**: `true`

---

## 1. Why it exists

Crew Race already exists and is a pure fluency footrace: fastest answers win.
That's a good mode and this doesn't replace it. But a footrace has one problem
for the child who is currently *fourth* — once the field pulls away, there is no
decision left to make and no reason to keep answering carefully.

Forks fix that. A trailing player can take the dirt road and claw back real
distance; a leading player has to decide whether to defend or coast. That means:

- The race stays live to the last 20 seconds for everyone, which is the whole
  point of racing.
- The child appraises their *own* fluency — "am I good enough at eights to take
  this?" — which is metacognition, and is the thing that makes practice
  self-directing later.
- The hard route concentrates weak facts on a child who *volunteered* for them,
  which is a far better teaching position than a scheduler forcing them.

---

## 2. The track

```
   ┌───────────────────────────────────────┐
   │  UTE RALLY            ⏱ 1:42          │
   ├───────────────────────────────────────┤
   │                                       │
   │  🚚 Brickie Nifty Trowell  ████████░░ │  ← practice crew
   │  🛻 YOU                    ██████████ │
   │  🚙 Sparky Brisk Boltz     ███████░░░ │
   │  🚛 Tiler Tidy Grouting    ████░░░░░░ │
   │                                       │
   ├───────────────────────────────────────┤
   │            FORK AHEAD                 │
   │  ┌─────────────────┐ ┌──────────────┐ │
   │  │  SEALED ROAD    │ │ DIRT SHORTCUT│ │
   │  │  ×2 ×5 ×10      │ │  ×7 ×8       │ │
   │  │  +1 length      │ │  +3 lengths  │ │
   │  └─────────────────┘ └──────────────┘ │
   │        4 · 3 · 2 · 1 …                │
   └───────────────────────────────────────┘
```

Between forks the screen is the ordinary question runner with a track strip
across the top. The fork panel takes over for **4 seconds**, then auto-picks the
sealed road if nothing is chosen. Never blocks.

---

## 3. Rules

1. The race is **6 legs**. Each leg is 4 questions.
2. A correct answer moves your ute forward by the leg's **speed value**; a wrong
   answer moves it 0 and costs no time beyond the question itself. There is no
   punishment lane, no spin-out, no going backwards. Falling behind is enough.
3. Between legs, a **fork**:
   - **Sealed road** — questions drawn from the child's strongest 3 unlocked
     tables (lowest `practiceWeight`). Speed value **1**.
   - **Dirt shortcut** — questions drawn from their weakest 2–3 tables (highest
     `practiceWeight`), or division if unlocked. Speed value **3**.
4. **The shortcut's catch**: the dirt only banks if the whole leg is clean.
   Four right pays 12 lengths; three right pays nothing.

   *As built, and this is a correction to the spec.* The original catch — a
   wrong answer repeats the table — turned out not to be a catch at all. With
   three lengths per correct answer against one, the dirt is strictly better at
   **every** accuracy: `3 × correct > 1 × correct` always holds, so a "fork"
   with no downside is a fork in name only, and §3's claimed crossover at 65%
   was never justified by the arithmetic. The simulation in
   `rally.test.ts` fails loudly if this drifts again.

   All-or-nothing puts the crossover where it was supposed to be. Expected
   lengths per leg at accuracy `p` are `4p` sealed and `12p⁴` dirt, which cross
   at `p³ = ⅓`, i.e. **≈69%** — measured at 60–80% in the test's binomial
   simulation. Below that the sealed road genuinely banks more; above it the
   gamble genuinely pays. The child now has a real judgement to make about
   their own fluency, which was the entire point of the mechanic.

   It's a harsher rule than the original, and deliberately so: the dirt is a
   gamble the sealed road always stands next to.
5. The race ends when the last leg's questions are answered. Position is by
   distance travelled, ties broken by total correct, then by average time.
6. **No sudden death, no elimination.** Everyone finishes and everyone sees
   their own distance and their best previous distance on the same track seed.

### Speed values, worked

A perfect sealed run = 24 lengths. A perfect dirt run = 64 (the first leg is
always sealed). A child at 60% on their weak tables who takes the dirt every
time banks ≈ 8 — well behind a flawless sealed run, and behind a competent
sealed run too.

That's the intended shape: **the risky route is the better play for a child who
is close to fluent, and a genuine mistake for one who isn't.** The crossover
sits at ≈69% accuracy, asserted in `rally.test.ts`.

---

## 4. Opponents

Reuses `lib/game/crew.ts` exactly as it stands: `simulatedCrew(seed, 3)` gives
three racers with `paceMs` 2200–5000 and accuracy 0.72–0.98, and
`simulatedProgress` converts elapsed time into questions completed.

Extension needed for forks (proposed, in the new `lib/game/rally.ts`, not in
`crew.ts`):

```ts
/** Simulated racers take the shortcut in proportion to their own accuracy. */
export function botTakesShortcut(rng: () => number, racer: Racer, leg: number): boolean {
  // Confident bots gamble more; the slowest bot almost never does, so a
  // struggling child always has someone plausibly behind them.
  return rng() < (racer.accuracy - 0.6) * 1.6;
}
```

**Rubber-banding: none.** The bots do not slow down when the child is behind.
Instead, the *field is composed* so someone is beatable: the seed always
includes one racer with `paceMs > 4200`. Faking a comeback is a lie the child
eventually spots; a genuinely slower opponent is not.

All simulated racers carry `simulated: true` and are labelled **"practice crew"**
in the UI, per the existing convention.

---

## 5. Question selection

```ts
// src/lib/game/rally.ts   (proposed)

export type Leg = {
  index: number;
  route: "sealed" | "dirt";
  speed: 1 | 3;
  questions: Question[];
};

export function buildLeg(opts: {
  seed: string;
  leg: number;
  route: "sealed" | "dirt";
  tables: number[];
  divisionUnlocked: number[];
  weightFor: (a: number, b: number) => number;   // from mastery.practiceWeight
}): Leg;
```

Sealed legs draw on the earliest-unlocked tables; dirt legs draw on a single
late-unlocked one and use `withChoices: false` — typed entry, which is both
harder and faster for a fluent child.

The first leg is always sealed and always fork-free, so the race starts before
the child has to make a decision.

**As built: curriculum position stands in for mastery weighting.** The roads are
selected from the unlock order rather than from `practiceWeight`, because the
server has to rebuild a leg's questions to *verify* which road was driven — and
mastery weights change between the page load and the submission, which would
make an honest run fail verification. Unlock order is a decent proxy (tables
unlock in teaching order, so the latest are the least practised), but it is a
proxy. Making this properly adaptive means storing the weight snapshot with the
run; that's the follow-up, and it applies to [The Tool-Off](03-the-tool-off.md)
too.

---

## 6. Answers emitted

One per question, exactly as the existing runner already emits. No mapping
subtlety here — this mode's novelty is in selection and pacing, not in what an
answer is. `elapsedMs` is real and `speedCounts: true`.

The `runs` row carries `table_no: null` (mixed) and `operation: "both"` when any
dirt leg used division.

---

## 7. Economy

| Component | Coins |
|---|---|
| Per correct answer | 6 |
| Distance bonus | `lengths travelled × 1.5` |
| Finish 1st / 2nd / 3rd / 4th | 60 / 40 / 25 / 15 |
| ~~Beat your own best on this track seed~~ | *Not built* — distance isn't stored on `runs`, and a column for one bonus wasn't worth it. Revisit with the Scaffold record work. |

Materials: `6 + floor(lengths / 12)`, capped at 10.

Two deliberate choices:

- **Fourth place still pays 15.** Losing a race to a bot must not feel like a
  wasted three minutes, or children stop entering.
- **Distance pays more than placing.** The dominant strategy is to play your own
  race well, not to hope the field is slow.

---

## 8. Feel

- Utes are side-on silhouettes on a horizontal strip; position updates are
  animated over 300 ms so overtakes are legible.
- **Dust plume** behind whoever's leading — the one piece of pure showmanship.
  Suppressed under `reduced_motion`.
- The fork panel has a **4-second ring countdown** plus a numeric count. It is
  the only pressure moment that isn't a question, and it should feel like one.
- Taking the dirt road plays a gear-change sound and the strip texture changes
  from smooth to gravel. Route is signalled by texture *and* a label, never
  colour alone.
- **No taunting.** Reactions at the end come from the existing fixed `REACTIONS`
  vocabulary in `crew.ts` — there is no free text anywhere.

---

## 9. Accessibility

- **`timer_mode: extended`** — per-question time ×1.5 and the fork panel gets
  6 seconds. Speed values are unchanged, so the race remains meaningful.
- **`timer_mode: off`** — this is the interesting one. The race becomes a
  **rally against distance, not against a clock**: the bots still advance on
  their own `paceMs`, but the child's questions never expire and their ute
  advances on correctness alone. A child who is slow but accurate can still take
  the shortcut and win on lengths. The mode is *not* hidden and is *not*
  converted to solo practice — being excluded from the racing mode is exactly
  the outcome an accessibility setting must not produce.
- **Screen reader**: position announced at each fork only
  (`"After leg 3: you are 2nd, 18 lengths"`), never per question — continuous
  position announcements would drown the questions.
- **Fork panel** is a native radio group; arrow keys + Enter; the auto-pick
  timeout is announced (`"Sealed road chosen by default"`).
- **`reduced_motion`**: utes jump to position, no dust, no gravel shimmer.
- The dirt-road repeat rule (§3.4) is announced when it triggers:
  *"Same table again — 8 × 7."*

---

## 10. Edge cases

| Case | Behaviour |
|---|---|
| Fewer than 3 unlocked tables | Fork offers "steady" vs "quick" on the *same* tables, differing only in choice-vs-typed entry and speed 1 vs 2. Mode still available. |
| No division unlocked | Dirt legs are multiplication from weak tables. Unchanged otherwise. |
| Child gets every dirt question wrong | The leg banks nothing and the next fork comes round. They lose ground, they don't lose the race — and the sealed road is right there. *The spec's "repeat the table until you get it right" rule was not built*: it makes the question sequence depend on the child's answers, which stops the server from regenerating the leg to verify the road. |
| Real crew present but one drops out mid-race | Their ute finishes on their last known pace and is marked *"left the site"*. No forfeit, no waiting. |
| App backgrounded mid-race | Race pauses; on return, a 3-2-1 countdown resumes. Bots do **not** advance while backgrounded. |
| Network fails at submit | Answer log is held in memory and retried once; on second failure the results screen shows *"saved when you're back online"* and the payload is queued. Never lose a completed race. |

---

## 11. Proposed files (net-new)

```
src/lib/game/rally.ts                 legs, forks, speed values, bot fork policy
src/app/play/modes/rally/page.tsx     server: unlocks, mastery weights, seed, crew
src/components/play/rally-track.tsx   client: strip, fork panel, question host
```

The question-presentation layer should reuse `components/play/runner.tsx`'s
question/keypad internals rather than reimplementing them — the cleanest path is
to extract the question body from `Runner` into a `QuestionCard` and have both
use it. That refactor is a change to an existing file and is therefore
**deferred**, not done here.

---

## 12. Test plan

- **Crossover maths**: simulate 10 000 races across accuracy bands; assert the
  dirt road becomes the higher-expected-value choice between 60% and 70%
  accuracy. This is the mode's central tuning claim and should fail loudly if
  the speed values drift.
- **Field composition**: every seed produces at least one racer with
  `paceMs > 4200`.
- **Repeat rule**: two wrong on the same fact → third presentation has `choices`.
- **`timer_mode: off`**: a scripted slow-but-perfect run still finishes and can
  place 1st on lengths.
- **e2e**: fixed seed, take the dirt road at every fork, assert final distance
  and a single `finishRun` call with 24 answers.

---

## 13. Open questions

1. ~~**Is 4 seconds long enough to choose a fork?**~~ Built at **6 seconds**
   flat, on the reasoning that a 7-year-old reading two labels with table lists
   on them needs longer than a reflex window, and that the fork is a judgement
   rather than a reaction. Worth measuring; dropping to 4 s for experienced
   players is still the obvious refinement.
2. **Should the shortcut ever be strictly wrong?** Currently a fluent child
   should always take it, which flattens the decision at the top end. A fuel or
   stamina resource would fix it, at the cost of a second thing to explain.
   Left out on purpose; revisit if playtests show it's degenerate.
3. **Should real crew see each other's route choice live?** Fun, but it invites
   copying rather than self-appraisal. Currently: routes revealed at the fork's
   end, not during.
