"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; ok?: boolean };

/**
 * Create the root parent account and its family (spec §2).
 * Reached only from behind the grown-up gate.
 */
export async function signUpParent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Add your name so the kids know whose account this is." };
  if (!email.includes("@")) return { error: "That email doesn't look right." };
  if (password.length < 8) return { error: "Use at least 8 characters for the password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name } },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Could not create the account. Try again." };

  // Create the family and attach this user as its first parent.
  //
  // The id is generated here rather than read back, because `.select()` after
  // the insert would be an INSERT ... RETURNING — and RETURNING has to satisfy
  // the *read* policy, which scopes families to `auth_family_ids()`. At this
  // moment there is no membership row yet, so the read fails and sign-up dies
  // with "Could not set up the family account".
  //
  // Chicken-and-egg: the membership can't exist before the family, and the
  // family can't be read before the membership. Supplying the id breaks it
  // without loosening the policy.
  const familyId = crypto.randomUUID();

  const { error: familyError } = await supabase
    .from("families")
    .insert({ id: familyId, name: `${name}'s crew` });

  if (familyError) {
    return { error: familyError.message };
  }

  const { error: memberError } = await supabase.from("family_members").insert({
    family_id: familyId,
    user_id: data.user.id,
    role: "parent",
    display_name: name,
  });

  if (memberError) return { error: memberError.message };

  redirect("/onboarding/students");
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/play");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match an account." };

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Guard used by the parent dashboard — grandparents must never get in. */
export async function requireParent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data } = await supabase
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) redirect("/onboarding/parent");
  if (data.role !== "parent") redirect("/grandparent");

  return { userId: user.id, familyId: data.family_id };
}
