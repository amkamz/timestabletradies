import { redirect } from "next/navigation";

import { ArtSlot, PopButton } from "@/components/ui/pop";
import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";
import { requireParent } from "@/lib/actions/auth";
import { selectStudent } from "@/lib/actions/onboarding";
import { formatTradieName } from "@/lib/game/names";
import { levelLabel } from "@/lib/game/city-level";
import { createClient } from "@/lib/supabase/server";

/** A7 · Meet your tradie — confirm, then straight into the first job. */
export default async function MeetPage(props: PageProps<"/onboarding/meet">) {
  await requireParent();
  const { student } = await props.searchParams;
  const studentId = typeof student === "string" ? student : null;
  if (!studentId) redirect("/onboarding/students");

  const supabase = await createClient();
  const { data } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
  if (!data) redirect("/onboarding/students");

  const tradieName =
    data.name_trade && data.name_adjective && data.name_surname
      ? formatTradieName({
          trade: data.name_trade,
          adjective: data.name_adjective,
          surname: data.name_surname,
        })
      : data.display_name;

  return (
    <AppFrame>
      <Screen tone="red">
        <ScreenBody className="items-center px-6 pt-11 text-center">
          <span className="anim-pop-in inline-block -rotate-2 rounded-2xl border-[3px] border-ink bg-yellow px-4 py-1.5 font-display text-[15px] text-ink shadow-pop-sm">
            WELCOME TO THE SITE!
          </span>

          <ArtSlot
            tone="light"
            label={"FINISHED\nTRADIE ART\n(chosen look)"}
            className="mt-6 h-[190px] w-[150px] flex-col"
          />

          <h1 className="mt-4 font-display text-[26px] text-white [text-shadow:2px_2px_0_#111]">
            {tradieName}
          </h1>
          <p className="mt-1 font-sans text-xs font-black text-red-tint uppercase">
            {levelLabel(data.city_xp)} · Ready for work
          </p>

          <form action={selectStudent} className="mt-auto w-full pt-8">
            <input type="hidden" name="student_id" value={studentId} />
            <PopButton type="submit" tone="ink" size="lg" full>
              START MY FIRST JOB ▸
            </PopButton>
          </form>
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
