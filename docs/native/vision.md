# The vision, page by page

*Started 4 August 2026.* A working record of what the app should be, captured
screen by screen as it is decided. Distinct from [`README.md`](README.md), which
is the engineering plan, and [`screens.md`](screens.md), which is the inventory
of what exists. This is the product intent.

Sections are marked **decided**, **leaning** or **open**. Nothing here is built
until it appears in the plan of record.

---

# Cross-cutting — settled in the first pass

These came up while talking about the Site but govern everything.

## Two currencies, and they already exist

**decided**

| Currency | Earned by | Spent on |
|---|---|---|
| **Gold** | Jobs and games, capped daily | Tradie cosmetics; possibly some town cosmetics |
| **Bricks** | Daily jobs, capped by the number of daily jobs | The town — road pieces, building blocks, upgrades |

Good news on plumbing: `students.coins` and `students.house_loads` are both
already columns, `economy.ts` already computes materials alongside coins, and
`DAILY_COIN_CAP = 300` already exists as a *soft* cap (`CAPPED_RATE = 0.25` —
earning continues at a quarter rate past it). Bricks need no separate cap
because the daily job slots bound them structurally.

So this is a rename and a second shop section, not new economy.

## Streak points

**decided, with the arithmetic corrected**

As stated the numbers didn't close — a maximum of ten streak points cannot buy a
hundred-point item. The reading that makes it work, and matches "if you're at
nine streak points, missing a day takes you down to eight":

- **Streak tier** — 1 to 10. Goes up one per 10 consecutive days played. Goes
  down one per missed day. This is the number the player sees rising and falling.
- **Streak points** — the spendable balance. Each 10-day block pays out
  *tier* points.

At tier 10 that is 10 points per 10 days, so a 50-point item is roughly two
months of consistent play and a 100-point item three to four. That reads
correctly for "very special items or buildings".

The gentleness is the point: one missed day costs one tier, not the streak.

## Two progression ladders. Trade Rank is removed

**decided**

| Ladder | Driven by | Means |
|---|---|---|
| **Table unlocks** | Mastery — fast, merit-based | What you are allowed to practise |
| **City level + XP** | Daily jobs — slow, habit-based | How much town you have earned |
| *(Mastery stage)* | Per fact | The underlying truth both read from |

The important consequence: **tables and levels deliberately decouple.** A quick
child races up the tables without racing up the city, and a steady child builds
a fine city on ×2. That is what resolves "don't hold them back" against "reward
turning up every day" — they are different rewards on different clocks.

**Trade Rank is gone.** Two numbers that both mean "how good am I" is one too
many. Three things depended on it:

- **Nine of the 35 shop items** gate on `requiresRank` 4–9 — Legend Gold,
  Foreman's Jacket, Master's Kit and five utes. These move to **city level**,
  which is a strict improvement: §1.8 already complained that rank is volatile
  and can go *down*, so a gate that vanishes reads to a child as punishment.
  Level only rises.
- **`tool-off.ts` gates rivals on `unlocksAtRank`** — moot unless Tool-Off
  survives the roster.
- **The Yard has no reason to exist**, being a speed test whose only output was
  a rank. **Proposal: The Yard becomes the countdown game** — same job, better
  format. A high score you chase, rather than a number that can drop. Absorbed,
  not deleted.

## Placement, and no coasting

**decided**

**The onboarding quiz.** The child ticks **any and all tables from 1 to 12** they
say they already know, then sits a **25-question quiz drawn randomly across the
ticked set**. The result assigns a **starting city level**, and they progress
from there. Better than a three-way self-report, because it produces evidence.

- If the ticked set is small — one or two tables — 25 questions across it is
  repetitive. Scale the count to the set size rather than always asking 25.

**Doing well does not hand out paid tables.** A child who aces the quiz is told
plainly: **×1, ×2 and ×10 are unlocked, along with every game mode, and a
grown-up needs to help open the rest.** Credit is given for what they
demonstrated — the result still sets their starting level — but access stays
gated. This is the one place in the student app where the ceiling is stated
out loud, and it still names no price: it points at a grown-up, not a store.
- If a child answers a newly-unlocked table all-correct inside three seconds,
  the end-of-round screen offers **"Too easy — unlock the next set"**.
- 100% on a table's Quick Job promotes to the next number automatically. Not the
  next level; the next number.
- Parents are notified of **sudden drops** in performance — possible sandbagging,
  possibly something else worth a grown-up knowing. Parent-facing push only,
  consistent with §2.9's rule that nothing pushes to the child app.

---

# Page 1 — The Site (main page)

## Navigation

**decided.** Five tabs stay: **Jobs · Mastery · Site · Shop · Locker**. The
four-tab Shop/Locker merge proposed in [`screens.md`](screens.md) is rejected —
buying and wearing are separate acts and deserve separate homes.

## The buttons

**decided**

| Button | Verdict |
|---|---|
| **Start Work** → the job | Keep as is. Works. |
| **Boss Battle** | Keep. |
| **Crew Race** | Keep the button, **change the label** — it should open a *multiplayer page*, not drop you straight into a race. |

## Sparky's City

**decided in outline, open on form**

Replaces "Sparky's Cottage". The header panel loses its **percentage** and gains
a **level and an XP bar** showing progress to the next level.

Tapping it is a mode change, not a navigation:

1. Start Work, Boss Battle and Crew Race **wipe down off the screen**.
2. The city, previously a strip at the top, **becomes the screen**.
3. A **building panel** rises from the bottom — the blocks you own, ready to place.
4. Click-drag rotates the town.
5. A link through to the shop sits in that panel.

**Open: house builder or mini city builder?** Leaning city. Assets are being
looked at now, and the answer depends partly on what is available.

This replaces `HOUSE_STAGES` and `stageProgress` in `progression.ts` — a linear
stage bar becomes a spatial grid with placeable, purchasable pieces.

## The city editor

**decided**

- **Isometric on a 3D plane.** Click-drag to rotate around the main axes.
- **Zoom in and out.**
- **Click and drag from an inventory onto the grid**, and **easily editable** —
  pieces can be moved and removed after placing, not just dropped once.
- **The city is alive.** The child's own tradie and random NPCs walk the roads
  and in and out of buildings; cars drive along the roads.

> ⚠️ **Drag cannot be the only way to place a piece.** "Dragging is never
> required" is a standing rule of this product (WCAG 2.2 SC 2.5.7), and §2.7
> records how Measure Up already handles it: the drag was added *on top of*
> tap-then-tap, which stays the primary route and is the only one a screen
> reader or switch device can take. The editor needs the same shape — tap a
> piece in the inventory, tap a cell to place it. Zoom needs buttons as well as
> pinch, for the same reason.

## The grid grows with the tables

**decided.** The city starts at **5 × 5**. It grows to **6 × 6** when both hold:

1. ×6 is unlocked, **and**
2. 6 × 6 has been answered correctly **at least 6 times**.

Both are already queryable — `fact_mastery` is keyed `(student_id, a, b)` with a
`correct` counter, so this is a single-row lookup. Worth noting that 6 × 6 is
also immune to the `7×10` / `10×7` canonicalisation bug flagged in the README,
being its own commutation.

**Open: does this generalise?** The obvious reading is *n × n unlocked and
n × n answered correctly n times → an n × n city*, which is a lovely rule and
ends at a 12 × 12 city of 144 tiles — the same 144 as the mastery grid. That
symmetry is either the best thing in the design or one grid too many. Needs a
decision on where it stops.

---

# Page 2 — The Job Board

**decided in outline**

## Daily Jobs

A named category holding the day's work. Four slots:

| Slot | Content |
|---|---|
| 1 | **Quick Job** — always present |
| 2 | **Mixed Muster** — always present |
| 3–4 | **Random single-player games**, random numbers |

**Quick Job is 12 questions**, cycling a single table from ×1 to ×12. It is the
promotion gate: 100% here moves the child to the next number.

**Mixed Muster** stays a daily slot *and* is the same generator behind Toolbox
Time's default. One content model, two framings — assigned when it arrives on
the board, chosen when opened from the shed. That is not a duplicate.

## Every card shows what it pays

**decided.** Both currencies, on the card, before the child commits: **how much
gold** and **how many bricks**. Today the board shows neither, and it is a
`Storyboard` stub besides.

---

# Page 3 — The Training Shed

**decided in outline, roster open**

## The real problem was hierarchy, not count

Recorded plainly because it corrects the earlier rescope: the trouble with the
mode list is that **the modes are not all on the same level** and were presented
as though they were. Ten cards in one flat list, some of which are daily
assignments, some practice, some games, some social.

So the count goes back up — **3–4 solo games plus a multiplayer zone** — and the
fix is the hierarchy, not deletion.

What still stands from the cut: `inspection` (it is The Yard with different
constants) and `expo` / `challenge` as *run modes* (they are wrappers, and
become screens). What is reopened: the solo game roster.

## Sections

```
TRAINING SHED
├─ PRACTICE
│  └─ Toolbox Time ......... opens on Smart Practice by default. The child must
│                            opt out to choose specific tables. Absorbs the old
│                            Garage (smart practice) and the Mixed Muster mix.
├─ PLAY  (3–4 solo games, roster TBD)
│  └─ Games count toward mastery and are measured, but weighted **lower** than
│     daily jobs — practice should not be worth less than play.
└─ MULTIPLAYER ZONE
   ├─ 1 cooperative game
   └─ 3 competitive games
      Play with friends; fill empty slots with bots via a button along the lines
      of **"Get instant contractors"**.
```

## Games on the table

**open** — to be worked through properly once the structure is fixed.

Wanted so far:

- **The countdown** *(new)* — starts at 10 seconds per question and drops 0.1s
  each question: 9.9, 9.8, … down to 1.0s, then holds at one second until the
  child misses. Score is the number of questions answered. A pure high-score
  chase.
- **Measure Up** *(exists)* — the matching game. Already built as the `measure`
  job format using `matchPairs` in `questions.ts`, with a `match-board.tsx` on
  web. It is currently a job format, not a mode; it could be either.
- Existing candidates: Cable Run, Ute Rally, Floor Plan, Scaffold Stack,
  The Tool-Off.

Multiplayer games: **TBD.**

---

# Page 4 — Bosses and levels

**decided in outline**

- Jobs from the board earn progress toward **levels**. Each level ends with a
  **boss**.
- All bosses work **roughly the same way** with **different character design** —
  one mechanic, many faces. Cheaper to build and easier for a child to learn.
- The boss has **HP**, construction-themed. HP is a *rendering* of the answer
  log; the server still recomputes the outcome, so a boss cannot be beaten by a
  modified client.
- Defeating a boss grants **unlocks**.

## The first fifteen minutes

**decided, and it is the sharpest constraint in this document**

- The first boss is effectively a **tutorial boss**. Only ×1 is available up to
  it. The goal is UI familiarity, not maths.
- A child can plausibly reach it on **day one**, after clearing the daily jobs.
- Beating it advances **a full level**.
- **The whole feature set should be visible inside 10–15 minutes.**

---

# Page 5 — The Shop

**decided in outline**

Three sections, split by what pays for them:

| Section | Currency | Contents |
|---|---|---|
| **Player** | Gold | Tradie cosmetics — hats, hi-vis, belts, utes, accessories |
| **City** | Bricks | Road pieces, building blocks, building upgrades |
| **Streak** | Streak points | Special items and buildings, 50–100 points |

Reachable from the tab bar and from the city building panel.

---

## The free tier locks numbers, not modes

**decided**

A capable child exhausts the free tier on day one. **That is accepted and
intended** — it is the strongest conversion moment the product will ever get,
and it lands after the child has seen everything the game does.

**Every game mode stays open to everyone.** The paywall locks *numbers*, never
features. A free player has ×1, ×2 and ×10 and plays every mode with them.

One consequence to watch: `MODE_REQUIREMENTS` gates modes on *zones unlocked*,
so a free player capped at three zones can never reach a five-zone mode. That is
still a lock on numbers rather than a lock on features, but the roster's
thresholds need setting against **three zones as the free ceiling** so the shed
does not read as half-padlocked to a paying-nothing player.

---

# Godot: injected, not the whole app

**decided.** See the response record in
[`rescope.md`](rescope.md) for the accessibility argument. The rule:

> **Godot is a rendering layer inside Compose, never a replacement for it.**
> Compose keeps every control, because Compose is what publishes the
> accessibility tree.

Three tiers, sorted by how much *discrete state* the screen has:

| Tier | Screens | Godot owns | Compose owns | Accessibility cost |
|---|---|---|---|---|
| **1 — decorative** | Home city, tradie in locker / try-on | The pixels | Every button, composited on top | **None.** The city is one node: *"Sparky's City, level 4"*. A picture is allowed to be a picture. |
| **2 — discrete state** | City editor, boss battles | The pixels | Controls **plus a parallel accessible view** off the same state | **Low.** 25 grid cells or a question + HP bar is small enough to represent twice — `MasteryGridScreen` already does this for 144 cells. |
| **3 — continuous** | The arcade games | Interaction itself | The shell around it | **Open.** Still the question from `rescope.md` — but now scoped to the games alone, which is a far more defensible "optional content" claim than when it threatened the home screen. |

## Two technical constraints that follow

- **One Godot instance, many scenes.** Godot on Android is effectively a
  singleton per process. The city, the editor, a boss and a game are all scenes
  in **one project**, and the shell says "show scene X with payload Y". Design
  the bridge that way from the start; do not plan on spinning up an engine per
  screen.
- **It boots once, at app start, and stays alive.** Forced by putting the city
  on the home screen — and a benefit, because games then launch instantly
  instead of paying engine boot on every entry. The cost is battery, so the city
  renders at a low idle frame rate and only goes full speed while being dragged.

---

# Open questions

### 1. What are the solo and multiplayer games?

Roster deferred by agreement until the structure is settled. Now includes the
countdown game as The Yard's replacement.

### 2. House builder or city builder?

Still open, pending assets. See Page 1.

### 3. Does the city grid keep growing past 6 × 6?

See Page 1. *n × n* is the obvious generalisation and ends at 144 tiles.
