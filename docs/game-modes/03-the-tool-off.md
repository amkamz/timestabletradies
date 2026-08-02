# 03 · The Tool-Off

> **The rival crew reckons they can frame a wall faster than you. Pick your
> tools, land the exact hit, and wipe the smirk off the foreman's face.**

A turn-based duel. Each turn you're shown a **target number** and must build it
out of a factor pair from your tool belt. It's a battle mode whose combat maths
is the inverse of everything else in the app: not "what is 6 × 8" but "what
makes 48".

- **Mode key**: `tooloff`
- **Session**: one duel, 12–20 committed turns, 4–6 minutes
- **`speedCounts`**: `true` (the turn clock is real, if generous)

---

## 1. Why it exists

Boss Battles exist per zone and are a fluency gauntlet with a health bar. This
is a different animal: it's the only mode in the app where the child **chooses
the factors**.

That inversion is the point. "What makes 48?" requires searching the fact family
— 6 × 8, 8 × 6, 4 × 12, 12 × 4 — and that search is precisely the cognitive move
division depends on. A child who can only run facts forwards has to compute
their way through candidates; a child who knows the family answers instantly.
The mode makes that difference *visible and rewarded*, which forward drilling
never does.

Two more things it gets for free:

- **Commutativity becomes obvious.** 6 × 8 and 8 × 6 are the same hit. The board
  shows both as valid and the child stops treating them as two facts.
- **Strategy pressure creates repetition without nagging.** Shields (§3.4) force
  specific tables, so the mode drills weak facts in a way that reads as tactics
  rather than remediation.

---

## 2. The board

```
   ┌──────────────────────────────────────────┐
   │  THE TOOL-OFF          vs. FOREMAN DAWES │
   ├──────────────────────────────────────────┤
   │  DAWES     ████████████░░░░░░  120/200   │
   │            🛡 shield: needs a ×7         │
   │                                          │
   │            ┌──────────────┐              │
   │            │  BUILD:  48  │   ⏱ ●●●●○○   │
   │            └──────────────┘              │
   │                                          │
   │  YOU       ██████████████████░  170/200  │
   ├──────────────────────────────────────────┤
   │  TOOL BELT                               │
   │   [ 3 ] [ 4 ] [ 6 ] [ 7 ] [ 8 ] [ 12 ]   │
   │                                          │
   │   selected:  6  ×  8   =  48   ✓ EXACT   │
   │              [ SWING ]                   │
   └──────────────────────────────────────────┘
```

- **Target**: the number to build this turn.
- **Tool belt**: six numbers. Tap two (or the same one twice, if it's a square)
  to form a product. The running product is shown live as you select.
- **Turn clock**: six pips, one lost per 5 seconds. Generous by design — this is
  a thinking mode with a floor, not a speed mode.
- **Shield**: a constraint the rival raises on some turns, e.g. *"needs a ×7"*.

---

## 3. Rules

1. Each turn presents a **target** and both fighters act; you go first.
2. Select exactly **two tools**; their product is your hit.
   - **Exact** (`product === target`) → full damage, `20`.
   - **Close** (within 10% of target, not exact) → glancing blow, `6`.
   - **Miss** (anything else) → `0`, and the rival's next hit is +5.
3. Committing is deliberate: you select, you see the product, you press **SWING**.
   Nothing fires on the second tap. Children change their minds and should be
   allowed to. Tapping a third tool replaces the older of the two.
4. **Shields.** On turns 3, 6, 9, … the rival raises a shield naming a required
   factor: *"needs a ×7"*. A hit that doesn't include 7 as one of its two tools
   deals half damage even if exact. The required factor is drawn from the
   child's weakest unlocked table — this is the remediation channel, dressed
   as an enemy mechanic.

   *As built:* "weakest" means latest in the unlock order, not lowest by
   `practiceWeight` — the server has to rebuild the identical belt and shield
   schedule to replay the duel, and mastery weights move between the page load
   and the submission. Same trade-off, and same follow-up, as
   [Ute Rally §5](02-ute-rally.md#5-question-selection).
5. **The rival hits back** on a fixed schedule with fixed damage per archetype
   (§4). No dice, no randomness in incoming damage: the child can always work out
   how many turns they have left, which is what makes the mode strategic instead
   of anxious.
6. **Turn clock expiry** = a miss, no extra penalty. The turn resolves and moves
   on. It never sits there waiting.
7. Duel ends when either fighter reaches 0 HP, or after **20 turns** (the rival
   wins a stalemate on remaining HP — draws are unsatisfying).
8. **Losing costs nothing but the win bonus.** All coins for landed hits are
   kept. The rematch button is right there and the rival is the same.

### Target generation

Targets are always products of two numbers on the belt — the puzzle is always
solvable, and usually solvable more than one way. Belt composition is what
controls difficulty:

```ts
// src/lib/game/tool-off.ts  (proposed)

export function buildBelt(opts: {
  seed: string;
  tables: number[];                                 // unlocked
  weightFor: (a: number, b: number) => number;      // mastery.practiceWeight
}): number[];   // exactly 6, always includes 2 strong + 2 weak tables

export function nextTarget(opts: {
  seed: string;
  turn: number;
  belt: number[];
  ambiguity: "single" | "multi";   // how many belt pairs make this target
}): { target: number; solutions: Array<[number, number]> };
```

Turn 1–3 targets have **one** belt solution (find the pair). From turn 4 targets
increasingly have **two or three** solutions, one of which will satisfy the
upcoming shield — so the child learns to look for the family, not the first pair
that works.

---

## 4. Rivals

Four archetypes, unlocked by Trade Rank, each with a genuinely different pattern
to solve rather than a bigger health bar.

| Rival | Unlocks | HP | Your HP | Hits for | Gimmick |
|---|---|---|---|---|---|
| **Apprentice Kade** | always | 120 | 200 | 12 every turn | None. The tutorial fight. |
| **Chippie Marlow** | rank 3 | 160 | 200 | 15 every turn | Shields every 3rd turn. |
| **Sparky Vance** | rank 5 | 200 | 200 | 10, doubling every 4th turn | Punishes stalling; forces exact hits. |
| **Foreman Dawes** | rank 7 | 220 | 240 | 18 every turn | Shields every 2nd turn, always naming your weakest table. |

**Your health is per-rival, not global** — a detail the spec missed and the
arithmetic forced. Dawes at 18 damage a turn kills a 200 HP player in 12 turns,
and 240 rival HP needs 12 exact hits at 20 damage each: the fight as originally
specced was *unwinnable*. Giving the player 240 against Dawes makes it 11 hits
in 13 turns — tight, which is what a rank-7 boss should be. `tool-off.test.ts`
asserts every rival is beatable by a player who hits exactly and losable by one
who lands roughly one hit in four, so this can't quietly rot.

Rivals are **not** other children and are never presented as such — they're
named site characters, same as the boss battles. No PvP here: a live duel with
turn clocks would strand one child waiting on another, and the app has no chat
to smooth that over.

---

## 5. Answers emitted

This mode needs a stated mapping, because a turn is a choice, not a reply.

| Turn outcome | Recorded |
|---|---|
| Exact hit, tools `6` and `8`, target 48 | `{ a: 6, b: 8, operation: "multiply", correct: true }` |
| Close/miss, tools `6` and `7`, target 48 | `{ a: 6, b: 7, operation: "multiply", correct: false }` |
| Clock expiry, nothing selected | **Nothing recorded.** No fact was committed to. |
| Clock expiry, one tool selected | Nothing recorded. |

The recorded fact is **what the child asserted**, not what the target was. A
child who swings 6 × 7 at a target of 48 has told you they think 6 × 7 = 48;
that's the wrong answer to log, and `a`/`b` are their chosen factors.

Shield turns record the same way. `elapsedMs` is time from target reveal to
SWING.

`operation` is always `"multiply"` — the reasoning is division-shaped, but the
child's committed statement is a product. The `runs` row carries
`operation: "multiply"` and `table_no: null`.

---

## 6. Economy

| Component | Coins |
|---|---|
| Exact hit | 10 |
| Glancing blow | 3 |
| Shield satisfied (exact hit that includes the required factor) | +5 |
| Duel won | +50, +25 per rival tier above Kade |
| Flawless (no misses all duel) | +40 |

Materials: `5` on a win, `2` on a loss, `+2` for flawless.

Losing pays out the hit coins, which typically lands 60–110. That's deliberately
close to a Quick Job: a duel you lost was still 15 minutes of good practice and
should not feel like zero.

---

## 7. Feel

- **Tool selection is the whole interaction** and must feel physical: tools lift
  off the belt, the product assembles in the middle in big display type, and
  `= 48 ✓ EXACT` lands before the swing. The child should *see* the exactness
  before they commit — the tension is arithmetic, not reflex.
- **Impact**: an exact hit is a heavy single thud and a hard HP-bar step. A
  glancing blow is a lighter tick. A miss is a comedy *whiff*, never a harsh
  buzzer — the rival smirks, and that's the whole punishment.
- **Shields** are drawn as a plate with the required factor stamped on it, and
  the belt highlights matching tools. Never colour-only.
- The rival is a placeholder character slot with three states: idle, hit, taunt.
- **No health-bar drama.** Both bars are plain, numeric, and never hide the
  numbers behind an effect — the child needs them to plan.

---

## 8. Accessibility

- **Keyboard**: `1`–`6` select belt tools, Backspace deselects the last one,
  Enter swings, Esc clears. The belt is a listbox with `aria-multiselectable`.
- **Screen reader**: on selection, `"6 and 8 selected, 48, exact"`. On resolve,
  `"Exact hit. Dawes at 100 of 200."` Shields announce on the turn they appear.
- **`timer_mode: extended`** → 8 pips (40 s). **`off`** → the pip row disappears
  entirely and turns never expire. The duel remains fully playable; the rival's
  fixed damage schedule means removing the clock changes pacing, not fairness.
  This is the mode to recommend when timers are off.
- **`reduced_motion`**: no shake on hit, no tool lift; state changes cross-fade.
- **`text_scale`**: the belt wraps to two rows of three above 1.4×; the target
  and running product never shrink below the display size — they're the two
  things being read.
- Nothing in the mode requires a drag; nothing requires distinguishing red from
  green (damage is reported numerically and by glyph).

---

## 9. Edge cases

| Case | Behaviour |
|---|---|
| Very few unlocked tables | Belt allows repeats (e.g. two 2s and two 5s) and targets stay within them. Kade is available from the first zone. |
| Target has only one solution and the shield forbids it | Cannot happen — generator rejects any turn where the shield makes the target unsolvable. Property-tested. |
| Child selects the same tool twice | Legal: `7 × 7 = 49`. Squares are a real move. |
| Child stalls repeatedly | The clock resolves as a miss, the duel ends within 20 turns regardless. There is no infinite state. |
| Both fighters hit 0 the same turn | The child wins. There's no reason to be pedantic about it. |
| App backgrounded | Turn clock pauses. Resumes with a 3-2-1 count. |
| Rematch spam against Kade | Win bonus is paid at full for the first 3 wins per rival per day, then 25% — the daily soft cap from the contract. Hit coins are uncapped, because those are earned per fact. |

---

## 10. Proposed files (net-new)

```
src/lib/game/tool-off.ts            belt, targets, shields, damage, rivals
src/app/play/modes/tool-off/page.tsx  server: unlocks, weights, rank → rival roster
src/components/play/duel-board.tsx   client: belt, target, HP, turn resolution
```

`lib/game/tool-off.ts` holds the full turn resolution as a pure reducer:

```ts
export function resolveTurn(state: DuelState, move: Move): DuelState;
```

so the entire duel can be replayed from `(seed, moves[])` in a test with no
React involved.

---

## 11. Test plan

- **Solvability invariant** (property, 5000 seeds): every generated target has
  ≥ 1 belt solution, and on shield turns ≥ 1 solution includes the required
  factor.
- **Damage arithmetic**: scripted duels against each rival; assert win/loss turn
  counts match the published schedule (i.e. the fight is genuinely winnable and
  genuinely losable).
- **Answer mapping**: a duel where the child swings 6 × 7 at target 48 records
  `a: 6, b: 7, correct: false` — *not* the target's factors.
- **No-commit turns**: clock expiry with 0 or 1 tools selected produces no
  answer record.
- **Belt composition**: every belt contains at least 2 factors from the child's
  weakest tables.
- **e2e**: fixed seed, keyboard-only win against Kade, one `finishRun` call.

---

## 12. Open questions

1. **Is "close = 6 damage" teaching the wrong thing?** It rewards being
   approximately right, which is real mathematical value (estimation) but sits
   oddly in a fact-fluency app. Alternative: close deals 0 but doesn't trigger
   the rival's +5 bonus. Worth a playtest — current setting is the forgiving one.
2. **Should the belt ever change mid-duel?** A "restock" every 6 turns would add
   variety and let shields escalate. It also adds a rule to explain. Left out.
3. **Live PvP later?** Only if the app grows async turns (each child takes their
   turn whenever). Real-time PvP is rejected for the stranding problem, and
   nothing here should be built in a way that assumes it's coming.
