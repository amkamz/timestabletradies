"use client";

import { useActionState, useRef, useState } from "react";

import { PopButton, PopInput } from "@/components/ui/pop";
import { addStudent, type ActionState } from "@/lib/actions/onboarding";

export function AddStudentForm() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await addStudent(prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pop-press flex w-full items-center gap-3 rounded-2xl border-[3px] border-dashed border-sand-light px-3 py-3.5"
      >
        <span
          aria-hidden
          className="flex h-9 w-9 items-center justify-center rounded-[11px] border-[3px] border-sand-light font-display text-xl text-sand-light"
        >
          +
        </span>
        <span className="font-display text-[15px] text-sand">Add another kid</span>
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border-[3px] border-ink bg-white p-3 shadow-pop-sm"
    >
      <PopInput id="display_name" name="display_name" label="Name" required autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <PopInput id="age" name="age" type="number" min={4} max={18} label="Age" />
        <PopInput id="year_level" name="year_level" label="Year" placeholder="Year 3" />
      </div>

      {state.error ? (
        <p role="alert" className="font-sans text-xs font-bold text-red-deep">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <PopButton
          type="button"
          tone="white"
          size="sm"
          className="flex-1"
          onClick={() => setOpen(false)}
        >
          CANCEL
        </PopButton>
        <PopButton type="submit" tone="teal" size="sm" className="flex-[1.4]" disabled={pending}>
          {pending ? "ADDING…" : "ADD"}
        </PopButton>
      </div>
    </form>
  );
}
