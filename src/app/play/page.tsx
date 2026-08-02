import { redirect } from "next/navigation";

import { ArtSlot, Banner, PopCard, PopLink } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { Hud } from "@/components/shell/hud";
import { StickerInbox } from "@/components/play/sticker-inbox";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { generateJobBoard } from "@/lib/game/questions";
import { dailySeed } from "@/lib/game/seed";
import { HOUSE_STAGES, stageAt, stageProgress } from "@/lib/game/progression";
import { createClient } from "@/lib/supabase/server";

/** B1 · Site (home) — the daily hub. */
export default async function SitePage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const supabase = await createClient();
  const [{ unlocked }, { data: stickers }] = await Promise.all([
    getUnlockState(student.id),
    supabase
      .from("stickers")
      .select("*")
      .eq("student_id", student.id)
      .is("seen_at", null)
      .order("sent_at", { ascending: false }),
  ]);

  const stage = stageAt(student.house_stage);
  const progress = stageProgress(student.house_stage, student.house_loads);
  const jobs = generateJobBoard(dailySeed(student.id), unlocked);

  const houseName =
    student.name_trade ? `The ${student.name_trade}'s Cottage` : "Your First House";

  return (
    <Screen tone="paper">
      <Hud student={student} materials={student.house_loads} />

      <ScreenBody className="gap-0 px-4 pt-2">
        {stickers && stickers.length > 0 ? <StickerInbox stickers={stickers} /> : null}

        <Banner tone="yellow" as="h1">
          {houseName.toUpperCase()}
        </Banner>

        {/* house scene */}
        <div className="relative mt-3 flex h-[200px] items-end justify-center overflow-hidden rounded-2xl border-[3px] border-ink bg-teal-pale shadow-pop">
          <div aria-hidden className="absolute inset-x-0 top-0 h-[52px] bg-teal-light" />
          <ArtSlot
            label={`HOUSE ART\n@ ${stage.name}`}
            className="relative mb-2 h-[132px] w-[132px] flex-col"
          />
          <ArtSlot
            tone="red"
            label="TRADIE"
            className="absolute right-2.5 bottom-2 h-[92px] w-[54px]"
          />
        </div>

        {/* stage progress */}
        <PopCard className="mt-2.5 px-3 py-2.5">
          <div className="flex justify-between font-display text-xs text-ink">
            <span className="uppercase">{stage.name} stage</span>
            <span className="text-red">{progress}%</span>
          </div>
          <div className="mt-1.5 h-3.5 overflow-hidden rounded-full border-2 border-ink bg-[#eee]">
            <div
              className="h-full bg-teal transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 font-sans text-[11px] font-bold text-mud">
            {stage.loads > 0
              ? `${student.house_loads}/${stage.loads} ${stage.unit}`
              : "The house is finished — take a look."}
          </p>
          <p className="sr-only">
            House project: stage {student.house_stage + 1} of {HOUSE_STAGES.length}, {stage.name},{" "}
            {progress}% complete.
          </p>
        </PopCard>

        <PopLink
          href="/play/jobs"
          tone="red"
          size="lg"
          full
          className="mt-3"
          sub={`${jobs.length} JOBS READY TODAY`}
        >
          GO TO JOB BOARD ▸
        </PopLink>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
