"use client";

import { useActionState } from "react";

import { PopButton, PopInput, PopNote } from "@/components/ui/pop";
import { signUpParent, type ActionState } from "@/lib/actions/auth";

export function ParentForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpParent, {});

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-3.5">
      <PopInput id="name" name="name" label="Your name" autoComplete="name" required />
      <PopInput
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
      />
      <PopInput
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters."
        required
      />

      {state.error ? (
        <p role="alert" className="font-sans text-sm font-bold text-red-deep">
          {state.error}
        </p>
      ) : null}

      <PopNote>
        Billing, crew links and stats all live here — never in the kids&apos; app.
      </PopNote>

      <PopButton type="submit" tone="teal" size="lg" full disabled={pending} className="mt-auto">
        {pending ? "SETTING UP…" : "CREATE ACCOUNT"}
      </PopButton>
    </form>
  );
}
