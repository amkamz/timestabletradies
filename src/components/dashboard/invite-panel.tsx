"use client";

import { useActionState } from "react";

import { PopCard } from "@/components/ui/pop";
import { createInvite, type ActionState } from "@/lib/actions/family";

/** Issues an invite code for a parent, grandparent or crew link. */
export function InvitePanel({
  kind,
  title,
  blurb,
  existing,
}: {
  kind: "parent" | "grandparent" | "crew";
  title: string;
  blurb: string;
  existing: string[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createInvite, {});
  const codes = state.code ? [state.code, ...existing] : existing;

  return (
    <PopCard className="p-4">
      <h3 className="font-display text-base text-ink">{title}</h3>
      <p className="mt-1 font-sans text-xs font-bold text-mud">{blurb}</p>

      <form action={formAction} className="mt-3">
        <input type="hidden" name="kind" value={kind} />
        <button
          type="submit"
          disabled={pending}
          className="pop-press rounded-xl border-[3px] border-ink bg-teal px-3.5 py-2 font-display text-sm text-white shadow-pop-sm"
        >
          {pending ? "CREATING…" : "CREATE A CODE"}
        </button>
      </form>

      {state.error ? (
        <p role="alert" className="mt-2 font-sans text-xs font-bold text-red-deep">
          {state.error}
        </p>
      ) : null}

      {codes.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {codes.map((code) => (
            <li
              key={code}
              className="rounded-lg border-2 border-dashed border-ink bg-paper px-3 py-2 font-mono text-sm tracking-widest text-ink"
            >
              {code}
            </li>
          ))}
        </ul>
      ) : null}
    </PopCard>
  );
}
