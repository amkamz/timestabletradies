# 05 · Floor Plan

> **The tiler's dropped off a stack of tile blocks and one room to cover. Every
> block is a rectangle, every rectangle is a times table. Cover the floor. No
> gaps, no overlaps, no cutting.**

An area-model tiling puzzle. The child fills a room with rectangular blocks whose
areas are products — which makes the multiplication grid *physical*, and turns
"what's left over?" into division with the answer sitting right there on the
floor.

- **Mode key**: `floorplan`
- **Session**: one room, 6–12 placements, 4–7 minutes
- **`speedCounts`**: `false`

---

## 1. Why it exists

The app has a mastery grid, a job board, and a lot of prompts — but nothing that
shows a child *why* 6 × 8 is 48. The area model is the standard bridge (it's how
the curriculum introduces multiplication as an array), and it's absent.

Floor Plan is the mode that makes the model do work:

- **Multiplication is area.** A 6×8 block visibly covers 48 squares. A child who
  has placed thirty of these has a spatial intuition that survives long after
  they've forgotten a drill.
- **Division is the leftover.** The room is 7 wide; you've covered 4 rows; the
  gap is a 7×3 hole. Working out what fits is `21 ÷ 7`, asked in the one form
  where the child can *see* the unknown factor.
- **Commutativity is a rotate button.** 3×8 and 8×3 are the same block turned
  90°. The mode teaches this in one gesture, permanently.
- **It is the second untimed mode.** Together with Cable Run it gives the app a
  proper slow lane; a child who is anxious about clocks currently has only
  Toolbox Time, which is a drill with the timer removed rather than a mode
  designed for thinking.

---

## 2. The room

```
   ┌───────────────────────────────────────┐
   │  FLOOR PLAN        room: 8 × 9 = 72   │
   ├───────────────────────────────────────┤
   │      1 2 3 4 5 6 7 8                  │
   │    ┌─────────────────┐                │
   │  1 │▓▓▓▓▓▓│░░░░░░░░░░│                │
   │  2 │▓▓▓▓▓▓│░░░░░░░░░░│  ▓ = placed    │
   │  3 │▓▓▓▓▓▓│░░░░░░░░░░│  ░ = bare      │
   │  4 │▒▒▒▒▒▒▒▒▒▒│░░░░░░│                │
   │  5 │▒▒▒▒▒▒▒▒▒▒│░░░░░░│                │
   │  6 │░░░░░░░░░░░░░░░░░│                │
   │  7 │░░░░░░░░░░░░░░░░░│                │
   │  8 │░░░░░░░░░░░░░░░░░│                │
   │  9 │░░░░░░░░░░░░░░░░░│                │
   │    └─────────────────┘                │
   │            36 squares left            │
   ├───────────────────────────────────────┤
   │  PALLET                               │
   │   [3×3=9] [5×2=10] [4×6=24] [3×4=12]  │
   │                        ⟲ rotate       │
   ├───────────────────────────────────────┤
   │  [ ↶ Lift last ]         [ Restart ]  │
   └───────────────────────────────────────┘
```

- **Room**: `w × h`, both from unlocked tables. The total is shown as a product,
  always — the room itself is a fact.
- **Pallet**: every unused block, in a scrolling strip, each labelled with its
  dimensions **and** its area.

  *As built:* all of them, not a 4-slot window. The window created a stall
  state — four unplaceable blocks showing at once — which §9 then needed a
  special rule to avoid. Showing the lot deletes the rule and the bug together,
  and a strip of 6–16 blocks scrolls fine on a phone.
- **Squares left**: the running remainder. This number is the mode's teaching
  device and is on screen at all times.

---

## 3. Rules

1. Tap a pallet block, then tap a square in the room — the block's **top-left
   corner** goes there. A ghost preview shows the footprint before you commit.
2. A placement is **legal** iff every square it would cover is inside the room
   and currently bare.
3. **Illegal placement**: the ghost turns hatched, the block doesn't drop, and a
   line explains — *"That's 4 wide and only 2 columns are left"*. No penalty
   beyond the wrong idea being logged (§5).
4. **Rotate** (`⟲`) turns the selected block 90°: `4×6` becomes `6×4`. Same area,
   same label maths, stated explicitly in the UI: *"24 either way"*.
5. **Lift last** removes the most recent block. Unlimited. This is a thinking
   mode; undo is not a concession.
6. The room is **complete** when zero squares are bare.
7. There is no fail state and no clock. The only ways out are finishing,
   restarting, or leaving.
8. **The pallet is guaranteed sufficient — minus exactly one block.** The
   generator tiles the room first, then *holds one piece back*. Everything else
   is on the pallet, so the room is completable the moment that piece is won.

   *As built, and the most important change to this spec.* Originally the
   pallet held every solution block, and the gap question fired only "when
   nothing on the pallet fits". With a complete pallet that essentially never
   happens: the last gap always has its tile sitting right there. The mode's
   central teaching beat — the one this whole document is built around — would
   have shipped as dead code.

   Withholding one block makes the question structural: every room ends with a
   rectangular hole and no tile for it, and the only way to finish is to work
   out the missing side. The withheld piece is always one whose shape appears
   exactly once in the tiling (otherwise a duplicate would cover the hole), and
   the decoy generator is forbidden from producing its shape. Rooms with no
   such piece are re-rolled.

### The gap question

This is the mode's core teaching beat and is worth stating as a rule of its own.

When exactly one rectangular gap remains and it is **not** coverable by any block
on the pallet — which, thanks to the withheld piece in §3.8, is how every room
ends — the game **asks for it** instead of stalling:

```
   ┌─────────────────────────────────┐
   │  One gap left: 7 wide, ? high    │
   │  It's 21 squares.                │
   │                                  │
   │  How high?     [ 2 ] [ 3 ] [ 4 ] │
   └─────────────────────────────────┘
```

Answer correctly and the matching block is added to the pallet. This is
`21 ÷ 7 = 3` asked in the only form where the child can count the answer if they
need to — and it's the moment the mode is built around. It records as a division
answer (§5).

---

## 4. Room generation

Solution-first, same discipline as Cable Run.

```ts
// src/lib/game/floor-plan.ts   (proposed)

export type Block = { w: number; h: number };            // area = w * h
export type Placement = Block & { row: number; col: number };
export type Room = {
  seed: string;
  w: number; h: number;
  pallet: Block[];         // ordered draw pile; 4 visible
  solution: Placement[];   // test/hint use only, never sent to the client
  decoys: Block[];
};

export function generateRoom(opts: {
  seed: string;
  tables: number[];
  divisionUnlocked: number[];
  difficulty: "easy" | "standard" | "hard";
}): Room;
```

1. Pick room dimensions: both factors from unlocked tables. Easy ≤ 36 squares,
   standard ≤ 72, hard ≤ 144.
2. **Guillotine-split** the room recursively into rectangles, splitting only on
   integer lines, until every piece is between 4 and 30 squares and no piece has
   a side longer than 12. Depth controls piece count: 4–6 (easy), 6–9
   (standard), 9–12 (hard).
3. Each piece is a block in the solution. The pallet is those blocks **shuffled**,
   with 2–4 **decoys** mixed in.
4. **Decoys** are near-miss rectangles — same area with wrong dimensions
   (a 12 as 2×6 when the gap needs 3×4), or off-by-one areas. They're the reason
   the child must check dimensions rather than matching areas by eye.
5. **Orientation is scrambled**: every solution block is randomly stored rotated,
   so rotation is required on roughly half of them. Otherwise children never
   discover the button.
6. Verify with a test-only exact-cover solver that the room is completable using
   only pallet blocks.

**Difficulty** is chosen the same way as Cable Run's: from mastery, not from a
menu, biased toward tables the child needs via `practiceWeight`.

---

## 5. Answers emitted

The mapping is the subtle part of this spec.

| Event | Recorded |
|---|---|
| Legal placement of a `6×8` block | `{ a: 6, b: 8, operation: "multiply", correct: true }` |
| Illegal placement attempt of a `6×8` block | `{ a: 6, b: 8, operation: "multiply", correct: false }` |
| Gap question answered correctly (`21`, 7 wide, answered 3) | `{ a: 7, b: 3, operation: "divide", correct: true }` |
| Gap question answered wrong | `{ a: 7, b: 3, operation: "divide", correct: false }` |
| Rotating a block | Nothing. It's a view change. |
| Lifting a block | Nothing. The original placement's record stands. |

**The honest caveat**: a legal placement is weaker evidence of fact knowledge
than typing "48". A child can place a 6×8 block correctly by matching shapes
without ever thinking about 48. Two mitigations:

1. Placements record as correct attempts but with `speedCounts: false`, so they
   can lift a fact off `none`/`bronze` and improve accuracy — but they can
   **never certify Gold or Blue**. Fluency still has to be earned in a mode that
   actually measures it.
2. Gap questions (§3, "the gap question") are real answers, and they're the ones
   this mode is built to produce.

This is stated here rather than buried, because the alternative — treating a
tile placement as equivalent to a recalled fact — would quietly inflate the
mastery grid the parent dashboard reports on.

Division-mode gap questions only appear where `division_unlocked` is true for
the relevant table; otherwise the gap question is phrased as multiplication —
*"7 times what makes 21?"* — and recorded as `multiply`.

---

## 6. Economy

| Component | Coins |
|---|---|
| Room completed | 70 |
| Perfect fit: completed with no illegal attempts | +25 |
| Each gap question answered correctly | +10 |
| No decoy ever placed (they can't be — but none attempted) | +15 |

Materials: `4` (easy) / `6` (standard) / `8` (hard).

Restart pays completion once per seed, as with Cable Run. Daily soft cap applies.

---

## 7. Feel

- **Placement is tactile**: the ghost snaps to the grid, blocks drop with a
  weight to them, and the *"squares left"* counter ticks down digit by digit.
  That counter is the mode's heartbeat.
- **The last block** gets a moment: the room fills, the grid lines fade, and the
  floor becomes a finished tiled surface (placeholder art slot: one per trade
  skin, so a Tiling-zone room finishes in tile and a Concreting room in slab).
- **Rotate** animates 90° in 150 ms and the label visibly swaps `4×6 → 6×4` while
  the area stays put. Small thing; it's the entire commutativity lesson.
- **Illegal placements are quiet.** A hatch pattern and a sentence. No buzzer, no
  shake — this is the mode where a child is supposed to try things.

---

## 8. Accessibility

- **Tap-to-place, never drag** (WCAG 2.2 SC 2.5.7), consistent with the existing
  Measure Up decision.
- **Keyboard**: `Tab` cycles the pallet, `R` rotates, arrows move the ghost
  around the room, Enter places, `L` lifts the last block.
- **Screen reader**: the room is a grid with each cell named
  `"row 4, column 3, bare"` / `"row 4, column 3, covered by 6 by 8 block"`. The
  ghost announces `"6 by 8 block at row 4 column 3: fits"` or
  `"does not fit, 2 columns short"`. The remainder is a live region.
- **Colour**: placed vs bare differ in **fill pattern** (▓ vs ░) as well as tone;
  each placed block carries its `6×8` label in the top-left of its footprint;
  block boundaries are drawn with a heavy border. A colourblind or low-vision
  player has three redundant channels.
- **`text_scale`**: above 1.4×, block labels move from inside the footprint to a
  numbered legend beside the room, and hard rooms cap at 96 squares.
- **Timers**: none. `timer_mode` has no effect.
- **Motion**: `reduced_motion` removes the drop and the rotate animation; the
  completion beat becomes a single cross-fade.

---

## 9. Edge cases

| Case | Behaviour |
|---|---|
| Child places blocks into an unsolvable arrangement | Possible and expected. When no pallet block fits any remaining gap, the game says *"Nothing on the pallet fits — lift a block and try a different spot"* and highlights the last placement. Never a dead end, never a forced restart. |
| Multiple disconnected gaps remain | The gap question (§3) only triggers on a *single* rectangular gap. Multiple gaps just continue normally. |
| Remaining gap is non-rectangular | Normal play continues; no gap question. |
| Only one table unlocked | Rooms are `n × k` within that table; guillotine depth drops to 4. Works from the first zone. |
| Child restarts repeatedly | Free. Same room. Completion pays once per seed. |
| Child leaves mid-room | Session submits what happened; no completion bonus; placements still count for mastery accuracy. |
| Decoy blocks clog the visible pallet | Can't happen as built — the whole pallet is visible, so there is no draw order to get stuck behind. |
| The gap question is answered wrong | The wrong answer is recorded, no block is won, and the question stays up. There's no penalty beyond being no closer to finishing. |

---

## 10. Proposed files (net-new)

```
src/lib/game/floor-plan.ts             generation, placement legality, gap detection
src/app/play/modes/floor-plan/page.tsx server: unlocks, weights, seed
src/components/play/floor-grid.tsx     client: room, pallet, ghost, gap question
```

Test-only exact-cover solver at `src/lib/game/__tests__/floor-plan.solver.ts`
(dancing-links or plain backtracking — rooms are ≤ 144 squares, so plain is fine)
used to assert generated rooms are completable.

---

## 11. Test plan

- **Generator invariants** (property, 1000 seeds): every room is exactly
  tileable from its pallet; no block exceeds 12 on a side; every room's
  dimensions are both unlocked tables; ≥ 2 decoys; ≥ 40% of solution blocks are
  stored rotated relative to their solution orientation.
- **Placement legality**: unit table for out-of-bounds, overlap, and exact fit at
  each corner.
- **Gap detection**: a room reduced to a single 7×3 gap raises the gap question
  with the correct dimension and options; a room with two gaps does not.
- **Answer mapping**: placements record `multiply`; gap answers record `divide`
  where unlocked and `multiply` where not.
- **Pallet draw**: no visible pallet state where all 4 blocks are unplaceable.
- **e2e**: fixed seed, keyboard-only completion of an easy room including one
  rotate and one gap question; assert one `finishRun` call.
- **a11y**: axe pass; verify the grid's accessible names at 2× text scale with
  the legend layout active.

---

## 12. Open questions

1. **Should placements count for mastery at all?** §5 argues yes-but-weakly, and
   that's what shipped: placements record as attempts with `countsForSpeed`
   false, so they move accuracy but can never certify Gold or Blue. The
   alternative — placements record nothing and only gap questions count — would
   make the mode's mastery contribution tiny but unimpeachable. **Still the
   single most important open call in this spec**, and it should be made with a
   teacher in the room; the change is one line in `replayFloorPlan`.
2. **Should the child ever choose the room?** Letting them pick "a 7 × 8 room"
   would be a lovely bit of agency and a self-directed drill of one table.
   Currently generator-chosen, to keep adaptivity honest.
3. **Is the guillotine split too regular?** It produces tidy rooms that are
   sometimes trivially readable as rows. A post-pass that merges two adjacent
   pieces into an L would break that up — but L-shaped blocks stop being
   multiplication facts, which is the whole point. Probably leave it.
4. **Trade skins**: the finished-floor art has one slot per trade. Ten slots is a
   real illustration cost for a single mode's ending beat — is one generic
   finished floor enough for v1?
