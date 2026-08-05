import { redirect } from "next/navigation";

import { Banner, PopCard, PopLink } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { levelFromXp } from "@/lib/game/city-level";

/**
 * C4 · The Yard — the speed test.
 *
 * **The Trade Rank ladder that used to be this whole screen is gone.** Rank was
 * recomputed from a single round and could fall, so a child could take one slow
 * turn and watch themselves demoted from Foreman to Leading Hand. That is a
 * cruel thing to do over twenty questions on a tired afternoon, and it made the
 * rank useless as a gate besides: anything keyed off it could vanish.
 *
 * City level replaced it, and city level is earned by turning up rather than by
 * being fast. So the speed test no longer awards a title — it is a test of
 * speed, and the only thing it hands back is how fast you went.
 *
 * This screen becomes the countdown game when that is built: ten seconds a
 * question, dropping a tenth each time, and a high score to chase. A number
 * that goes up beats a title that can go down.
 */
export default async function YardPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { level } = levelFromXp(student.city_xp);

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="ink">THE YARD</Banner>

        <PopCard tone="yellow" className="mt-3 p-4 text-center shadow-pop">
          <p className="font-sans text-[10px] font-black text-yellow-deep uppercase">
            Sparky&apos;s City
          </p>
          <p className="font-display text-2xl text-ink">Level {level}</p>
          <p className="mt-1 font-sans text-[11px] font-extrabold text-yellow-deep">
            Built by turning up, not by going fast
          </p>
        </PopCard>

        <PopCard className="mt-3 flex-1 p-4">
          <h2 className="font-display text-base text-ink">How fast can you go?</h2>
          <p className="mt-1.5 font-sans text-[12px] font-bold text-mud">
            Twenty questions from every table you&apos;ve opened, ten seconds
            each. No coins for speed and nothing to lose — it&apos;s just you
            against the clock.
          </p>
          <p className="mt-3 font-sans text-[12px] font-bold text-mud">
            Every answer still counts toward your mastery grid, so a fast round
            is never a wasted one.
          </p>
        </PopCard>

        <PopLink href="/play/run?mode=yard" tone="teal" size="lg" full className="mt-3">
          TAKE THE SPEED TEST ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
