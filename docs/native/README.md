# Going native — Android first, iOS second

The plan for taking *Times Table Tradies* from a Next.js web app to two native
clients — Kotlin/Compose and Swift/SwiftUI — sharing one Supabase backend.

```
                        Supabase
              same database · same auth · same rules
                    ▲                     ▲
                    │                     │
              Android                  iPhone
              Kotlin                   Swift
              Compose                  SwiftUI
```

Android ships first. Nothing in the Android build may be written in a way that
has to be undone for iOS — that constraint is what most of Part 2 is about.

---

## Build status

Part 1 is under way. What is written and tested in the repo today:

| Section | Status |
|---|---|
| §1.7 ×1 tutorial zone | ✅ `zones.ts`, migration `0003` |
| §1.8 Mode unlocks | ✅ `modes.ts` — `MODE_REQUIREMENTS`, `modeAvailability` |
| §1.9 Difficulty-weighted rewards | ✅ `difficulty.ts`, wired through `questions.ts` and `finishRun` |
| §1.6 Entitlement model | ✅ `entitlement.ts`, migration `0004` |
| §1.10 Gate enforcement | ✅ `run-start` refuses locked modes and unentitled tables; `run-finish` re-checks |
| §1.1 Edge Functions | ⚠️ `run-start`, `run-finish`, `modes`, `mastery`, `house` live. Rules reach Deno via `npm run edge:sync` |
| §1.2 Web app onto the API | ⬜ **Not started — two write paths exist right now** |
| §1.3 Board delivery | ⚠️ Done for question modes (`pending_runs`). Puzzle boards still to come |
| §1.4 Auth / JWT student claim | ⬜ Not started |
| §2.1–2.2 Android project + modules | ✅ Gradle 8.11.1, AGP 8.7.3, Kotlin 2.1, compileSdk 35 |
| §2.3 Toolbox Pop in Compose | ✅ Primitives, hard shadows, Titan One / Nunito / Space Mono bundled |
| §2.4 Navigation | ✅ Type-safe routes, session-gated: sign-in → picker → hub |
| §2.5 Screens | ⚠️ Sign-in, picker, hub, runner, results, grid, house, settings. ~32 to go |
| §2.6 The five game modes | ⬜ Blocked on §1.3 |
| §2.7 Accessibility | ⚠️ Reduced motion, text scale, timer mode work. Read-aloud, high contrast, dyslexic font not built |
| §2.8–2.9 Offline, billing | ⬜ Not started |
| Part 3 iOS | ⬜ Not started |

The Android app signs in, reads real data over RLS, is handed a run by the
server, plays it, and has the server mark and bank it. Verified end to end on a
device. There is no question generator and no scoring on the client at all.

**The live gap:** `finishRun` now exists twice — as a server action in
`src/lib/actions/play.ts` and as `supabase/functions/run-finish`. That is
exactly the duplication §1.2 exists to prevent, and it should not survive long.

The free-tier ceiling card is built (`atFreeCeiling`), but **untested** — the
test account sits exactly on the ceiling and it has not been confirmed to
render. Worth checking before the free tier ships to anyone: a child whose
coins stop with no explanation reads it as the game breaking.

## Contents

- [Part 0 — Decisions to lock before any code](#part-0--decisions-to-lock-before-any-code)
- [Part 1 — Server work (platform-neutral, do first)](#part-1--server-work-platform-neutral-do-first)
- [Part 2 — Android](#part-2--android)
- [Part 3 — iOS](#part-3--ios)
- [Part 4 — Cross-cutting](#part-4--cross-cutting)
- [Part 5 — Sequencing](#part-5--sequencing)
- [Decisions taken](#decisions-taken)
- [Open questions](#open-questions)

---

# Part 0 — Decisions to lock before any code

Six decisions. Each one is expensive to reverse after a client exists.

### 0.1 The rules stay in TypeScript, on the server

`src/lib/game/` is 23 files of pure, tested TypeScript and it is the product.
It does not get ported to Kotlin, and it does not get ported to Swift. It moves
to **Supabase Edge Functions** (Deno/TypeScript), where it can be imported
directly and the existing `npm test` suite keeps covering it.

The alternative — reimplementing the ladder, the economy, the scoring and the
five mode rulesets in three languages — means three sources of truth for how a
child's coins are calculated. Rejected.

### 0.2 Content is delivered, not seeded

This is the change that makes the diagram true, and it must land before either
client is written.

Today the client receives a *seed* and expands it into a board. `cable-run.ts:8`:

> Pure and seeded: a board is reproducible from its seed, and a whole session
> replays from `(seed, difficulty, moves[])`.

Both sides run `makeRng()` (`questions.ts:98`) — an FNV-1a hash feeding a
mulberry32 variant built on `Math.imul` and `>>>`. A Kotlin and a Swift port of
that would have to agree with the TypeScript bit-for-bit, forever, or
legitimate runs fail verification.

**New contract:** the server generates the board and sends it as JSON. The
client renders what it was handed and posts back the interaction log. The
server still recomputes the payout — the trust model is unchanged, only the
expansion moves.

Applies to `cable-run`, `rally`, `tool-off`, `floor-plan` and the question
sequence for every question-and-answer mode. See §1.3.

### 0.3 Client architecture: pure-Kotlin core now, KMP decision deferred

Do **not** commit to Kotlin Multiplatform today. Do build the Android app so
that adopting it later is a build-file change rather than a rewrite:

> `:core:model`, `:core:network` and `:core:data` must have **zero Android
> dependencies**. No `Context`, no `android.*` imports, no Android-only
> libraries. Enforced in CI (§4.2).

If those modules stay clean, converting them to KMP at iOS time is cheap. If
they don't, iOS starts from nothing. Every library choice in §2.1 is picked to
keep that door open.

### 0.4 Design tokens get one source of truth

Toolbox Pop currently lives in `globals.css` `@theme` — 40-odd colours, three
font families, four shadows. Three platforms reading three hand-maintained
copies will drift within a month.

Move the tokens to a `design/tokens.json` and generate:

| Target | Output |
|---|---|
| Web | the `@theme` block in `globals.css` |
| Android | `PopTokens.kt` — `Color`, `TextStyle`, shadow specs |
| iOS | `PopTokens.swift` |

Style Dictionary or a 100-line script — the tool matters less than the rule
that nobody hand-edits the generated files.

### 0.5 Active student becomes a JWT claim

Today `ttt_student` is an httpOnly cookie (`src/lib/data/session.ts:20`). The
client *cannot* set it, which is what makes "kids never hold credentials"
structurally true rather than a UI convention.

A native app holds the parent's session in Keychain/EncryptedSharedPreferences
and talks to Postgres directly through RLS. Without a replacement, any RLS
policy scoped to *family* lets a modified client — or a curious eight-year-old —
write to a sibling's row and spend their coins.

**Replacement:** a Supabase **custom access token hook** stamps `student_id`
into the JWT. Selecting a profile calls an Edge Function that validates family
membership and refreshes the session; RLS policies for coins, purchases,
cosmetics and runs key off `auth.jwt() ->> 'student_id'` rather than family
alone.

This tightens the web app too — do it there in the same change.

### 0.6 Entitlement is channel-agnostic; web is the primary channel

The product is freemium — ×1, ×2 and ×10 free, everything else paid (§1.6) —
and the business goal is to convert parents on the **web**, where there is no
store commission, rather than through IAP.

That works, but only if entitlement is modelled as a single server-side fact
that any channel can grant:

```
entitlements  (family_id, tier, channel, status, expires_at, external_ref)
              channel ∈ { web_stripe, apple, google }
```

The client never decides what a family is entitled to; it asks. Every purchase
channel writes the same row, and every enforcement point (§1.6) reads it without
caring which channel paid.

Getting this wrong in either direction is expensive: entitlement derived from a
StoreKit receipt on iOS and a Stripe subscription on web means two sources of
truth and a support queue full of "I paid on the website and the iPad says
locked."

### 0.7 Subscription SKUs get flattened

`billing.ts` prices as base + per-extra-child (`$50/yr` first tradie, `$25/yr`
each additional). Play supports multi-quantity subscriptions; App Store
auto-renewable subscriptions do not. A per-seat model cannot be expressed
identically on both stores.

**Flatten to tiers:** 1–5 tradies × annual/monthly = 10 products, priced to
match the current formula. `subscriptionTotalCents()` becomes the table that
generates the store price points rather than a runtime calculation. Web keeps
the formula and can stay per-seat if you want, since Stripe handles it fine —
but keeping all three channels on the same 10 tiers makes support and migration
between channels far simpler.

Price the store SKUs **higher** than web to offset the commission. This is
permitted on both stores — neither requires price parity with your own site.

---

# Part 1 — Server work (platform-neutral, do first)

Roughly 3–4 weeks. Ends with the existing web app running unchanged against the
new API, which is how you know it's right before any Kotlin exists.

### 1.1 Extract the write path to Edge Functions

23 server actions across 8 files become HTTP endpoints. They keep their current
bodies — the Supabase client and the `lib/game` imports port straight across;
what goes is `revalidatePath`, `cookies()` and `redirect()`.

| Source | Endpoints |
|---|---|
| `actions/auth.ts` | sign-up, sign-in, sign-out *(mostly native SDK — see §1.4)* |
| `actions/onboarding.ts` | `addStudent`, `removeStudent`, `saveLook`, `saveName`, `selectStudent` |
| `actions/play.ts` | **`finishRun`**, `unlockNextZone` |
| `actions/shop.ts` | `purchaseItem`, `equipItem` |
| `actions/family.ts` | `createInvite`, `redeemInvite`, `removeCrewLink`, `updatePlan`, `sendSticker` |
| `actions/challenge.ts` | `sendChallenge`, `attachChallengeRun` |
| `actions/classroom.ts` | `createClassroom`, `setAssignment` |
| `actions/settings.ts` | `saveSettings` |

`finishRun` (`actions/play.ts:130`, ~340 lines) is the important one — it is the
anti-cheat boundary and the only place coins are minted. Port it first, port it
carefully, and give it the heaviest contract-test coverage (§4.3).

**Reads stay on the client.** `lib/data/student.ts` is 15 straightforward
Supabase queries already protected by RLS. Native clients query Supabase
directly via the SDK — no endpoint needed, no serialisation layer to maintain.
`recordMastery` and `maybeUnlockNextAdvancedTable` are the exceptions: they
write, so they stay server-side inside `finishRun`.

### 1.2 The web app becomes a client of its own API

Rewrite the server actions as thin callers of the Edge Functions. This is the
step that proves the API is complete, and it means there is exactly one write
path for all three clients from here on. Skipping it leaves you maintaining two.

### 1.3 The board-delivery change

Per §0.2. Two endpoints replace seed handoff:

```
POST /run/start   { studentId, mode, config }
                → { runId, content, expiresAt }

POST /run/finish  { runId, answers[], moves[], route[] }
                → { coins, materials, mastery, rank, unlocks }
```

`content` is the fully-expanded board — cells, connectors, targets, legs, the
bot field, the question sequence. Server persists what it sent (a `pending_runs`
row keyed by `runId`) so `/run/finish` verifies against the exact board the
child played rather than re-deriving it.

Per-mode notes:

- **Cable Run / Floor Plan** — untimed puzzles. Full board up front. Trivially
  offline-friendly once fetched.
- **Ute Rally** — legs, forks and `botDistance` per racer all precomputed and
  sent. `replayRally` verifies against the stored field.
- **The Tool-Off** — belt, targets and shields delivered; the duel reducer runs
  client-side for responsiveness, outcome recomputed from the answer log.
- **Scaffold Stack** — the tilt model is per-frame physics and *must* stay
  client-side. That means a modified client need never topple. `scaffoldReward`
  already computes payout from the answer log, and `economy.ts`'s daily coin cap
  bounds the exposure; add a minimum-milliseconds-per-question sanity check
  server-side and accept the residual risk. Document it rather than
  over-engineer it — the worst case is a child cheating themselves out of
  practice, and the cap means they can't mint meaningful currency.

### 1.4 Auth

Supabase's native SDKs handle sign-in, refresh and persistence, so `signIn` and
`signOut` are SDK calls rather than endpoints. What survives server-side:

- `signUpParent` — creates the family row and membership alongside the user
- the custom access token hook from §0.5
- `selectStudent` — validates and re-mints the token

`proxy.ts` has no native equivalent; route gating becomes navigation guards on
each client (§2.4).

**The grown-up gate** (`newGateChallenge()`, `seed.ts`) moves client-side. It is
a speed bump against children, not a security boundary, and Apple requires it
before purchase and external-link flows — so it must work offline. Generate it
locally, keep the 13–18 × 12–17 range that sits outside what the app teaches.

### 1.5 Schema additions

```sql
-- pending_runs: the board as delivered, for verification at finish
-- entitlements: subscription state per family, channel-agnostic (§0.6)
-- push_tokens: device tokens, per user, per platform
-- deletion_requests: account deletion audit trail (§4.6)
```

Plus the RLS policy rewrite from §0.5 — the `students`, `student_cosmetics`,
`student_rare_items`, `runs`, `answers` and `fact_mastery` policies move from
family-scoped to student-claim-scoped for write.

### 1.6 The free tier

**Free: ×1, ×2, ×10. Everything beyond that is paid.**

**The good news: this boundary already exists.** `DEFAULT_UNLOCK_ORDER` in
`zones.ts` is `[2, 10, 5, 3, 4, 8, 6, 9, 7, 11, 12]` — the free tables are
*exactly the first two zones in the curriculum order*. The paywall lands
naturally at the third unlock, ×5 / Plumbing. No reordering, no re-teaching, no
change to the pedagogy. A free player walks the intended path and stops where
the curriculum takes its third step.

### 1.7 ×1 becomes the tutorial zone

`TRADE_ZONES` currently starts at ×2. Add ×1 at the front:

```ts
{ table: 1, trade: "Labouring", accent: "yellow",
  blurb: "Fetching, carrying and learning the ropes." },
```

*Labouring* is the honest trade-themed name for where an apprentice actually
starts, and ×1 is the identity — so the maths load is zero while the child
learns the keypad, the submit gesture, the results screen and the shape of a
job. That is exactly what a tutorial zone is for.

Unlock order becomes `[1, 2, 10, 5, 3, 4, 8, 6, 9, 7, 11, 12]`, and the free
tier is still precisely the first three.

**×1 is a first-class table.** It counts toward zone thresholds, it earns coins,
it fills the mastery grid, and it feeds Trade Rank exactly like every other
table. Trivial is not the same as absent — it is a multiplication fact and the
curriculum teaches it, so no carve-outs. This also keeps the code honest: a
special case for one table would need honouring at every count, filter and
aggregate in `lib/game`, and would be forgotten in one of them.

**But "counts as a fact" is not "belongs in every generator."** The existing
`t >= 2` filters in `cable-run.ts:346`, `floor-plan.ts:147` and
`tool-off.ts:116` are about *puzzle quality*, not about whether ×1 is real
maths — a ×1 or ÷1 connector is a no-op move, a 1-wide room isn't a room, and a
belt containing 1 gives nothing to decompose. **Keep those filters.** Two places
need the same treatment:

- **`rally.ts:58` `legTables` doesn't filter** — ×1 would leak into races as
  free distance. One-line fix, matching the other three.
- **`canPlayCableRun` (`cable-run.ts:338`) counts unfiltered tables** —
  `unlock.tables.length >= 2`. A child with `{1, 2}` passes the check, then
  `generateBoard` filters to `{2}` and tries to build a board from a single
  table. Availability checks and generators must filter identically.

Audit every `unlock.tables.length` and `unlockedTables` count against this —
`floor-plan.ts:520` `difficultyFor` is the other one. Adding a zone that the
generators don't use shifts every one of those counts by one.

**Known consequence: Trade Rank inflates slightly at the low end.** The Yard
draws from the player's unlocked range and maps average milliseconds onto the
ladder, so a pool containing ×1 answers faster. It is worst on the free tier,
where the whole pool — ×1, ×2, ×10 — is the three quickest tables in the set.

This is an existing property being amplified rather than a new bug: rank has
always been measured relative to what you've unlocked, and a player with only
×2 already had an easy pool. Accept it, but know that **free-tier and paid-tier
ranks are not comparable**, which matters for the crew leaderboards and for
anything the parent dashboard presents as progress.

### 1.8 Mode unlocks

Every mode declares what it needs. Locked modes are **shown, not hidden**, with
the unmet requirement as the label.

**Gate on zones unlocked, not Trade Rank.** `rankFromYardResult` recomputes rank
from a *single* Yard run and can return a lower number than last time — it is a
volatile fluency measure, not a progression counter. A mode that vanishes after
one bad speed test reads to a seven-year-old as punishment or breakage. Zones
unlocked is monotonic and already means "how much of the game you have opened".

> **Related fix:** `tool-off.ts` gates rivals on `unlocksAtRank`, which has the
> same disappearing problem. Store a **high-water rank** on the student and have
> everything rank-gated read the peak, never the current value. Cheap, and it
> fixes both.

```ts
export type ModeRequirement = {
  /** Zones unlocked before the mode becomes playable. */
  zones: number;
  /** Some modes need division as well. */
  division?: boolean;
};
```

| Mode | Zones | Also needs | Free tier? |
|---|---|---|---|
| Job board | 1 | — | ✅ |
| The Garage | 1 | — | ✅ |
| Toolbox Time | 2 | — | ✅ |
| The Yard | 2 | — | ✅ |
| Site Inspection | 2 | — | ✅ |
| Scaffold Stack | 2 | — | ✅ |
| Ute Rally | 2 | — | ✅ |
| Crew Race · Expo · Challenge | 3 | — | ✅ |
| Cable Run | 3 | division on ≥1 table | ✅ |
| Boss Battles | per-zone | that zone completed | ✅ for free zones |
| The Tool-Off | 5 | — | ❌ |
| Floor Plan | 5 | — | ❌ |
| The Big Job | 6 | — | ❌ |

The thresholds are set by what each mode needs to be *honest*, not by what
converts. At five zones (×2, ×3, ×5, ×10 usable) Floor Plan has ten distinct
rooms to tile and The Tool-Off has a belt with real factor pairs in it; below
that both are the degraded versions worth refusing. `canPlayCableRun` already
models "refuse rather than degrade" and stays as the second check.

**This is the whole paywall, and it never mentions money.** Free caps at three
zones, so a free player sees *"Floor Plan — unlocks with 5 trades"*. That is a
progression goal, not a price tag. The child sees something to work toward; the
parent, above the grown-up gate, sees that more trades need a subscription. The
"money is structurally absent from the student app" rule holds completely, and
your instruction — free players get everything within their allowed levels —
falls out of it with no special-casing at all.

**Two layers of teaching.** The ×1 zone teaches core input. Each mode gets its
own first-run tutorial when it unlocks — you cannot teach Cable Run's routing in
the ×1 zone, because Cable Run isn't unlocked yet. Budget a lightweight,
skippable, replayable-from-settings tutorial per mode.

### 1.9 Difficulty-weighted rewards

Today the economy is flat: the job board pays `questions * 6 * mult`
(`questions.ts:362`) and The Garage pays `GARAGE_COINS_PER_CORRECT = 10` per
correct answer regardless of what the answer was. 7×8 and 2×1 pay the same.

Two rules replace that: **reward scales steeply with fact difficulty**, and
**mastered trivial facts stop paying**.

**Difficulty is per-fact, not per-table.** 7×8 is hard, 7×10 is easy, 7×1 is
free — a table-level weight would pay the same for all three. New module,
`lib/game/difficulty.ts`:

```ts
/** Per-operand difficulty, 0–1. Rule-based operands score near zero. */
const OPERAND: Record<number, number> = {
  1: 0.00,   // identity
  10: 0.05,  // append a zero
  2: 0.15,   // doubling
  5: 0.25,   // ends in 0 or 5
  11: 0.30,  // repeated digit (to 9)
  3: 0.45,
  9: 0.50,   // digit-sum trick
  4: 0.55,   // double-double
  6: 0.80,
  12: 0.85,
  8: 0.90,
  7: 1.00,
};

export function factDifficulty(a: number, b: number): number {
  const d = (OPERAND[a] ?? 1) * (OPERAND[b] ?? 1);
  // Squares are better anchored than their operands suggest.
  return a === b ? d * 0.8 : d;
}

/** 1× at the floor, ~8× at 7×8. Steep, per "weight harder much more". */
export function coinWeight(a: number, b: number): number {
  return 1 + 8 * factDifficulty(a, b);
}
```

Commutative for free, which is correct — 7×8 and 8×7 are one fact. The numbers
are a defensible starting point, not gospel; tune them against real play.

**Mastery decay, and the trap in it.** The obvious implementation — mastered
facts pay nothing — would fight the spaced-repetition system. `mastery.ts` has
`REVIEW_INTERVAL_DAYS` resurfacing Blue facts every 10 days *by design*, so
regression gets caught, and `hasFullBlueGrid` gates tables 13+ on that staying
true. Pay zero for Blue and children will avoid Blue facts, retention rots, and
the grid destabilises.

**Pay for the check-in, not the repetition:**

| Stage | Multiplier |
|---|---|
| none · bronze | 1.0 |
| silver | 0.9 |
| gold | 0.6 |
| blue, **due** for review | 0.4 |
| blue, not due | 0.05 |
| blue + `factDifficulty < 0.05` | **0** |

`isDueForReview` already exists and already gates `retentionHits`. This makes
the economy mirror the rule `applyAttempt` states in its own comment — *"only
due check-ins count, so hammering one fact in a single sitting can't fast-track
it to Blue"* — so grinding pays nothing while the check-in the system actually
wants stays worth doing.

That last row is your ×1 rule. The whole ×1 row sits at difficulty 0, so once
mastered it pays literally nothing, forever. Nothing is being retained — ×1 is
a rule, not a recalled fact.

**Weight materials the same way**, or children will grind easy facts to build
the house even when coins dry up.

**One function, three consumers.** `factDifficulty` should also feed:

- **Trade Rank** — this is the fix for the rank inflation flagged in §1.7.
  Normalise the Yard's `avgMs` by the difficulty of the facts it actually
  asked, and free-tier and paid-tier ranks become comparable again.
- **`practiceWeight`** (`mastery.ts`) — currently keys off mastery stage alone.
  A fact that is both intrinsically hard *and* at Bronze should surface most.

**The free tier hits an economic dead end, and that needs to be a choice.**
Free is ×1, ×2 and ×10 — precisely the three lowest-difficulty tables. Under
difficulty weighting they earn a fraction per question, and under mastery decay
a child who masters all three earns *almost nothing at all*.

That is a very strong conversion mechanic and it may be exactly what you want.
But it must be deliberate, and it must be presented rather than silently
starving: *"You've mastered everything in these trades — ask a grown-up to open
more."* A child watching their coins stop with no explanation reads it as the
game breaking.

Recommend keeping the `blue, due` multiplier non-zero for ×2 and ×10 so free
play trickles rather than flatlines. It converts about as well and it is kinder.

**Where this lands:** `lib/game`, tested, before the native port — `finishRun`
is being touched in §1.1 anyway, and both clients should inherit the finished
economy rather than a changing one. The client needs per-question values only
to *display* them, so `/run/start` sends them with the content (§1.3) and
`/run/finish` recomputes authoritatively.

### 1.10 Enforcing both gates

Neither gate is expressible as RLS — "×5 requires an entitlement" and "Floor
Plan requires five zones" are both Edge Function logic. The checks live at:

- **`/run/start` — refuse to generate content for an unentitled table or an
  unmet mode requirement. This is the load-bearing one.** Everything else is UI.
- job board generation — draw only from entitled tables
- `unlockNextZone` — refuse to unlock past the free set without entitlement
- mode availability — the server returns the list with each mode's state
  (`playable` / `locked` + reason). Don't compute it client-side; three clients
  computing it independently is three chances to disagree with the server that
  will actually refuse the run.

**The escalation path, for both kinds of lock:**

```
child taps a locked zone
  → "Ask a grown-up to open more trades"   (no price, no store button)
  → grown-up gate  (existing /gate, works offline)
  → parent-facing upgrade screen

child taps a mode locked on progression
  → "Unlocks with 5 trades"                (no gate, no grown-up, no money)
  → back to playing
```

Only the first crosses the gate, and money exists only above it.

---

# Part 2 — Android

### 2.1 Stack

Every choice here is KMP-viable, per §0.3.

| Concern | Choice | Why not the obvious alternative |
|---|---|---|
| UI | Compose + Material 3 | M3 as *scaffolding only* — Toolbox Pop overrides nearly all of it |
| Navigation | Navigation Compose, type-safe routes | — |
| DI | **Koin** | Hilt is Android-only; Koin is KMP |
| Networking | **Ktor client** | Retrofit/OkHttp are JVM-only; `supabase-kt` uses Ktor anyway |
| Supabase | `supabase-kt` | KMP, community-maintained, tracks the JS SDK closely |
| Local DB | **Room** (KMP support, 2.7+) | SQLDelight also fine; Room's KMP story is now solid |
| Serialization | kotlinx.serialization | — |
| Images | Coil 3 | KMP |
| Async | Coroutines + Flow | — |

### 2.2 Module structure

```
:app                     Compose entry, nav host, DI wiring
:core:designsystem       Toolbox Pop — theme, tokens, primitives
:core:model              ← pure Kotlin, no Android
:core:network            ← pure Kotlin, no Android
:core:data               ← pure Kotlin, no Android  (repos, cache, sync queue)
:core:testing
:feature:onboarding      A3–A7
:feature:play            hub, runner, keypad, job board, mastery
:feature:modes           the five game modes
:feature:shop            shop, locker, try-on
:feature:house           house building, zones
:feature:crew            crew, race, expo, challenges
:feature:dashboard       parent + teacher (H)
:feature:settings        I1 accessibility
```

The three marked modules are the iOS inheritance. Guard them (§4.2).

### 2.3 Toolbox Pop in Compose

`pop.tsx` is the whole visual language and it ports first — every screen depends
on it, and getting it right once is what stops 40 screens drifting.

**Hard shadows are the one genuinely tricky bit.** `--shadow-pop: 4px 5px 0
#111111` is a zero-blur offset shadow. Compose's `Modifier.shadow()` is
elevation-based and always blurred; there is no hard-shadow parameter. Use
`Modifier.drawBehind` painting an offset rounded rect:

```kotlin
fun Modifier.popShadow(spec: PopShadow) = drawBehind {
    drawRoundRect(
        color = PopTokens.ink,
        topLeft = Offset(spec.x.toPx(), spec.y.toPx()),
        size = size,
        cornerRadius = CornerRadius(spec.radius.toPx()),
    )
}
```

SwiftUI gets this free — `.shadow(color:, radius: 0, x:, y:)` is already hard —
so the *token* is shared and the *implementation* diverges. That's the pattern
for the whole design system: shared values, platform-idiomatic rendering.

Also needs porting:

- **`pop-press`** — the press-down animation. `pointerInput` +
  `animateFloatAsState` on offset, gated on reduced-motion (§2.7).
- **3px ink borders** — `Modifier.border`, straightforward.
- **Fonts** — Titan One (display), Nunito (sans), Space Mono. All OFL; bundle
  as assets on both platforms rather than relying on Google Fonts at runtime.
- **The paper-dot background** — a tiling `drawBehind` pattern.

Build this module against screenshot tests from day one (§4.3). It is the
cheapest place to catch "the Android one looks slightly wrong".

### 2.4 Navigation and gating

`proxy.ts`'s `PUBLIC_PREFIXES` logic becomes a nav guard reading auth state:

- no session → sign-in
- session, no family → onboarding
- session, family, no student selected → student picker
- parent areas (`/dashboard`) → behind the grown-up gate, re-challenged per
  session rather than once ever

Deep links matter for push (§2.9) and for invite redemption — register the
`/join` path as an App Link now, not later.

### 2.5 Screens

~40 screens, tranched so something is playable early:

**Tranche A — the loop.** Sign-in, student select, play hub, question runner,
keypad, results, job board, mastery grid. This is a demoable app.

**Tranche B — progression.** Zones, house, move-in, shop, try-on, locker, rank.

**Tranche C — social.** Crew, race, expo, challenges, stickers, grandparent view.

**Tranche D — parent/teacher.** Dashboard, progress, family, classroom, billing.
Lower fidelity is acceptable here — it's an adult utility surface, not the game.
Consider shipping v1 with the dashboard as a web view *for parents only*, which
is allowed and saves ~4 weeks. It is not allowed for the child-facing app.

### 2.6 The five game modes

Budget these separately from screens — they're the reason for going native.

Each is: render a server-delivered board, run interaction locally at 60fps,
post the log. The client-side halves of `cable-run.ts` (legal moves, `applyMove`,
`isSolved`, `isStuck`), `tool-off.ts` (the duel reducer), `scaffold.ts` (tilt
and tempo) and `floor-plan.ts` (placement validity) *do* get ported to Kotlin —
but they are UI feedback, not the authority, so a divergence is a bug rather
than a broken economy.

Keep them in `:feature:modes` with the pure logic in `:core:model` so iOS
inherits the port if KMP is adopted.

### 2.7 Accessibility

`student_settings` carries `read_aloud`, `dyslexia_font`, `high_contrast`,
`reduced_motion`, `text_scale`, `timer_mode`. Native equivalents:

| Setting | Android | iOS |
|---|---|---|
| `read_aloud` | `TextToSpeech` | `AVSpeechSynthesizer` |
| `dyslexia_font` | bundled OpenDyslexic | same |
| `high_contrast` | alternate token set | alternate token set |
| `reduced_motion` | app setting **OR** `ANIMATOR_DURATION_SCALE` | app setting **OR** `UIAccessibility.isReduceMotionEnabled` |
| `text_scale` | app scale **combined with** system font scale | Dynamic Type |

Take the union of app and system preference, never just the app's — a child who
set reduced motion at OS level should not have to set it again.

Beyond the settings: TalkBack/VoiceOver semantics on the mastery grid (the
stage glyph and text description already exist — wire them to
`contentDescription`), the keypad, and every game board. The existing
"dragging is never required" rule holds and should be stated as a standing
constraint on all five modes.

### 2.8 Offline

Currently every screen is a server round-trip. Kids play in cars. Minimum viable
offline:

- Room cache of student, unlock state, mastery, cosmetics, settings
- Prefetch a batch of run content (§1.3) while connected
- Queue completed runs; post on reconnect
- `finishRun` must tolerate late arrival — timestamp from the client, validate
  the window server-side, and make it idempotent on `runId`

That last point is a real contract change. Design it in now; retrofitting
idempotency after launch means reconciling duplicate coin grants.

### 2.9 Billing and push

**Billing.** The goal is to convert parents on the web and avoid the store
commission. That is a legitimate and well-trodden strategy, but it splits into
two things the stores treat very differently.

**Honouring a web purchase inside the app is always allowed.** Apple's
"multiplatform services" provision and Google's equivalent both permit an app to
unlock content a user bought elsewhere. Parent subscribes on your site → signs
in on the iPad → entitlement honoured, no commission, no risk. This has never
been the contentious part, and it is where your margin actually comes from.

**Advertising or linking to that web purchase from inside the app is the
contentious part**, and the rules differ by storefront and have moved repeatedly
since 2024 — US link-out allowances following the Epic litigation against both
Apple and Google, EU allowances under the DMA, Google's User Choice Billing in
assorted markets on assorted terms. Australia has had reform proposals in
motion. **Verify the current position for AU, US and EU at build time — do not
build against what was true when this document was written.**

The engineering answer is to not hardcode any of it:

> The purchase surface is **server-driven per storefront**. The app asks the
> backend what to show — IAP only, IAP plus external link, or locked with no
> call to action — and renders that. Policy shifts become a config change, not
> an app release and a two-week review cycle.

**Ship IAP on iOS anyway.** Two reasons. If you offer any in-app digital
purchase you must offer IAP alongside. And a parent who hits the paywall in the
app and gets bounced to a browser converts far worse than one who taps twice —
you will lose more to abandoned upgrades than you save in commission. Price the
store SKUs higher (§0.7), promote web through email and the parent dashboard,
and treat IAP as the convenience option that pays 30% for the privilege.

**Where the saving actually comes from** is the funnel, not the app. This
product has an unusual advantage: the parent creates the account during
onboarding and has their own dashboard, so you have a direct channel to them
that never touches a store. Convert there — onboarding email, dashboard prompt,
end-of-trial nudge — and the commission is only ever paid on parents who
upgrade mid-play.

**Mechanics.** Play Billing 7+ and StoreKit 2, the 10 flattened SKUs, all
purchases validated **server-side** in an Edge Function that writes the
`entitlements` row. Never trust a client's claim of entitlement. Apple requires
a **Restore Purchases** control. Handle grace periods, billing retry and refunds
on all three channels — a refunded Stripe payment must revoke entitlement the
same way a lapsed StoreKit subscription does.

**Strongly consider RevenueCat.** Three channels, two receipt formats, one
entitlement state machine, plus webhooks for lapses and refunds. At this team
size it pays for itself before iOS ships.

**Push** — FCM on Android, APNs via FCM on iOS. The README marks this low
priority and that's right; scope it to parent-facing nudges (weekly progress,
sticker received) and keep it out of the child app entirely. Child-directed push
is a compliance minefield for no product gain.

---

# Part 3 — iOS

### 3.1 What carries over

Everything in Part 1 — the API, the auth model, the board contract, the schema —
is already done. Plus the design tokens (§0.4), the screen inventory, the
interaction specs in `docs/game-modes/`, and the accessibility model.

### 3.2 The KMP decision point

Revisit §0.3 here, with real information. If `:core:model`, `:core:network` and
`:core:data` stayed clean, the choice is:

**Adopt KMP** — convert those three modules, ship as an XCFramework, use
**SKIE** so Kotlin `Flow` and `suspend` surface as `AsyncSequence` and Swift
`async`. Saves rewriting repositories, DTOs, the offline queue and the sync
logic. Costs: Kotlin toolchain in the iOS build, and a Swift developer who has
to debug through it occasionally.

**Stay pure Swift** — rewrite the three modules (~3–4 weeks). Simpler build, two
codebases to keep in step.

The clients are thin by design, so this is genuinely close. Lean KMP if the
offline sync layer (§2.8) turned out complex; lean pure Swift if it stayed
simple.

### 3.3 Stack

SwiftUI, Swift 6 strict concurrency, `supabase-swift`, GRDB or SwiftData for the
cache, StoreKit 2 for billing. Observation over Combine for new state.

### 3.4 Where the platforms should deliberately differ

Same design tokens does not mean identical UI. Follow the platform on:
navigation gestures (edge-swipe back), sheet and modal presentation, haptics
(`Core Haptics` vs `VibrationEffect`), share sheets, date and currency
formatting, and system settings integration.

Follow *Toolbox Pop* on everything the child actually looks at — colour, type,
borders, shadows, the press animation, motion timing.

---

# Part 4 — Cross-cutting

### 4.1 Repository layout

Keep one repo. The Supabase schema, Edge Functions, `lib/game` and both clients
belong under the same versioning — a board-contract change touching all four is
a single reviewable commit.

```
/src              existing Next.js web app
/supabase         schema, RLS, edge functions
/design           tokens.json + generators
/android
/ios
/contract         shared API fixtures (§4.3)
/docs
```

### 4.2 Guarding the iOS inheritance

A CI check that fails the build if `:core:model`, `:core:network` or
`:core:data` gain an Android dependency. A Gradle configuration check or a
dependency-analysis rule — either way, automated. Convention alone will not
survive a deadline.

### 4.3 Testing

| Layer | Approach |
|---|---|
| Rules | Existing `npm test` on `lib/game` — unchanged, still the authority |
| API contract | **JSON fixture suite in `/contract`** run against the TS server *and* both clients |
| Client logic | Kotest/JUnit + Turbine on `:core:data`; XCTest on iOS |
| Design system | Roborazzi (Android) / swift-snapshot-testing (iOS) |
| E2E | **Maestro** — one flow file runs on both platforms |

The contract suite in `/contract` is the load-bearing one. It is what keeps
three implementations of the client-side mode logic honest against one
TypeScript authority. Write it during Part 1, before there's anything to test it
against.

Playwright stays for the web app.

### 4.4 CI/CD

GitHub Actions: build, unit, lint (ktlint + detekt / SwiftLint), screenshot
diff, contract suite. Distribution via fastlane on both platforms — Play
internal → closed → open → production, and TestFlight. Share the version number
across web, Android and iOS so a bug report identifies a build.

### 4.5 Store compliance

The part that actually delays launches.

**Google Play** — Families policy and Designed for Families, Data safety
declaration, current target API level, Play Billing for the subscription.
Teacher Approved is optional but worth pursuing for an education title.

**Apple** — Kids Category (which brings 1.3 and 5.1.4), parental gate before
purchase and external links, privacy nutrition labels, age rating
questionnaire, and StoreKit for the subscription.

**Both** — COPPA, GDPR-K, the Australian Privacy Act, and the Children's Online
Privacy Code.

**Freemium in the Kids Category is fine**, but the parental gate before any
purchase flow is mandatory and reviewers test it. The §1.6 rule — no price, no
store, no purchase language anywhere below the gate — is what keeps this clean,
and it happens to be the design principle the app already holds. Reviewers also
look for pressure tactics aimed at children; "ask a grown-up" is the right
register, countdown timers and nagging are not.

Practical consequence: **no third-party SDK that fingerprints or profiles.**
That rules out most analytics and every ad network. Use first-party events into
Supabase. Whatever crash reporter you pick, verify it against the Families
policy before integrating, not after.

### 4.6 Account deletion — currently missing

Both stores now require in-app account deletion plus a public web URL. This app
holds family records, student profiles, run history, answer logs, mastery,
cosmetics, crew links, stickers and classroom memberships. There is no deletion
path in the schema today.

Needs: a cascade design (what's deleted vs anonymised — classroom aggregates
probably survive as anonymised), a `deletion_requests` audit trail, a grace
window, and the web-facing URL. Budget a week and don't discover it during
review.

### 4.7 Art

Unchanged from the README: every character and house art slot is a labelled
placeholder. Native rendering makes this *more* visible, not less. Brief the
illustrator at the start of Part 1 — it runs in parallel and it is the schedule
risk, not the code.

Specify exports at 1x/2x/3x, and prefer vector where the style allows.

---

# Part 5 — Sequencing

Solo developer. Two developers roughly halves phases 2–6 and lets Part 3 overlap.

| Phase | Work | Est. |
|---|---|---|
| 0 | Decisions, token pipeline, Compose spike of `pop.tsx` | 1–2 wks |
| 1 | Edge Functions, auth claims, board delivery, web app onto the API | 3–4 wks |
| 2 | Android foundation — modules, design system, nav, auth | 3–4 wks |
| 3 | Tranche A — the core loop, playable | 4–5 wks |
| 4 | The five game modes | 4 wks |
| 5 | Tranches B–D — progression, social, dashboard | 4 wks |
| 6 | Offline, accessibility, billing, push, account deletion | 4 wks |
| 7 | Play release, compliance, review cycles | 2–3 wks |
| **Android to store** | | **~6–7 months** |
| 8 | iOS — KMP decision, SwiftUI build, App Store | 3–4 months |
| **Both stores** | | **~9–11 months** |

Art runs alongside from Phase 1 and gates the store listing, not the code.

The earlier rough figure of 7–9 months for both was before offline sync,
account deletion and store billing were itemised. This breakdown is the one to
plan against.

---

# Decisions taken

- **The web app stays**, and becomes a client of its own API (§1.2). The rules
  stay in TypeScript; KMP-for-rules is off the table.
- **Web is the primary purchase channel**, with store IAP as the convenience
  option. Entitlement is channel-agnostic (§0.6, §2.9).
- **Freemium: ×1, ×2, ×10 free.** Lands exactly on the existing curriculum
  boundary (§1.6).
- **×1 is a zone** — *Labouring*, the tutorial trade, where input is learned at
  zero maths load. It counts as a full table everywhere: thresholds, coins,
  mastery, rank. No carve-outs. The `t >= 2` filters in the puzzle generators
  stay, because those are about puzzle quality, not about whether ×1 is
  real maths (§1.7).
- **Modes unlock on zones unlocked, not Trade Rank**, are shown-not-hidden when
  locked, and are never gated on payment directly. Free players get every mode
  their zone count reaches (§1.8).
- **Rewards weight steeply by per-fact difficulty**, and mastered trivial facts
  pay nothing. Paid on the spaced-repetition check-in rather than on repetition,
  so anti-grind doesn't break retention (§1.9).

# Open questions

Things still needing a product decision rather than an engineering one:

1. **How hard is the free tier's economic dead end?** (§1.9) Difficulty
   weighting plus mastery decay means a free player who masters ×1, ×2 and ×10
   earns close to nothing. Deliberate and strong, but it needs a floor decision
   and a presentation decision. **Now the most urgent of these** — it's no
   longer just "do free players earn coins", it's how the free tier *ends*.
   Decide before Tranche B.
2. **Does the daily cap still make sense per-mode?** `DAILY_COIN_CAP = 300` was
   set against a flat economy. Under difficulty weighting a paid player on ×7
   and ×8 hits it several times faster than a free player on ×2 and ×10 —
   arguably right, since the work is harder, but the cap now binds very
   differently by tier.
3. **How many student profiles on free?** `FAMILY_LIMITS.maxStudents` is 5.
   One free profile is the obvious default but it's a real conversion lever.
4. **Free trial as well as free tier?** They serve different jobs — a trial
   converts, a free tier acquires. Running both is common and neither store
   objects, but it complicates the entitlement states.
5. **Dashboard as a web view for v1?** Saves ~4 weeks, allowed for the
   parent-facing surface only. Now more attractive, since the web app is
   staying and the dashboard is where web conversion happens anyway. (§2.5)
6. **RevenueCat or hand-rolled?** Recommend RevenueCat — three channels now,
   not two. (§2.9)
7. **Classroom/school licensing** may qualify for out-of-app purchase, but it's
   a case to argue with both stores rather than an assumption to build on.
