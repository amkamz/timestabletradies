# Screens and modes — current state, and where it should land

*4 August 2026.* An inventory of every Android screen and every game mode, as
they actually are, followed by the shape they should take after the rescope in
[`rescope.md`](rescope.md). Companion to [`README.md`](README.md).

Web has its own route list (45 pages under `src/app/`) and is broadly ahead of
Android on data — the five puzzle modes are genuinely built there. This document
is about the Android app, because that is where the gap is.

## Legend

| | Meaning |
|---|---|
| ● | **Live** — real data in, real writes out |
| ◐ | **Partial** — renders live data, but something material is faked or undeployed |
| ○ | **Stub** — renders from `ui/state/Storyboard.kt` |
| ✗ | **Broken** — the path exists, is reachable, and cannot succeed |

---

# Current state

34 screen composables. **11 live, 6 partial, 11 stub, 6 broken.**

## Entry — before a student is chosen

```
Entry
├─ ● Welcome ................. A1. Static splash; "I'm a grown-up" starts setup.
├─ ● Sign in ................. Parent email + password via the Supabase SDK.
│                              Shows the raw cause under BuildConfig.DEBUG only.
├─ ● Grown-up gate ........... 13–18 × 12–17 multiplication, generated locally so
│                              it works offline. Guards setup, more-trades and
│                              switch-tradie. Not the storyboard's 7 × 9 — a gate
│                              a fluent nine-year-old clears is not a gate.
├─ ✗ Parent account .......... A3. Calls `onboarding-signup`, which does not
│                              exist. Always fails; surfaces the failure rather
│                              than spinning.
└─ ● Student picker .......... Family profiles from `students` over RLS. The one
                               place a child is chosen; kids hold no credentials.
```

## Setup — behind the gate

**The whole chain is an in-memory draft and nothing in it is ever saved.** No
`addStudent`, `saveLook` or `saveName` call exists on the client. `MeetTradie`'s
"start" resets to the picker, where the tradie just built does not appear.

```
Setup
├─ ✗ Add students ............ Collects names into `studentDrafts`. Never posted.
├─ ✗ Character gallery ....... 20 models × 8 skins × 8 hair. Draft only.
├─ ✗ Name generator .......... Trade-flavoured name suggestions. Draft only.
└─ ✗ Meet tradie ............. The reveal. Discards the draft and resets.
```

## Tabs — the nav bar stays

```
TABS
├─ Site
│  ├─ ◐ Site home ............ The daily hub. Coins, timber, house percent and
│  │                           stage are live. `streakDays` is hardcoded 0 (no
│  │                           column). `bossReady` is a proxy — "has anything
│  │                           reached Blue" — standing in for the boss endpoint.
│  │                           `jobsToday` counts the stubbed board.
│  ├─ ● House project ........ Build stages, loads and rare items from the
│  │                           `house` endpoint.
│  └─ ◐ Trade zones .......... Which trades are open, and fluency per zone.
│                              Unlocked set and grid are live; the zone order and
│                              trade names come from a client-side mirror of
│                              `zones.ts` in `Storyboard`.
│
├─ Jobs
│  ├─ ○ Job board ............ `Storyboard.jobBoardStub(playableTables)`. The
│  │                           core loop's own menu is fabricated on the client.
│  ├─ ● Training shed ........ Mode list and lock reasons from the `modes`
│  │                           endpoint, decided server-side. Locked modes shown
│  │                           with their requirement, never a price.
│  ├─ ○ Trade expo ........... `Storyboard.expoStub`. Leaderboard of nobody.
│  └─ ○ Job challenges ....... Hardcoded `ChallengeOutcome("Leah", 9, 7, 10)`.
│
├─ Mastery
│  └─ ● Mastery grid ......... 144 cells, staged server-side. Does not scroll, by
│                              design. Tapping a cell reads the last 20 attempts
│                              from `answers`. Shapes ride on `high_contrast`
│                              until that setting gets its own column.
│
├─ Shop
│  └─ ○ Shop ................. 35 items mirrored from `shop.ts`. Purchases live
│                              in `ownedLocally` and die with the process. Four
│                              categories to web's five — `accessories` is
│                              unreachable. Title and filters now pinned.
│
└─ Locker
   └─ ○ Locker ............... Owned gear, equipped state in `equippedLocally`.
                               Same in-memory fate. Title, preview and slot tabs
                               now pinned.
```

## Full screen — the nav bar hides

```
FULL SCREEN
├─ The loop
│  ├─ ◐ Job briefing ......... What the job is, before the clock. Renders the
│  │                           stubbed job card.
│  ├─ ● Job run .............. The runner. Questions come from `run-start`; the
│  │                           client cannot generate one. Latches on submit so a
│  │                           tenth answer can't become an eleventh.
│  └─ ● Job results .......... Server-marked. `run-finish` recomputes the payout;
│                              quitting early still banks what was practised.
│
├─ Practice modes with their own intro
│  ├─ ● The Garage ........... Adaptive. Selection weights by the mastery ladder,
│  │                           server-side. 10 coins per correct.
│  ├─ ● The Yard ............. 20 questions at 10s → Trade Rank.
│  ├─ ◐ Toolbox Time ......... Table and operation picker. Sends `tables[]` and
│  │                           `operation`, but the deployed `run-start` ignores
│  │                           them — degrades to the whole unlocked range.
│  └─ ● The Big Job .......... 100 questions at 3s, flagged
│                              `shared_with_teacher`.
│
├─ Boss + house
│  ├─ ○ Boss intro ........... `Storyboard.bossFor(table)`. States the rare drop
│  │                           before the fight, because it is the only reward
│  │                           that cannot be bought.
│  ├─ ○ Boss victory ......... `Storyboard.rareDropFor(table)`.
│  └─ ◐ Move-in day .......... Celebration. `housesFinished = 1` hardcoded.
│
├─ Crew
│  └─ ○ Crew race lobby ...... `Storyboard.crewStub`. Starts a `crewrace` run
│                              which the server serves as 10 plain questions.
│
├─ Shop
│  └─ ○ Try on ............... Preview before the coins go. Buy writes to memory.
│
├─ Above the gate
│  ├─ ● Accessibility ........ Reduced motion, text scale, timer mode, read-aloud,
│  │                           colourblind shapes. Writes to `student_settings`.
│  │                           Dyslexic font not built.
│  └─ ● More trades .......... Explains to a grown-up how trades open. Names no
│                              price; hands off to the web dashboard.
│
└─ Deep link only
   └─ ✗ Grandparent sticker .. Reached by `/cheer`. Renders and is interactive;
                               `sendSticker` has no endpoint, so `onSend` sets
                               `sendFailed = true` unconditionally.
```

---

# Game modes — current state

15 registered `RunMode` values. **4 are what they claim to be on Android.**

| Mode | Says it is | Actually is, on Android |
|---|---|---|
| ● `job` | The daily job board | Real run; the **board that lists them is stubbed** |
| ● `garage` | Adaptive practice | Real, adaptive server-side |
| ● `yard` | Speed test → Trade Rank | Real |
| ● `bigjob` | Monthly 100Q assessment | Real |
| ◐ `toolbox` | You pick tables + operation | Real run, picks ignored until `run-start` ships |
| ◐ `inspection` | 25Q at 6s | Real, but it is the Yard with different constants |
| ✗ `boss` | Per-zone battle, rare drop | Run is real; brief and drop are stubbed |
| ✗ `crewrace` | Race your crew | **10 plain questions.** Racers are stubs |
| ✗ `expo` | Trade Expo | **10 plain questions** |
| ✗ `challenge` | Challenge a friend | **10 plain questions** |
| ✗ `cablerun` | Route a cable — division puzzle | **10 plain questions on a keypad** |
| ✗ `rally` | Race with risky forks | **10 plain questions on a keypad** |
| ✗ `tooloff` | Duel — "what makes 48?" | **10 plain questions on a keypad** |
| ✗ `scaffold` | Endless stacking arcade | **10 plain questions on a keypad** |
| ✗ `floorplan` | Tile the room — area model | **10 plain questions on a keypad** |

Two independent causes, and either alone is enough:

- `openMode` in `TradiesApp.kt` routes five keys and drops everything else into
  a generic `FullRoute.Run(style = Keypad)`.
- `QUESTION_COUNT` in `run-start` names seven modes; the rest hit `?? 10`.

Neither errors. **A child tapping Scaffold Stack, Cable Run and Ute Rally plays
the identical run three times, under three names and three card colours.** That
is the whole of why the mode list reads as unclear.

Underneath `job` there are also five job formats — `quick`, `delivery`,
`measure`, `build`, `muster` — so the true count of distinct things offered is
closer to twenty.

---

# Ideal state

Nine modes, four tabs, and nothing that renders a promise it can't keep.

## Structural changes

1. **Setup persists at every step.** Each screen posts as it completes, so a
   dropped connection loses one step rather than the whole tradie.
2. **Shop and Locker merge into one Gear tab** with two segments. They are the
   same screen — a filtered grid of cosmetic tiles — and two tabs for buying and
   wearing splits one idea across the nav bar.
3. **The Training Shed groups Practise / Play / Prove.** The trade names are good
   flavour and terrible labels; a child cannot tell "The Garage" from "The Yard"
   from "Toolbox Time" by name, ever. The group header carries the meaning.
4. **Expo becomes a leaderboard screen under Crew**, not a run mode. Challenge
   folds into Crew Race as its asynchronous form.
5. **The Big Job leaves the menu.** It is an assessment that arrives monthly.
6. **`openMode` has no silent fallthrough.** An unhandled mode says so.

## Target hierarchy

```
Entry
├─ Welcome
├─ Sign in
├─ Grown-up gate ──────► Parent account · More trades · Switch tradie · Accessibility
└─ Student picker

Setup (behind the gate, persisted per step)
├─ Add students ............. posts to `onboarding-signup` / `addStudent`
└─ Tradie maker ............. Look → Name → Meet, each saved as it completes

TABS  (four, not five)
├─ Site ..................... home · house project · trade zones
├─ Jobs ..................... job board · training shed
├─ Mastery .................. the grid
└─ Gear ..................... shop ⇄ locker, one tab, two segments

FULL SCREEN
├─ The loop ................. briefing → run → results
│
├─ PRACTISE  (no stakes)
│  ├─ The Garage ............ picks for you, by weakness
│  └─ Toolbox Time .......... you pick tables and operation, no clock
│
├─ PROVE  (ranked)
│  └─ The Yard .............. speed test → Trade Rank
│
├─ PLAY  (Godot)
│  ├─ Cable Run ............. route a value up and back down — division as inverse
│  ├─ Ute Rally ............. race with forks — recall speed plus risk appraisal
│  └─ Floor Plan ............ tile a room exactly — area model, unknown factor
│
├─ ARRIVES  (never picked from a menu)
│  ├─ Boss battle ........... intro → fight → victory, per finished zone.
│  │                          The only source of rare drops.
│  ├─ Crew race ............. lobby → race → expo leaderboard.
│  │                          Absorbs the old Challenge as its async form.
│  └─ The Big Job ........... monthly, shared with the teacher
│
├─ Move-in day .............. house completion celebration
├─ Try on ................... cosmetic preview before purchase
└─ Grandparent sticker ...... `/cheer` deep link, grown-ups only
```

## Retired

Kept in `MODE_LABELS` and in the `runs_mode_check` constraint so historical runs
still render and still count. Removed from `PRACTICE_MODES` and
`MODE_REQUIREMENTS` so they are never offered again.

| Retired | Absorbed by |
|---|---|
| `inspection` | The Yard, as its hard setting |
| `scaffold` | Ute Rally — and it was the one mode a modified client could never lose |
| `tooloff` | Floor Plan, which teaches factor decomposition earlier and better |
| `expo` | A leaderboard screen under Crew Race |
| `challenge` | Crew Race, as its asynchronous form |

## What each surviving mode must gain

| Mode | Needs |
|---|---|
| Job board | A `jobs` endpoint. The core loop's menu cannot stay a client-side stub. |
| Shop · Locker · Try on | `purchaseItem` / `equipItem`. Until then the economy has no sink. |
| Boss battle | A boss endpoint — brief, fight content, rare drop. `bossReady` stops being a proxy for Blue. |
| Crew race | A crew endpoint, and real racers. |
| Cable Run · Ute Rally · Floor Plan | `content` in `run-start` (§1.3), then the Godot scenes. |
| Toolbox Time | Deploy the `run-start` that honours `tables[]` and `operation`. |
| Site home | A streak column, and `jobsToday` off a real board. |
| Setup | `onboarding-signup`, `addStudent`, `saveLook`, `saveName`. |
| Grandparent sticker | `sendSticker`. |
