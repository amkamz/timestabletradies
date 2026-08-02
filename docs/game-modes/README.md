# New game modes

Five net-new interactive modes for *Times Table Tradies* — specified here and
built. Each spec is the design record; where the build had to depart from it,
the spec says so in place rather than being quietly rewritten.

| # | Mode | Verb | Shape | Timed? | Math it actually trains |
|---|---|---|---|---|---|
| [01](01-cable-run.md) | **Cable Run** | route | Grid path puzzle | No | Division as the inverse of multiplication; multi-step planning |
| [02](02-ute-rally.md) | **Ute Rally** | race | Head-to-head race with forks | Yes | Recall speed under pressure + risk appraisal |
| [03](03-the-tool-off.md) | **The Tool-Off** | duel | Turn-based battle | Soft | Factor-pair decomposition ("what makes 48?") |
| [04](04-scaffold-stack.md) | **Scaffold Stack** | build | Endless stacking arcade | Ramping | Sustained fluency; commutativity under load |
| [05](05-floor-plan.md) | **Floor Plan** | fit | Area-model tiling puzzle | No | Arrays, area model, unknown-factor division |

Start with [00-integration-contract.md](00-integration-contract.md) — it defines
the one shared seam all five would attach through, and the (small, additive)
changes to existing code that wiring would eventually require.

---

## Why these five

The shipped modes are all variations on *answer a question, then answer another
one*: the job formats (`quick`, `delivery`, `measure`, `build`, `muster`) and the
practice modes (Garage, Yard, Site Inspection, Toolbox, Big Job) differ in
timing, weighting and framing, but the atom is always "a prompt appears, you
supply the answer".

That atom is the right default and these five don't replace it. They add three
atoms it can't express:

1. **The answer is a *move*, not a reply.** In Cable Run and Floor Plan the
   product you compute determines *where a thing goes*. Getting it right is
   spatial and visible, and a wrong idea is discovered by the board refusing it
   rather than by a red flash.
2. **The question runs backwards.** Tool-Off and Floor Plan ask "what makes 48?"
   rather than "what is 6 × 8". That's the same fact family approached from the
   direction division actually needs, and the shipped modes only ever ask it
   forwards (division questions are still supplied as `56 ÷ 7`, i.e. a prompt
   with one answer).
3. **A decision sits between the facts.** Ute Rally's forks and Scaffold Stack's
   placement mean the child spends attention on strategy in between recalls.
   That's what makes an arcade mode re-playable past the third session, and it's
   the reason these modes can carry longer sittings than a 10-question drill.

## Design rules every spec here obeys

Inherited from the existing codebase and the accessibility posture in
`README.md` — a spec that broke one of these would be a spec to reject.

- **Rewards are computed server-side** from the submitted answer log. Every mode
  here funnels through one `finishRun`-shaped call and none of them let the
  client name its own payout.
- **No real money, ever, in the student app.** Coins only. No timers that can be
  skipped by paying, no ads, no boosters.
- **Colour is never the only signal.** Every board state carries a glyph, a
  label, or a shape as well as a fill.
- **Dragging is never required.** Every "drag" in these specs ships as
  tap-to-place with a full keyboard path (WCAG 2.2 SC 2.5.7).
- **Every timer obeys `student_settings.timer_mode`** (`standard` / `extended` /
  `off`), including the ones that look structural. Each spec states what its
  mode becomes when timers are off.
- **Multiplication-first.** Division only ever appears for a table where
  `student_tables.division_unlocked` is true.
- **Whole numbers only.** No remainders, no fractions, no negatives.
- **Losing is cheap.** Every failure state here restarts in one tap, keeps the
  layout, and never destroys earned currency.

## Status

| Artifact | State |
|---|---|
| All five modes | **Built** — rules, tests, routes, UI, server-side payout |
| These specs | Reconciled against what actually shipped; deviations marked *as built* |
| Shared seam (contract §2) | **Built** — migration 0002, `RunMode`, mastery flag, mode registry |
| Tests | 133 unit tests (`npm test`); e2e written for Scaffold Stack, unrun |
| Art | Every visual is a labelled placeholder slot, per the design doc's convention |

⚠️ **`supabase/migrations/0002_new_modes.sql` must be applied before the app will
accept any run submission** — see the contract's [build status](00-integration-contract.md#6-build-status).

### What building them changed

Four of the five specs were wrong somewhere that only showed up under
implementation. Each is marked *as built* in place:

- **Ute Rally** — three lengths per correct answer against one made the dirt
  road strictly better at *every* accuracy. The fork had no downside and the
  claimed 65% crossover was never real. Fixed with all-or-nothing dirt legs,
  which puts the crossover at ≈69% and is now asserted by simulation.
- **Floor Plan** — with a complete pallet, the final gap always had its tile, so
  the division question the whole mode exists for would essentially never have
  fired. The generator now withholds one block by design.
- **Cable Run** — a multiplication-only route is impossible: `fact_mastery`
  stores `b ≤ 12`, so from a product there is no legal multiply left. The mode
  is gated on division being unlocked instead of degrading.
- **The Tool-Off** — Foreman Dawes as specced was arithmetically unwinnable.
  Player health is now per-rival, and every fight is tested as both winnable and
  losable.

⚠️ **`supabase/migrations/0002_new_modes.sql` must be applied before the app will
accept any run submission** — see the contract's [build status](00-integration-contract.md#6-build-status).
