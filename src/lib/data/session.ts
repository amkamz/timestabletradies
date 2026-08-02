import "server-only";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import type { FamilyRow, StudentRow } from "@/lib/supabase/types";

const ACTIVE_STUDENT_COOKIE = "ttt_student";

/**
 * The parent holds the auth session; the active *student profile* is a
 * separate in-session selection. Kids never hold credentials of their own.
 */
export async function getActiveStudentId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_STUDENT_COOKIE)?.value ?? null;
}

export async function setActiveStudentId(id: string) {
  const store = await cookies();
  store.set(ACTIVE_STUDENT_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearActiveStudent() {
  const store = await cookies();
  store.delete(ACTIVE_STUDENT_COOKIE);
}

export type FamilyContext = {
  family: FamilyRow;
  role: "parent" | "grandparent";
  students: StudentRow[];
};

/** The signed-in user's family, role and student roster. */
export async function getFamilyContext(): Promise<FamilyContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("family_members")
    .select("family_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;

  const [{ data: family }, { data: students }] = await Promise.all([
    supabase.from("families").select("*").eq("id", membership.family_id).single(),
    supabase
      .from("students")
      .select("*")
      .eq("family_id", membership.family_id)
      .order("created_at", { ascending: true }),
  ]);

  if (!family) return null;

  return {
    family: family as FamilyRow,
    role: membership.role as "parent" | "grandparent",
    // Grandparents get the roster for the sticker picker, nothing more.
    students: (students ?? []) as StudentRow[],
  };
}

/** The student whose app we're currently inside. */
export async function requireActiveStudent(): Promise<StudentRow | null> {
  const supabase = await createClient();
  const id = await getActiveStudentId();

  if (id) {
    const { data } = await supabase.from("students").select("*").eq("id", id).maybeSingle();
    if (data) return data as StudentRow;
  }

  // Fall back to the first profile in the family.
  const ctx = await getFamilyContext();
  return ctx?.students[0] ?? null;
}
