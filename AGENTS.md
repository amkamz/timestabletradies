<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# This repo is going native — read the plan first

**[`docs/native/README.md`](docs/native/README.md) is the plan of record** for
taking this app to the Play Store and App Store. It carries the architecture
decisions, the sequencing, the open questions, and a **Build status** table
saying what is actually implemented versus still on paper. Read it before
touching `src/lib/game/`, `supabase/`, or `android/`.

## The stack is deliberately mixed

Do not assume "going native" means rewriting in Kotlin. It does not:

| Layer | Language | Notes |
|---|---|---|
| Database + RLS | Postgres (Supabase) | |
| Game rules — `src/lib/game/` | **TypeScript** | Stays TS permanently. Never ported. |
| API / write path | **TypeScript** (Deno Edge Functions) | Server actions move here |
| Web app — `src/app/` | **React / Next.js** | Stays, and is the primary purchase channel |
| Android — `android/` | **Kotlin + Compose** | UI only |
| iOS | **Swift + SwiftUI** | Not started |

The rules are authority and run server-side. Only 60fps interaction gets a
native counterpart, and even then the server recomputes every payout — so a
Kotlin/TypeScript divergence is a visual glitch, not a broken economy.

## Two standing constraints

1. **`android/core/model` (and later `core/network`, `core/data`) must stay
   free of Android dependencies.** They are what iOS inherits if Kotlin
   Multiplatform is adopted. The root `android/build.gradle.kts` fails the
   build if an Android plugin is applied to them.

2. **The student app never mentions money.** Prices, plans and billing live
   under `/dashboard` behind `requireParent()`. A locked mode says "Unlocks
   with 5 trades" — a progression goal, never a price. Apple's Kids Category
   requires the parental gate regardless.

## Building the Android app

```powershell
cd android
.\install.ps1          # builds, installs to an attached device, launches
```

`JAVA_HOME` must point at JDK 17 (the script sets it). `sdkmanager` is broken
on this machine — AGP self-provisions the SDK instead.
