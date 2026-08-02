"use client";

import { useActionState } from "react";

import { PopButton, PopInput } from "@/components/ui/pop";
import { signIn, type ActionState } from "@/lib/actions/auth";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signIn, {});

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-3.5">
      <input type="hidden" name="next" value={next} />
      <PopInput id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <PopInput
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
      />

      {state.error ? (
        <p role="alert" className="font-sans text-sm font-bold text-red-deep">
          {state.error}
        </p>
      ) : null}

      <PopButton type="submit" tone="teal" size="lg" full disabled={pending} className="mt-auto">
        {pending ? "CHECKING…" : "SIGN IN"}
      </PopButton>
    </form>
  );
}
