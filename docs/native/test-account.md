# The test account

There is one shared account for signing the app in on a device. **The
credentials are in `.env.local`**, as `TEST_ACCOUNT_EMAIL` and
`TEST_ACCOUNT_PASSWORD`. That file is gitignored (`.env*`), which is why they
are there and not here.

```powershell
node scripts/create-test-account.mjs
```

Creates the account if it does not exist, signs in and repairs anything missing
if it does, and writes the credentials to `.env.local` on first run. Safe to run
repeatedly.

## Why a script and not the app

**The Android app cannot create an account.** `onboarding-signup` is one of the
Edge Functions §1.1 has yet to write, and the four setup screens after it are an
in-memory draft that is discarded — so even when that function lands, the
profile a child builds still goes nowhere until `addStudent`, `saveLook` and
`saveName` exist too. See the audit in [`screens.md`](screens.md).

So an account has to be made from outside the app. The script does exactly what
the **web** sign-up does, in the same order:

```
auth user → family → membership → student → first table → settings
```

That order is not incidental. `families` is readable only through
`auth_family_ids()`, which reads a membership row that does not exist yet — so
the family's id is generated client-side rather than read back. The long comment
in `signUpParent` (`src/lib/actions/auth.ts`) explains it; the script repeats the
trick for the same reason.

## What it makes

| | |
|---|---|
| Parent | `TEST_ACCOUNT_EMAIL`, display name "Test Parent" |
| Student | "Sparky" |
| Unlocked | ×1 only — `DEFAULT_UNLOCK_ORDER[0]`, the tutorial zone |

A fresh student is on ×1 alone, so most of the app is legitimately locked. To
exercise more, add rows to `student_tables` for that student rather than
loosening any gate.

## Careful with `pm clear`

`adb shell pm clear com.timestabletradies.debug` wipes **everything**, including
the Supabase session — it signs the device out, and there is no way back in
without these credentials. To reset just the city and leave the session alone:

```powershell
adb shell run-as com.timestabletradies.debug rm shared_prefs/tradies_city.xml
```

## If the project's auth settings change

The script depends on `mailer_autoconfirm` being on — with confirmation
required, sign-up returns a user but no session, and every insert after it fails
RLS. It says so rather than half-creating an account. Check with:

```
GET {SUPABASE_URL}/auth/v1/settings   (apikey: the publishable key)
```
