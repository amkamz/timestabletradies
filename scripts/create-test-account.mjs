/**
 * Create (or repair) the shared test account.
 *
 * The Android app has no working sign-up — `onboarding-signup` is one of the
 * Edge Functions §1.1 has yet to write, and the four setup screens after it are
 * an in-memory draft that is thrown away. So an account has to be made from
 * outside the app, and this does exactly what the *web* sign-up does, in the
 * same order and for the same reasons:
 *
 *   auth user → family → membership → student → first table → settings
 *
 * The order is not incidental. `families` is readable only through
 * `auth_family_ids()`, which reads the membership that does not exist yet — so
 * the family's id is generated here rather than read back, exactly as
 * `signUpParent` explains in `src/lib/actions/auth.ts`.
 *
 * Idempotent: run it again and it signs in instead of signing up, and skips any
 * row that is already there.
 *
 *     node scripts/create-test-account.mjs
 *
 * Credentials come from `.env.local` (gitignored) and are written back to it if
 * they are missing, so the next run — and the next agent — finds them.
 */

import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = ".env.local";

const DEFAULT_EMAIL = "amithicalbeest+ttt-test@gmail.com";
const PARENT_NAME = "Test Parent";
const STUDENT_NAME = "Sparky";

/** `DEFAULT_UNLOCK_ORDER[0]` — every tradie starts on the ×1 tutorial zone. */
const FIRST_TABLE = 1;

function readEnv() {
  const text = readFileSync(ENV_PATH, "utf8");
  const entries = text
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const at = line.indexOf("=");
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    });
  return { text, env: Object.fromEntries(entries) };
}

function appendEnv(lines) {
  const { text } = readEnv();
  const suffix = text.endsWith("\n") ? "" : "\n";
  writeFileSync(ENV_PATH, text + suffix + lines.join("\n") + "\n");
}

const { env } = readEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase config in .env.local");
  process.exit(1);
}

const email = env.TEST_ACCOUNT_EMAIL || DEFAULT_EMAIL;
// 24 bytes of base64url — long enough that it is never worth guessing, short
// enough to retype onto a phone keyboard if it ever comes to that.
const password = env.TEST_ACCOUNT_PASSWORD || randomBytes(18).toString("base64url");

const supabase = createClient(url, key);

/* ---------------------------------------------------------------- account */

let { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (signInError) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: PARENT_NAME } },
  });
  if (error) {
    console.error("sign-up failed:", error.message);
    process.exit(1);
  }
  auth = data;
  console.log("created auth user");
} else {
  console.log("signed in to the existing account");
}

if (!auth?.session) {
  console.error(
    "no session after sign-up — the project may now require email confirmation",
  );
  process.exit(1);
}

const userId = auth.user.id;

/* ----------------------------------------------------------------- family */

let { data: membership } = await supabase
  .from("family_members")
  .select("family_id")
  .eq("user_id", userId)
  .maybeSingle();

if (!membership) {
  const familyId = randomUUID();
  const { error: familyError } = await supabase
    .from("families")
    .insert({ id: familyId, name: `${PARENT_NAME}'s crew` });
  if (familyError) {
    console.error("family insert failed:", familyError.message);
    process.exit(1);
  }

  const { error: memberError } = await supabase
    .from("family_members")
    .insert({ family_id: familyId, user_id: userId, role: "parent" });
  if (memberError) {
    console.error("membership insert failed:", memberError.message);
    process.exit(1);
  }

  membership = { family_id: familyId };
  console.log("created family and membership");
}

/* ---------------------------------------------------------------- student */

const { data: existing } = await supabase
  .from("students")
  .select("id, display_name")
  .eq("family_id", membership.family_id);

let student = existing?.[0];

if (!student) {
  const { data: created, error } = await supabase
    .from("students")
    .insert({ family_id: membership.family_id, display_name: STUDENT_NAME })
    .select()
    .single();
  if (error) {
    console.error("student insert failed:", error.message);
    process.exit(1);
  }
  student = created;

  await supabase
    .from("student_tables")
    .insert({ student_id: student.id, table_no: FIRST_TABLE, division_unlocked: false });
  await supabase.from("student_settings").insert({ student_id: student.id });

  console.log(`created student "${STUDENT_NAME}" on ×${FIRST_TABLE}`);
}

/* ------------------------------------------------------------------ save */

if (!env.TEST_ACCOUNT_EMAIL || !env.TEST_ACCOUNT_PASSWORD) {
  appendEnv([
    "",
    "# Shared test account, for signing the app in on a device.",
    "# Not a secret worth protecting — it owns nothing but test data — but it is",
    "# a real credential, so it lives here rather than in the repo. See",
    "# docs/native/test-account.md.",
    `TEST_ACCOUNT_EMAIL=${email}`,
    `TEST_ACCOUNT_PASSWORD=${password}`,
  ]);
  console.log(`saved credentials to ${ENV_PATH}`);
}

console.log(`\nready: ${email}  (student "${student.display_name}")`);
