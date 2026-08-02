import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Fails fast on the two project-level settings the suite cannot work around.
 *
 * Without these the tests still fail, but they fail as opaque 30s navigation
 * timeouts thirty seconds apart — this turns that into one clear sentence.
 */
export default async function globalSetup() {
  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(".env.local is missing NEXT_PUBLIC_SUPABASE_URL or _PUBLISHABLE_KEY.");
  }

  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  if (!res.ok) throw new Error(`Supabase settings check failed: ${res.status}`);
  const settings = (await res.json()) as { mailer_autoconfirm?: boolean; disable_signup?: boolean };

  if (settings.disable_signup) {
    throw new Error("Supabase has signups disabled — the suite cannot create its test family.");
  }

  if (!settings.mailer_autoconfirm) {
    throw new Error(
      [
        "Supabase still has email confirmation ON (mailer_autoconfirm: false).",
        "",
        "Two things break as a result:",
        "  1. signUpParent() gets no session back, so its family_members insert",
        "     fails the `user_id = auth.uid()` RLS check.",
        "  2. Every signup sends a real email, and the built-in SMTP rate-limits",
        "     after a handful per hour.",
        "",
        "Fix: Dashboard → Authentication → Providers → Email → turn off 'Confirm email'.",
      ].join("\n"),
    );
  }
}

function readEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
  } catch {
    return process.env as Record<string, string>;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}
