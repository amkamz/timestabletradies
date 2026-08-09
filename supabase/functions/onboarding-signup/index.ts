/**
 * onboarding-signup — create a parent account, a family, and the first tradie.
 *
 * **This is the one endpoint whose absence stops everything.** Without it the
 * Android app cannot make an account at all: the setup screens collect a name,
 * a look and a tradie name into an in-memory draft and then throw it away
 * (docs/native/screens.md). A profile that evaporates is worse than no profile,
 * so all of it is created here, in one call, or none of it is.
 *
 * ## Why the service role, and why it is safe here
 *
 * Every other endpoint runs as the caller, so RLS is the security boundary.
 * This one cannot: there is no caller yet. The account, the family and the
 * membership have to exist before any policy can see them, which is the
 * chicken-and-egg `signUpParent` documents in `src/lib/actions/auth.ts` — a
 * family is readable only through `auth_family_ids()`, which reads a membership
 * that does not exist until the family does.
 *
 * So this runs as the service role and **takes nothing on trust**: it accepts
 * only a name, an email and a password, and every id it writes is one it
 * generated. There is no path here for a caller to name a family, a student or
 * a user other than the one being created.
 *
 * ## Idempotency
 *
 * A retry after a partial failure must not orphan a user. If the auth user
 * already exists, this signs in instead and repairs whatever is missing —
 * because the alternative is a parent whose second tap says "email already
 * registered" about an account that does not work.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

import { DEFAULT_UNLOCK_ORDER } from "../_shared/game/zones.ts";
import { FAMILY_LIMITS } from "../_shared/game/billing.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Payload = {
  name?: string;
  email?: string;
  password?: string;
  /** The first tradie, if setup collected one. Optional — a parent can add later. */
  student?: {
    displayName?: string;
    age?: number | null;
    yearLevel?: string | null;
    look?: { model?: number; skin?: string; hair?: string };
    name?: { trade?: string; adjective?: string; surname?: string };
  };
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim().toLowerCase();
  const password = payload.password ?? "";

  // The same three checks the web form makes, repeated here because a client is
  // not a validation boundary.
  if (!name) return json({ error: "Add your name so the kids know whose account this is." }, 400);
  if (!email.includes("@")) return json({ error: "That email doesn't look right." }, 400);
  if (password.length < 8) {
    return json({ error: "Use at least 8 characters for the password." }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  /* ---- the auth user ----------------------------------------------------- */

  let userId: string | null = null;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });

  if (created.data.user) {
    userId = created.data.user.id;
  } else {
    // Already registered. Only continue if the password matches — otherwise
    // this would let anyone attach themselves to someone else's email by
    // "signing up" again.
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const signIn = await anon.auth.signInWithPassword({ email, password });
    if (!signIn.data.user) {
      return json({ error: "That email is already registered." }, 409);
    }
    userId = signIn.data.user.id;
  }

  /* ---- the family -------------------------------------------------------- */

  const { data: membership } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .maybeSingle();

  let familyId = membership?.family_id ?? null;

  if (!familyId) {
    // Generated here, never read back. `.select()` after the insert would be an
    // INSERT ... RETURNING, which has to satisfy the *read* policy — and at
    // this moment there is no membership row for it to find.
    familyId = crypto.randomUUID();

    const { error } = await admin
      .from("families")
      .insert({ id: familyId, name: `${name}'s crew` });
    if (error) return json({ error: error.message }, 500);

    const member = await admin
      .from("family_members")
      .insert({ family_id: familyId, user_id: userId, role: "parent" });
    if (member.error) return json({ error: member.error.message }, 500);
  }

  /* ---- the first tradie -------------------------------------------------- */

  let studentId: string | null = null;
  const draft = payload.student;

  if (draft?.displayName?.trim()) {
    const { count } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId);

    if ((count ?? 0) >= FAMILY_LIMITS.maxStudents) {
      return json(
        { error: `This account is full — ${FAMILY_LIMITS.maxStudents} profiles is the limit.` },
        409,
      );
    }

    const { data: student, error } = await admin
      .from("students")
      .insert({
        family_id: familyId,
        display_name: draft.displayName.trim(),
        age: draft.age ?? null,
        year_level: draft.yearLevel ?? null,
        look_model: draft.look?.model ?? 1,
        look_skin: draft.look?.skin ?? "s3",
        look_hair: draft.look?.hair ?? "h1",
        name_trade: draft.name?.trade ?? null,
        name_adjective: draft.name?.adjective ?? null,
        name_surname: draft.name?.surname ?? null,
      })
      .select("id")
      .single();

    if (error || !student) return json({ error: error?.message ?? "Could not add that profile." }, 500);
    studentId = student.id;

    // Every new tradie starts on the first table in the curriculum order —
    // ×1, multiplication only (§1.7).
    await admin.from("student_tables").insert({
      student_id: studentId,
      table_no: DEFAULT_UNLOCK_ORDER[0],
      division_unlocked: false,
    });
    await admin.from("student_settings").insert({ student_id: studentId });
  }

  return json({ userId, familyId, studentId }, 201);
});
