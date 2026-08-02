"use client";

import { useActionState } from "react";

import { PopCard, PopInput } from "@/components/ui/pop";
import { redeemInvite, type ActionState } from "@/lib/actions/family";

/** Redeems a code sent by another parent, or by a family inviting you in. */
export function RedeemForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(redeemInvite, {});

  return (
    <PopCard className="p-4">
      <h3 className="font-display text-base text-ink">Got a code?</h3>
      <p className="mt-1 font-sans text-xs font-bold text-mud">
        Enter a code another parent sent you to link your families.
      </p>

      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <PopInput
          id="code"
          name="code"
          label="Invite code"
          placeholder="ABCD-EFGH"
          autoComplete="off"
          required
        />

        {state.error ? (
          <p role="alert" className="font-sans text-xs font-bold text-red-deep">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="font-sans text-xs font-bold text-teal-deep">
            Linked. Your kids can see each other as crew now.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="pop-press self-start rounded-xl border-[3px] border-ink bg-teal px-3.5 py-2 font-display text-sm text-white shadow-pop-sm"
        >
          {pending ? "LINKING…" : "LINK UP"}
        </button>
      </form>
    </PopCard>
  );
}
