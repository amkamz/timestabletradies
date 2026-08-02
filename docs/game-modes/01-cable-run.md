# 01 · Cable Run

> **Sparky's got one roll of cable and a switchboard to reach. Pick the right
> junctions or you'll run out halfway up the wall.**

A grid-routing puzzle. Untimed, undoable, and solvable by thinking rather than
by being fast — the mode for the child who freezes when a clock appears.

- **Mode key**: `cablerun`
- **Trade skin**: Electrical (×8 zone), but plays on any unlocked tables
- **Session**: one board, 8–14 committed moves, typically 3–6 minutes
- **`speedCounts`**: `false`

---

## 1. Why it exists

Every shipped mode asks "what is 7 × 6?" and takes a number back. Division
questions are presented the same way — `42 ÷ 7` is still a prompt with one
answer to type. Nothing in the app currently asks the child to hold a number and
work out *which* operation gets them somewhere.

Cable Run makes the fact into a move. You are standing on **6**, you are holding
a `×7` connector, and there are four junctions next to you: 42, 48, 13, 36. You
have to compute forwards to know where you're allowed to step. Then, two steps
later, you're standing on 42 holding a `÷6` and the same machinery runs
backwards. It is the same fact family, exercised from both ends, with a spatial
consequence attached.

The second thing it trains is **planning under a budget**. The cable roll is
finite, so the greedy move is often wrong; the child has to look one or two
junctions ahead. That's the part that makes a puzzle mode hold attention across
sessions, and it's why the board is generated with decoy paths that are legal
but dead-ended.

---

## 2. The board

```
                    ┌──────────────────────────────┐
                    │  CABLE RUN        ⚡ 5 left  │
                    ├──────────────────────────────┤
                    │                              │
    switchboard →   │   [72]  [12]  [96]  [ 8]     │
                    │     │                        │
                    │   [ 9]──[36]  [ 4]  [45]     │
                    │            │                 │
                    │   [24]   [ 6]══[42]  [18]    │
                    │            ║      ▲          │
                    │   [ 3]══[ 2]      you        │
                    │     ▲                        │
                    │   meter box                  │
                    │                              │
                    ├──────────────────────────────┤
                    │  CONNECTORS                  │
                    │  ┌──────┐ ┌──────┐ ┌──────┐  │
                    │  │  ×7  │ │  ÷6  │ │  ×2  │  │
                    │  └──────┘ └──────┘ └──────┘  │
                    ├──────────────────────────────┤
                    │  [ ↶ Undo ]      [ Restart ] │
                    └──────────────────────────────┘
```

- **Grid**: 4×4 (Easy), 5×5 (Standard), 5×6 (Hard). Each cell is a *junction*
  holding a number.
- **Meter box**: the start cell, always on the bottom row. The player token sits
  here at the start, and the token's **current value** is the meter box's number.
- **Switchboard**: the goal cell, always on the top row, drawn with a distinct
  shape and a `⚡` glyph (not just a colour).
- **Cable**: the drawn path so far. Doubled lines `══` are laid cable; it is
  visible at all times, which is what lets the child reason about their own
  route.
- **Connectors**: a hand of three cards, each an operator + operand
  (`×n` or `÷n`). Replenished from the deck as they're used.
- **Cable remaining**: the move budget, shown as a count and as a shrinking
  spool. Both, always.

---

## 3. Rules

1. The token has a **current value**, starting at the meter box's number.
2. To move, the player selects a **connector card** and then an **orthogonally
   adjacent junction** (or the reverse order — both interaction orders are
   accepted, since children do this differently).
3. The move is **legal** iff `apply(card, currentValue) === junction.value`.
   - `×n` → `currentValue × n`
   - `÷n` → `currentValue ÷ n`, legal only if it divides exactly
4. A legal move: the token advances, cable is drawn, the card is spent and
   replaced, **cable remaining decreases by 1**, and the junction's value becomes
   the new current value.
5. An illegal move: the junction shakes (or flashes, under `reduced_motion`),
   a short line says why — *"6 × 7 is 42, and that junction is 48"* — and
   **cable is not spent**. The attempt *is* recorded as a wrong answer.
6. **Undo** rewinds one move and refunds the cable. Undone moves stay in the
   answer log — they happened.
7. The board is won when the token reaches the switchboard with cable remaining
   ≥ 0.
8. The board is lost when cable hits 0 without reaching the switchboard, **or**
   when no legal move exists from the current position with the current hand.
   Losing offers *Restart* (same board) or *New board*.
9. Division connectors only appear for tables where the student's
   `division_unlocked` is true.

10. **The mode requires at least one division-unlocked table**, and is shown
    locked until then.

    *As built, and a correction to §10's "no division → the deck is all ×".*
    That fallback can't work. Every move has to be a fact the mastery grid can
    store, and `fact_mastery` holds `(a ≤ 99, b ≤ 12)` — so a multiplication
    step needs its operand at 12 or under. From a product like 42 there is no
    legal multiply left; the only way onward is to divide back down. A
    multiplication-only route therefore dead-ends after one hop, and the
    "escalating" alternative would record facts like `2 × 32`, which the
    database rejects outright and which aren't times-table facts anyway.

    Gating is the honest resolution and it costs little: division unlocks after
    one full multiplication round on any table, which is early. The locked
    screen says so and points at the job board.

### Why illegal moves are cheap but recorded

The child isn't punished for exploring (no cable spent), but the wrong idea is
logged as a wrong attempt for that fact, so mastery sees it. This is the honest
version: they genuinely believed 6 × 7 was 48 for a moment. Silently discarding
that would make the mastery grid optimistic.

---

## 4. Board generation

Generate the solution first, then hide it. This guarantees solvability without
needing a solver at runtime — the solver exists only in tests.

```ts
// src/lib/game/cable-run.ts   (proposed, not written)

export type Junction = { row: number; col: number; value: number };
export type Connector = { op: "multiply" | "divide"; n: number };
export type Board = {
  seed: string;
  size: { rows: number; cols: number };
  junctions: Junction[];
  start: { row: number; col: number };
  goal: { row: number; col: number };
  deck: Connector[];          // ordered; hand of 3 drawn off the top
  cable: number;              // budget
  parLength: number;          // solution length, for the efficiency bonus
};

export function generateBoard(opts: {
  seed: string;
  tables: number[];
  divisionUnlocked: number[];
  difficulty: "easy" | "standard" | "hard";
}): Board;
```

Algorithm:

1. Pick grid size from difficulty; pick a start cell on the bottom row and a
   goal cell on the top row, at Manhattan distance ≥ `rows + 1`.
2. **Walk a solution path** of length `L` (6 / 8 / 10 by difficulty) from start
   to goal, orthogonal steps, no revisits.
3. Seed the start value: a small number from the unlocked tables (2–12).
4. For each step along the path, choose a connector:
   - Prefer `×n` where `n` is an unlocked table and the product stays ≤ 144.
   - Insert a `÷n` roughly every third step where the current value permits an
     exact division and the table is division-unlocked. This is what keeps the
     route from being a runaway escalation to four digits.
   - Write the resulting value into that junction.
5. **Fill the remaining junctions with decoys.** Decoy values are near misses —
   off-by-one multiples and transposed factors. A decoy must never accidentally
   be reachable by the *same* card that reaches the true next cell (checked and
   re-rolled).

   *As built, one exemption:* the junction you just came from **may** carry the
   value the correct card produces. Routes oscillate — `8 ×2 → 16 ÷2 → 8` is
   ordinary, and with a small unlocked set it's close to unavoidable — so
   forbidding it made generation fail outright for students with two or three
   tables. It also isn't a trap: the laid cable is drawn on the board, so
   stepping back is a visibly wasteful choice rather than a hidden wrong answer.
   The invariant the generator actually holds is "exactly one **uncabled**
   junction matches", and that's what the property test asserts.
6. **Plant one attractive trap**: exactly one decoy is reachable by a card in the
   opening hand and leads to a cul-de-sac 2 moves deep. This is the reason the
   budget matters.
7. **Deck**: the solution's connectors, shuffled together with 3–5 spares, such
   that the solution's cards are always drawable in an order that works. Verified
   by the test-only solver.
8. **Cable budget** = `parLength + slack`, slack = 3 / 2 / 2 by difficulty.

### Difficulty selection

Not chosen by the child on a menu.

*As built:* the tier comes from how many tables are unlocked — under 4 is easy,
under 8 standard, otherwise hard. The spec's per-student promotion ladder (two
wins at par bumps you up, two losses drop you) needs somewhere to store the
tier, and no table holds it yet. Unlock count is a reasonable stand-in and
needs no schema; the ladder is a follow-up, and `student_tables` or a small
`student_mode_state` row is where it would live.

---

## 5. States

```
       ┌─────────┐  tap Start   ┌──────────┐
       │ Briefing│ ───────────► │ Routing  │◄──────┐
       └─────────┘              └────┬─────┘       │ undo / illegal move
                                     │             │
                    reached goal ────┤             │
                                     ▼             │
                              ┌──────────────┐     │
                              │  Circuit on  │     │  cable = 0 or stuck
                              └──────┬───────┘     │        │
                                     │             │        ▼
                                     │        ┌────┴──────────────┐
                                     │        │  Out of cable     │
                                     │        │ [Restart][New]    │
                                     ▼        └───────────────────┘
                              ┌──────────────┐
                              │   Results    │  → finishRun
                              └──────────────┘
```

**Circuit on** is the payoff beat: the whole route lights up junction by junction
from the meter box to the switchboard, the switchboard glyph fills, and the
lights come on in the placeholder house art. Under `reduced_motion` the route
fills in one 120 ms step. It's short — 1.2 s — because it plays every session.

---

## 6. Answers emitted

One entry per **committed move attempt**, legal or not:

```ts
{ a: <the table used>, b: <the other factor>, operation, correct, elapsedMs }
```

Mapping a move to a fact:

| Move | Fact recorded |
|---|---|
| value 6, card `×7`, correct | `a: 7, b: 6`, `multiply`, correct |
| value 6, card `×7`, tapped 48 | `a: 7, b: 6`, `multiply`, **incorrect** |
| value 42, card `÷6`, correct | `a: 6, b: 7`, `divide`, correct |

`elapsedMs` is measured from when the board last settled to when the junction
was committed, and is submitted for completeness — but with `speedCounts: false`
it does not enter `avgMs` (see the [integration contract](00-integration-contract.md#23-an-untimed-attempt-flag-in-mastery)).
A child staring at a routing puzzle for 40 seconds is doing the mode correctly
and must not be recorded as slow at 7 × 6.

---

## 7. Economy

| Component | Coins |
|---|---|
| Circuit completed | 80 |
| Efficiency: finished at par length | +30 |
| Efficiency: finished with ≥ 1 cable spare but over par | +15 |
| Clean run: zero illegal moves | +20 |
| Board lost | 0, but mastery still records |

Materials: `4` (easy) / `6` (standard) / `8` (hard) on completion, 0 on a loss.

Restarting the same board is free to attempt. *As built*, the "pays once per
seed" rule is enforced by the **daily coin cap** rather than by remembering
seeds: `runs` has no seed column, and the cap already bounds exactly the
behaviour the rule was aimed at — replaying a solved route for the payout.
Past the cap the mode keeps recording mastery and pays a quarter.

---

## 8. Feel

- **Sound**: a soft click per junction, a rising three-note run on connection,
  a low *bzzt* on an illegal move. All respect the device mute; no music bed.
- **Haptics**: light tick on legal move, double tick on illegal (mobile only).
- **The spool** visibly shrinks — the budget must be felt, not read.
- **Trap junctions do not look different.** The tension of the mode is entirely
  in the arithmetic. Nothing about the art tells you which cell is a decoy.

---

## 9. Accessibility

- **Keyboard**: arrows move a focus ring around the grid; `1`/`2`/`3` select a
  connector; Enter commits the focused junction; Esc deselects the card; `U`
  undoes.
- **Screen reader**: junctions announce
  `"row 2, column 3, junction 42, adjacent, reachable with card 1"`. Reachability
  is announced only for cells adjacent to the token, so it isn't a solver.
- **Live region**: `"Connected to 42. 4 lengths of cable left."`
- **Colour**: laid cable is a doubled line, not a hue. The goal has a `⚡` glyph.
  Illegal feedback is a shake + text, never a red-only flash.
- **`text_scale: 2.0`**: at 2× the 5×6 grid can't fit a phone width. Above 1.6×
  the grid switches to a scrolling board with a persistent mini-map of the token
  position, and the hard tier is capped at 5×5.
- **Timers**: there are none. `timer_mode` has no effect here, which is exactly
  why this mode should be surfaced first to children whose parent has set
  `timer_mode: off`.

---

## 10. Edge cases

| Case | Behaviour |
|---|---|
| Two tables and one division unlocked | The minimum the mode runs on, and it does: verified at 60/60 seeds across all three sizes. |
| No division unlocked | The mode is locked, with a screen saying why (§3.10). |
| Value would exceed 144 | Generator rejects that step and re-rolls the connector. Hard ceiling: no junction over 144. |
| A step lands somewhere with no way onward | Prevented by one-step lookahead in the generator: `6 ×8 = 48` is legal arithmetic but a dead end when division is only unlocked for 2, 5 and 10, so it's never chosen. Without this, generation failed outright on long paths. |
| Player undoes back to the start | Allowed. Cable fully refunded. The answer log keeps every attempt. |
| Player quits mid-board | Session submitted with what happened; completion bonus not paid. Partial mastery still counts — abandoning must never be punished, and must never be *rewarded* either. |
| Stuck with cable left | Detected each turn (no legal move from any hand card). Ends the board as a loss immediately rather than making the child discover it. |
| Same seed replayed | Identical board. Intentional: "do it in par this time". |

---

## 11. Proposed files (net-new)

```
src/lib/game/cable-run.ts              generation, legality, scoring
src/app/play/modes/cable-run/page.tsx  server component: loads unlocks, seeds a board
src/components/play/cable-grid.tsx     client: board, hand, undo, submit
```

Plus a test-only solver in `src/lib/game/__tests__/cable-run.solver.ts`
(BFS over `(cell, value, hand)` states) used to assert generated boards are
solvable within budget.

---

## 12. Test plan

- **Generator invariants** (property tests over 1000 seeds): every board is
  solvable within `cable`; no junction > 144; every division step divides
  exactly; no decoy is reachable by the correct card from any path cell; exactly
  one trap exists.
- **Legality**: `isLegalMove` unit table covering exact division, non-adjacent
  cells, wrong value, and used cards.
- **Answer mapping**: a scripted 8-move session produces exactly 8 answer
  records with the expected `a`/`b`/`operation`.
- **Economy**: replaying the same seed pays completion coins once.
- **e2e (Playwright)**: fixed seed, keyboard-only completion of a 4×4 board;
  assert the results screen and one `finishRun` call.
- **a11y**: axe pass on the board; focus ring visible at 2× text scale.

---

## 13. Open questions

1. **Should the hand be visible-only-3, or should the whole deck be visible?**
   Visible deck makes it a full planning puzzle (better maths, slower); hidden
   deck adds tension. Currently specified as hand-of-3 with the *next* card
   peeked, as a compromise — worth playtesting both.
2. **Should reaching the switchboard early with cable left pay more, or should
   the board require using exactly all of it?** "Exactly all" is a stronger
   puzzle but a harsher failure state for a 7-year-old. Specified as the softer
   version.
3. **Does the trap belong at all in the easy tier?** Probably not — suggest
   suppressing it below the standard tier and letting the tier-up introduce it.
