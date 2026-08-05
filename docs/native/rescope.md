# The rescope — fewer modes, Godot for the interactive layer

*4 August 2026.* An audit of what is actually functional, and two decisions
taken off the back of it. This supersedes parts of
[`README.md`](README.md) — §1.8's mode table, §2.6, §4.7 and the Part 5
sequencing. Everything else in that document stands.

Two decisions:

1. **The mode list is cut from fifteen to nine**, and regrouped so a child can
   tell them apart.
2. **Godot owns the character renderer and the three surviving games.** The
   Compose and SwiftUI shells own everything else.

---

## Contents

- [What the audit found](#what-the-audit-found)
- [Decision 1 — cut the mode list](#decision-1--cut-the-mode-list)
- [Decision 2 — Godot owns the interactive layer](#decision-2--godot-owns-the-interactive-layer)
- [What this changes in the existing plan](#what-this-changes-in-the-existing-plan)
- [Sequencing](#sequencing)
- [Open questions](#open-questions)

---

# What the audit found

## The spine is real

Sign-in → student picker → The Site → job board → briefing → server-delivered
run → server-marked results → mastery grid. Plus the mastery grid, house and
accessibility screens on live data.

`TradiesRepository` has exactly two writes — `finishRun` and `saveSettings` —
and there is no question generator anywhere on the client. §0.1 and §0.2 landed
as specified, which is the expensive part to get right and it is right.

## Five Edge Functions exist. The write path needs about twenty

`run-start`, `run-finish`, `modes`, `mastery` and `house` are live. What is not:

| Surface | Reality |
|---|---|
| Shop + locker | 35 items render; purchases are **in-memory**. Close the app, you own nothing. |
| Parent sign-up | Calls `onboarding-signup`, **which does not exist**. The app cannot create its first user. |
| Crew / expo / challenges | `Storyboard.crewStub`, `expoStub`, a hardcoded `ChallengeOutcome("Leah", 9, 7, 10)` |
| Boss battles | `Storyboard.bossFor(table)` — screens built, no endpoint |
| Job board | `Storyboard.jobBoardStub` — the **core loop's own menu** is fabricated client-side |
| Grandparent sticker | Renders, reports failure on send |

Two consequences worth naming. The coin economy has **no sink**: coins are
minted correctly by `run-finish` and there is nothing to spend them on that
survives a restart. And the app cannot onboard anybody, so every test runs on a
account created by hand.

## Eight of the fifteen modes silently degrade into one keypad drill

This is the finding that drives Decision 1.

`openMode` (`TradiesApp.kt`) routes `garage`, `yard`, `toolbox`, `bigjob` and
`inspection`. Everything else falls through to a generic
`FullRoute.Run(style = Keypad)`. There is no `FullRoute` for Cable Run, Rally,
Tool-Off, Scaffold or Floor Plan at all — they were never built for Android.

The server agrees, quietly. `QUESTION_COUNT` in `run-start` covers seven modes;
the other eight hit `?? 10` and are handed ten plain questions over the unlocked
range. Nothing errors, on either side.

So a child taps **Scaffold Stack** and plays a ten-question keypad drill. Taps
**Cable Run** — the same drill. **Ute Rally** — the same drill. Three names,
three card colours, one identical experience, and no signal anywhere that
something is missing.

All five *are* genuinely built on web (`cable-grid.tsx`, `rally-track.tsx`,
`scaffold-tower.tsx`, `duel-board.tsx`, `floor-grid.tsx`). This is purely the
native gap — and it is most of why the mode list reads as unclear. On Android it
**is** unclear, because it is not true.

**A silent fallthrough is the wrong failure.** Whatever the mode list ends up
being, `openMode`'s `else` branch must say "not on Android yet" rather than
quietly serving a different mode under the right name.

## Smaller drift

- **The shop has five categories on web and four on Android.** Web:
  `hats, vests, belts, utes, accessories`. Android: `Hats, Vests, Tools, Rides`.
  Accessories is unreachable on Android and its items can never be equipped.
- **`finishRun` still exists twice** — `src/lib/actions/play.ts` and
  `supabase/functions/run-finish`. This is the duplication §1.2 exists to
  prevent and it has now survived long enough to be load-bearing in two places.

---

# Decision 1 — cut the mode list

Fifteen `RunMode` values, plus five job formats underneath `job`. That is twenty
distinct things a seven-year-old is asked to hold, and several of them differ
only by a number.

`runs.mode` is `text` with a check constraint, not a Postgres enum. **Retiring a
mode is therefore a registry edit, not a migration** — drop it from
`PRACTICE_MODES` and `MODE_REQUIREMENTS`, keep its `MODE_LABELS` entry and its
place in the constraint so historical runs still render and still count.

## Cut five

| Cut | Why |
|---|---|
| `inspection` | 25 questions at 6s, against the Yard's 20 at 10s. The same mode with different constants. Becomes the Yard's hard setting. |
| `scaffold` | Per §1.3 its tilt model **must** stay client-side, so "a modified client need never topple". It is the only mode with a structural anti-cheat hole, and sustained-fluency-under-load is what Rally already trains. |
| `tooloff` | Gated at 5 zones, so no free player ever sees it. Shipped arithmetically unwinnable once already. Floor Plan teaches factor decomposition better and teaches it earlier. |
| `expo` | A leaderboard wearing a run mode's clothes. Becomes a screen that reads existing runs. |
| `challenge` | The same drill as `crewrace` with an asynchronous wrapper. Folds into it. |

## Move one off the menu

**The Big Job** is 100 questions, monthly, shared with the teacher. That is an
assessment that *arrives*, not something picked from a list of ways to practise.
It keeps its `RunMode`; it leaves `PRACTICE_MODES`.

## What survives

Nine, in four groups that state what they are:

| Group | Modes | The promise |
|---|---|---|
| **Practise** | The Garage, Toolbox Time | No stakes. Garage picks for you, Toolbox lets you pick. |
| **Play** | Cable Run, Ute Rally, Floor Plan | Games. The reason for going native at all. |
| **Prove** | The Yard | Ranked. Feeds Trade Rank. |
| **Arrives** | Job Board, Boss Battle, Crew Race | Not chosen from a menu — the game hands them to you. |

The three surviving games keep all three teaching atoms from
[`docs/game-modes/README.md`](../game-modes/README.md): answer-as-a-move (Cable
Run, Floor Plan), the question running backwards (Floor Plan), and a decision
sitting between the facts (Rally). Nothing pedagogical is lost in the cut.

## Naming is half the problem

"The Garage", "The Yard", "Toolbox Time", "Site Inspection" are trade-flavoured
nouns with no verb in any of them. A child cannot tell them apart by name,
ever — not on the first day and not on the fiftieth. The blurb currently carries
the whole explanatory load, on a card, in small type.

**The Practise / Play / Prove grouping is the fix**, because it makes the shape
of the shed legible before the names are learned. Keep the trade names — they
are good flavour — but never make them the only thing distinguishing two cards.

---

# Decision 2 — Godot owns the interactive layer

Godot renders the character and the three games. Compose and SwiftUI own every
other screen.

## Why it earns its place

The three games are the only 60fps surfaces in the product. §2.6 currently
budgets porting their interaction logic to Kotlin, and then Part 3 budgets
porting it again to Swift. One Godot implementation collapses those two ports
into one.

The character is the other half. 20 models × 8 skin tones × 8 hair colours is
1,280 base looks *before* the 35 shop cosmetics layer on top. Pre-rendering that
is not possible, so any native path means building layered sprite composition
with runtime tinting and pose registration — on Android, and then again on iOS.
One rig with swappable parts is what a game engine is for.

## Godot is a renderer, not a client

The single most important constraint here:

> **Godot receives JSON and returns JSON. It holds no session, makes no network
> calls, and has no Supabase SDK in it.**

The shell owns auth, networking and the run lifecycle exactly as it does today.
It calls `/run/start`, hands the delivered board across the bridge, gets the
interaction log back, and posts it to `/run/finish`. Three things fall out of
that and all three matter:

- The access token never enters a second runtime. §2.7's rule that no screen may
  render a throwable's message stays enforceable, because the only code that can
  see a failed request is still Ktor inside `:core:network`.
- The Godot layer is testable from fixtures alone, which is exactly what the
  `/contract` suite in §4.3 is for.
- `:core:network` remains the only network layer, so §0.3's KMP door stays open.

## The accessibility problem, stated plainly

**This is the real cost of the decision and it needs designing, not noting.**

TalkBack does not traverse a Godot surface. Godot 4.4's AccessKit work is not
equivalent to native semantics on Android, and it is not going to be by the time
this ships. §2.7 commits to TalkBack semantics on **every game board**, and
`docs/game-modes/README.md` commits to "dragging is never required" with a full
keyboard path per WCAG 2.2 SC 2.5.7.

A Godot game board, built naively, is a screen-reader dead zone. That is a
regression against a standing constraint of this product, not a nice-to-have
deferred.

Two candidate answers, and one of them has to be chosen before Phase 5 starts:

1. **The shell provides an accessible parallel path.** Each game exposes its
   board state across the bridge, and Compose renders an accessible
   representation — a real, focusable, TalkBack-traversable control surface that
   plays the same run. Expensive, but it is the only answer that keeps the
   commitment honestly.
2. **The games are declared optional content**, with every mode reachable by a
   screen-reader user living outside Godot — the six Practise / Prove / Arrives
   modes. Cheaper, and defensible only if no progression, entitlement or
   curriculum requirement ever routes exclusively through a game.

Option 2 is only available while the games grant nothing unique. The moment a
rare drop or a zone unlock sits behind one, it stops being optional content.

## Web keeps its React implementations, for now

Godot exports to HTML5, but the web app already has all three games working in
React and replacing something that functions is not the way to spend the budget.

Be honest about what that costs: the interaction logic then exists twice — once
in React for web, once in GDScript for the clients. That is a second source of
truth for *feedback*, not for rules, so a divergence is a visual bug rather than
a broken economy (the same trade §2.6 already accepts). Revisit after the mobile
exports are stable; swapping web onto the same export later is a page change,
not a rewrite.

**So the saving is Android + iOS — two ports collapsing to one, not three.**

## Integration shape

```
/godot                       Godot 4 project
  characters/                one rig; model, skin, hair, cosmetics as parameters
  games/                     cable_run, rally, floor_plan
  bridge/                    the JSON-in / JSON-out seam
```

| Concern | Approach |
|---|---|
| Android | `godot-lib.aar` hosted in a `GodotFragment`, behind an `AndroidView` in Compose |
| iOS | Exported framework, hosted in a `UIViewRepresentable` |
| Design tokens | Generate a Godot theme resource from `design/tokens.json` alongside `PopTokens.kt` (§0.4). Nobody hand-edits it. |
| Accessibility state | `reduced_motion`, `text_scale`, `timer_mode` and `read_aloud` cross the bridge with the board. A timer Godot draws must still obey `timer_mode`. |
| APK cost | ~25–40MB. Real, and worth checking against the Play Families size expectations early rather than at submission. |

**Do a one-week integration spike before committing Phase 5.** Embedding, APK
size, cold-start time into a Godot surface, and whether the hard-shadow Toolbox
Pop look survives inside the engine. All four are cheap to answer now and
expensive to discover in month four.

---

# What this changes in the existing plan

| Section | Change |
|---|---|
| §1.8 mode table | Five rows retired; `bigjob` leaves the practice list. Thresholds for the survivors are unchanged. |
| §2.6 "The five game modes" | Becomes three, in Godot, not Kotlin. The `:core:model` port of the client-side halves is no longer needed. |
| §2.7 Accessibility | Gains the Godot accessibility question above as a **blocking** design item. |
| §4.7 Art | The character pipeline is now a Godot rig rather than exported slices. Still the schedule risk; still starts in parallel from Phase 1. |
| Part 3 iOS | The games arrive already built. The KMP decision is unaffected — it was always about `:core:*`, and Godot does not touch those. |
| Part 5 | Resequenced below. |

---

# Sequencing

Solo developer. Estimates are rough and the Godot phases are the least certain.

| Phase | Work | Est. |
|---|---|---|
| **0** | ✅ **Done.** `RETIRED_MODES` and `ModeSection` in `modes.ts`; `openMode` pushes `NotOnAndroidYet`; `run-start` 501s on a mode it cannot build; `streak.ts` and `city-level.ts` written and tested; Android's fifth shop category restored. | ½ wk |
| **1** | One write path. `onboarding-signup` first, then `purchaseItem`/`equipItem`, then crew, boss, sticker. Delete `finishRun` from `actions/play.ts` (§1.2). | 2–3 wks |
| **2** | Student JWT claim + RLS rewrite (§0.5). | 1 wk |
| **3** | Board delivery for the three games (§1.3). `QUESTION_COUNT`, `TIMER_SECONDS`, the `content` contract. | 1 wk |
| **4** | Godot spike, then the character renderer. **Runs in parallel from Phase 1.** | 1 + 3–4 wks |
| **5** | The three games in Godot, plus the accessibility path chosen above. | 5–7 wks |
| **6** | Offline, billing, account deletion (§4.6), accessibility sweep. | 4 wks |
| **7** | Play release, compliance, review cycles. | 2–3 wks |

**Phase 0 goes first because everything downstream is cheaper against nine modes
than fifteen** — fewer endpoints, fewer boards, fewer cards, fewer things to
explain to a child.

**Phase 1 goes before anything visual** because the app currently cannot create
a user and cannot spend a coin. Neither is a polish item; they are the two ends
of the loop.

---

# Open questions

Carried forward from [`README.md`](README.md#open-questions), plus three new.

1. **Which accessibility answer for the Godot games** — shell-rendered parallel
   path, or games as optional content? Blocking Phase 5. See above.
2. **Does anything unique live behind a game?** Rare drops, zone unlocks and
   curriculum coverage must not route exclusively through Cable Run, Rally or
   Floor Plan if the games are to stay optional content.
3. **Does the shop's fifth category survive?** Android has four slots and web
   has five. Either `accessories` gets an Android slot or it leaves the
   catalogue — it cannot stay unreachable.
4. Everything under the original [Open questions](README.md#open-questions), of
   which the free tier's economic dead end remains the most urgent.
