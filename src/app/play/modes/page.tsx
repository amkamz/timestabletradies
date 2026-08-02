import Link from "next/link";

import { Banner, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { PRACTICE_MODES } from "@/lib/game/modes";

/** C2 · Practice hub — pick a single-player mode. */
export default function ModesPage() {
  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="yellow">TRAINING SHED</Banner>

        <ul className="mt-3 flex flex-1 flex-col gap-2.5">
          {PRACTICE_MODES.map((mode) => (
            <li key={mode.key}>
              <Link
                href={mode.href}
                className={cx(
                  "block rounded-xl border-[3px] border-ink px-3.5 py-3 shadow-pop",
                  mode.tone,
                )}
              >
                <span className="block font-display text-[15px]">{mode.name}</span>
                <span className={cx("block font-sans text-[11px] font-extrabold", mode.sub)}>
                  {mode.blurb}
                </span>
              </Link>
            </li>
          ))}

          <li>
            <Link
              href="/play/crew"
              className="block rounded-xl border-[3px] border-ink bg-blue px-3.5 py-3 text-white shadow-pop"
            >
              <span className="block font-display text-[15px]">Crew &amp; Races</span>
              <span className="block font-sans text-[11px] font-extrabold text-white/80">
                Race the crew your parent has linked
              </span>
            </Link>
          </li>
        </ul>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
