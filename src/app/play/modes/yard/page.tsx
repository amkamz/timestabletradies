import { redirect } from "next/navigation";

import { Banner, PopCard, PopLink, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { TRADE_RANKS, rankName } from "@/lib/game/progression";

/** C4 · The Yard → Trade Rank, a 10-rung ladder. */
export default async function YardPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const current = student.rank_rung;

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="ink">TRADE RANK</Banner>

        <PopCard tone="yellow" className="mt-3 p-3 text-center shadow-pop">
          <p className="font-sans text-[10px] font-black text-yellow-deep uppercase">
            You&apos;re currently
          </p>
          <p className="font-display text-xl text-ink">{rankName(current)}</p>
          <p className="font-sans text-[11px] font-extrabold text-yellow-deep">
            Rung {current} of {TRADE_RANKS.length}
          </p>
        </PopCard>

        <ol className="mt-3 flex flex-1 flex-col-reverse gap-1.5">
          {TRADE_RANKS.map((rank, i) => {
            const rung = i + 1;
            const isCurrent = rung === current;
            const isTop = rung === TRADE_RANKS.length;
            return (
              <li
                key={rank}
                aria-current={isCurrent ? "step" : undefined}
                className={cx(
                  "flex items-center gap-2",
                  isCurrent
                    ? "rounded-[9px] border-[3px] border-ink bg-teal px-2.5 py-1.5 shadow-pop-sm"
                    : isTop
                      ? "rounded-[9px] bg-ink px-2.5 py-1.5"
                      : "px-2.5 py-1",
                  !isCurrent && !isTop && rung < current ? "opacity-55" : "",
                )}
              >
                <span
                  className={cx(
                    "w-4 font-display text-[11px]",
                    isCurrent ? "text-white" : isTop ? "text-yellow" : "text-sand",
                  )}
                >
                  {rung}
                </span>
                <span
                  className={cx(
                    "flex-1 text-[11px]",
                    isCurrent
                      ? "font-display text-xs text-white"
                      : isTop
                        ? "font-sans font-extrabold text-white"
                        : "font-sans font-extrabold text-mud",
                  )}
                >
                  {rank}
                </span>
                {isCurrent ? <span aria-hidden>👷</span> : null}
              </li>
            );
          })}
        </ol>

        <PopLink href="/play/run?mode=yard" tone="teal" size="lg" full className="mt-3">
          TAKE THE SPEED TEST ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
