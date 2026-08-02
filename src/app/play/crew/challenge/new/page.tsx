import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PopButton, PopCard, PopNote } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { sendChallenge } from "@/lib/actions/challenge";
import { formatTradieName } from "@/lib/game/names";
import { createClient } from "@/lib/supabase/server";

/** E4 · Job Challenge — send a head-to-head to a linked crew member. */
export default async function NewChallengePage(props: PageProps<"/play/crew/challenge/new">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { to } = await props.searchParams;
  const toId = typeof to === "string" ? to : null;
  if (!toId) notFound();

  const supabase = await createClient();
  const [{ data: mate }, { unlocked }] = await Promise.all([
    supabase.from("crew_roster").select("*").eq("id", toId).maybeSingle(),
    getUnlockState(student.id),
  ]);

  // Not in the roster means not linked crew — nothing to challenge.
  if (!mate) notFound();

  const mateName =
    mate.name_trade && mate.name_adjective && mate.name_surname
      ? formatTradieName({
          trade: mate.name_trade,
          adjective: mate.name_adjective,
          surname: mate.name_surname,
        })
      : mate.display_name;

  return (
    <Screen tone="blue">
      <ScreenBody className="px-5 pt-7">
        <Link
          href="/play/crew"
          aria-label="Back to your crew"
          className="pop-press flex h-8 w-8 items-center justify-center self-start rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
        >
          <span aria-hidden>✕</span>
        </Link>

        <h1 className="mt-4 font-display text-[26px] leading-tight text-white [text-shadow:2px_2px_0_#111]">
          Challenge {mateName}
        </h1>
        <p className="mt-1.5 font-sans text-[13px] font-extrabold text-white/85">
          You both get the same ten questions. Scores line up when you&apos;ve both finished.
        </p>

        <form action={sendChallenge} className="mt-5 flex flex-1 flex-col">
          <input type="hidden" name="from_student" value={student.id} />
          <input type="hidden" name="to_student" value={mate.id} />

          <PopCard className="p-3 shadow-pop">
            <fieldset>
              <legend className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
                Table
              </legend>
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {unlocked.map((table, i) => (
                  <label key={table} className="cursor-pointer">
                    <input
                      type="radio"
                      name="table"
                      value={table}
                      defaultChecked={i === 0}
                      className="peer sr-only"
                    />
                    <span className="block rounded-lg border-2 border-ink bg-white py-1.5 text-center font-display text-[11px] text-ink peer-checked:bg-yellow peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue">
                      {table}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </PopCard>

          <div className="mt-3">
            <PopNote tone="light">
              No messages, just the score. Everyone you can challenge is crew your parent linked.
            </PopNote>
          </div>

          <PopButton type="submit" tone="yellow" size="lg" full className="mt-auto">
            SEND THE CHALLENGE ▸
          </PopButton>
        </form>
      </ScreenBody>
    </Screen>
  );
}
