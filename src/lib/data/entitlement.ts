import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Entitlement } from "@/lib/game/entitlement";

/**
 * What a family is owed — docs/native/README.md §0.6.
 *
 * Read-only from the app's side. The row is written by the server holding the
 * service role, after validating a Stripe webhook or a store receipt; there is
 * no RLS policy that would let any client session write it, including the
 * parent's own.
 *
 * A missing row is the free tier, which is what a new signup looks like.
 */
export async function getEntitlement(familyId: string): Promise<Entitlement> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entitlements")
    .select("tier, status, expires_at")
    .eq("family_id", familyId)
    .maybeSingle();

  if (!data) return null;

  return {
    tier: data.tier,
    status: data.status,
    expiresAt: data.expires_at,
  };
}

/** The same, for a student — resolves their family first. */
export async function getEntitlementForStudent(studentId: string): Promise<Entitlement> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("family_id")
    .eq("id", studentId)
    .maybeSingle();

  if (!data) return null;
  return getEntitlement(data.family_id);
}
