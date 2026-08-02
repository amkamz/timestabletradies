# Times Table Tradies

An educational maths app where kids play as an apprentice tradie, completing
multiplication and division "jobs" to earn coins, buy cosmetics, and build their
own house from the foundations up.

Built from the **Toolbox Pop** design direction in
`Times Table Tradie - Screens.dc.html`, on Next.js 16 (App Router) with a
Supabase backend.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project details
npm run dev
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in `supabase/migrations/20260801000000_baseline.sql` — either
   through the SQL editor, or with the CLI:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
3. Copy the project URL and anon key into `.env.local`.

Types in `src/lib/supabase/types.ts` are hand-maintained to match that
migration. Once the CLI is linked you can regenerate them instead:

```bash
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

---

## How it fits together

```
src/
  app/
    page.tsx              A1  Welcome
    gate/                 A2  Grown-up gate
    sign-in/
    onboarding/           A3–A7  parent account → students → look → name → meet
    play/                 the student app  (B, C, D, E, F, G, I1)
    dashboard/            parent & teacher  (H)
    grandparent/          I2  sticker-only view
  components/
    ui/pop.tsx            design-system primitives
    shell/                app frame, screens, nav, HUD
    play/                 question runner, keypad, match board, results
    mastery/              mastery grid + class overlay
    a11y/                 accessibility provider
  lib/
    game/                 all the rules — see below
    data/                 server-side reads
    actions/              server actions (the only write paths)
    supabase/             browser + server clients, DB types
  proxy.ts                session refresh + route gating
supabase/migrations/      schema and RLS
```

### Where the rules live

Game logic is kept out of the components so it stays testable and there's one
place to change each rule:

| File | Owns |
|---|---|
| `lib/game/zones.ts` | Tables → trades, unlock order |
| `lib/game/questions.ts` | Question generation, job board, scoring |
| `lib/game/mastery.ts` | The 5-stage fact ladder, spaced repetition |
| `lib/game/progression.ts` | Trade Rank ladder, house stages, rare items |
| `lib/game/names.ts` | The three vetted name pools |
| `lib/game/shop.ts` | Cosmetics catalogue and purchase rules |
| `lib/game/billing.ts` | Plans, family limits, roles |
| `lib/game/crew.ts` | Simulated opponents, preset reactions |
| `lib/game/modes.ts` | Mode registry — labels, the training-shed list, untimed modes |
| `lib/game/economy.ts` | Daily coin cap shared by the repeatable modes |
| `lib/game/scaffold.ts` | Scaffold Stack: tilt model, tempo ramp, payout |
| `lib/game/cable-run.ts` | Cable Run: board generation, legal moves, replay |
| `lib/game/tool-off.ts` | The Tool-Off: belt, targets, shields, duel reducer |
| `lib/game/floor-plan.ts` | Floor Plan: room tiling, placement, the gap question |
| `lib/game/rally.ts` | Ute Rally: legs, forks, the field, route verification |

The last five are the new game modes — design specs and build notes in
[`docs/game-modes/`](docs/game-modes/).

---

## Design decisions worth knowing

**Kids never hold credentials.** The parent holds the Supabase auth session;
student profiles are selected in-session via an httpOnly cookie. This is what
makes "kids can't search for or add other users" structurally true rather than
just a UI rule.

**Money is structurally absent from the student app.** Every price, plan and
billing control lives under `/dashboard`, behind `requireParent()`. Nothing
under `/play` imports the pricing side of `lib/game/billing` at all.

**Rewards are computed server-side.** `finishRun()` recomputes coins and
materials from the submitted answer log, so a tampered client can't mint
currency. Guess-spam (a wrong answer under 400 ms) earns nothing.

**Crew visibility is one narrow view.** Cross-family reads go through the
`crew_roster` view, which exposes a name, avatar and rank — no coins, no
accuracy, no age. The `students` RLS policy deliberately grants no cross-family
access at all.

**Colour is never the only signal.** Mastery stages carry a glyph and a text
description alongside the fill, so the grid works for colourblind users and
screen readers.

**Dragging is never required.** "Measure Up" is described as drag-and-match in
the design doc but ships as tap-to-pair, which works by keyboard and satisfies
WCAG 2.2 SC 2.5.7.

---

## Scripts

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm start            # serve the production build
npm test             # unit tests for lib/game (Node's built-in runner)
npm run test:e2e     # Playwright, against a real Supabase project
npx tsc --noEmit     # typecheck
npx eslint src       # lint
```

`npm test` runs `*.test.ts` on Node's built-in test runner using native type
stripping — no framework, no build step. `test/ts-resolve.mjs` is a small
resolver hook that teaches Node's ESM resolver the extensionless imports and
`@/` alias the app is written with.

---

## Not built yet

- **Native iOS/Android.** The spec asks for App Store and Play Store releases
  sharing one account system. This repo is the web app; the Supabase backend and
  all of `lib/game` are platform-agnostic and would be reused by native clients.
- **Live multiplayer presence.** Crew Race and Trade Expo currently fill with
  simulated crew every time, clearly labelled as practice opponents — the
  documented fallback behaviour. Real-time matchmaking (Supabase Realtime) is
  the remaining piece.
- **Payment processor.** `families.billing_ref` is the hook for Stripe or the
  store billing APIs; the plan selector currently just records the choice.
- **Push notifications.** Explicitly lower priority in the spec.
- **Character and house artwork.** Every art slot is a labelled placeholder, as
  the design doc intends — brief an illustrator per slot.
