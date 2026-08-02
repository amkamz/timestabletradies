"use client";

import { useActionState } from "react";

import { PopCard, PopInput } from "@/components/ui/pop";
import { createClassroom, setAssignment, type ActionState } from "@/lib/actions/classroom";

export function CreateClassForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createClassroom, {});

  return (
    <PopCard className="p-4">
      <h2 className="font-display text-base text-ink">New class</h2>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <PopInput id="class-name" name="name" label="Class name" placeholder="4B Maths" required />
        {state.error ? (
          <p role="alert" className="font-sans text-xs font-bold text-red-deep">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="pop-press self-start rounded-xl border-[3px] border-ink bg-teal px-3.5 py-2 font-display text-sm text-white shadow-pop-sm"
        >
          {pending ? "CREATING…" : "CREATE CLASS"}
        </button>
      </form>
    </PopCard>
  );
}

/** H8 · Assign trade zones / tables to a group or one student. */
export function AssignmentForm({
  classroomId,
  roster,
}: {
  classroomId: string;
  roster: Array<{ id: string; display_name: string }>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setAssignment, {});
  const tables = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <PopCard className="p-4">
      <h2 className="font-display text-base text-ink">Set the focus</h2>
      <p className="mt-1 font-sans text-xs font-bold text-mud">
        These are the tables The Garage will practise.
      </p>

      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="classroom_id" value={classroomId} />

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
            Who
          </span>
          <select
            name="student_id"
            className="rounded-xl border-[3px] border-ink bg-white px-3 py-2.5 font-sans text-sm font-extrabold text-ink"
          >
            <option value="">Whole class</option>
            {roster.map((student) => (
              <option key={student.id} value={student.id}>
                {student.display_name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
            Tables
          </legend>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {tables.map((table) => (
              <label key={table} className="cursor-pointer">
                <input type="checkbox" name="tables" value={table} className="peer sr-only" />
                <span className="block rounded-lg border-2 border-ink bg-white py-1.5 text-center font-display text-[11px] text-ink peer-checked:bg-yellow peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue">
                  {table}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
            Operation
          </span>
          <select
            name="operation"
            className="rounded-xl border-[3px] border-ink bg-white px-3 py-2.5 font-sans text-sm font-extrabold text-ink"
          >
            <option value="multiply">Multiplication</option>
            <option value="divide">Division</option>
            <option value="both">Both</option>
          </select>
        </label>

        <PopInput id="note" name="note" label="Note (optional)" placeholder="Focus before Friday" />

        {state.error ? (
          <p role="alert" className="font-sans text-xs font-bold text-red-deep">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="font-sans text-xs font-bold text-teal-deep">
            Saved. It&apos;ll show up in The Garage next time they play.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="pop-press self-start rounded-xl border-[3px] border-ink bg-teal px-3.5 py-2 font-display text-sm text-white shadow-pop-sm"
        >
          {pending ? "SAVING…" : "SAVE FOCUS"}
        </button>
      </form>
    </PopCard>
  );
}
