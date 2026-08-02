import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArtSlot, Pill, PopCard, PopLink, PopNote } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { rareItemForZone } from "@/lib/game/progression";
import { zoneForTable } from "@/lib/game/zones";

/** D1 · Boss Battle intro — the big final job for a trade zone. */
export default async function BossPage(props: PageProps<"/play/boss/[table]">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { table: tableParam } = await props.params;
  const table = Number(tableParam);
  const { unlocked } = await getUnlockState(student.id);
  if (!Number.isInteger(table) || !unlocked.includes(table)) notFound();

  const zone = zoneForTable(table);
  const prize = rareItemForZone(table);

  return (
    <Screen tone="red">
      <ScreenBody className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <Link
            href="/play/zones"
            aria-label="Back to the trade zones"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
          <Pill tone="ink">BOSS JOB · ×{table}</Pill>
        </div>

        <h1 className="mt-4 font-display text-[28px] leading-tight text-white [text-shadow:2px_2px_0_#111]">
          The {zone.trade} Big One
        </h1>
        <p className="mt-1.5 font-sans text-[13px] font-extrabold text-red-tint">
          A harder mixed set under the clock. Finish it and the job&apos;s yours.
        </p>

        <ArtSlot tone="light" label="BOSS JOB SCENE ART" className="mt-4 h-[130px] w-full" />

        <PopCard tone="yellow" className="mt-3.5 p-3 shadow-pop">
          <p className="font-sans text-[10px] font-black tracking-wide text-yellow-deep uppercase">
            Rare reward
          </p>
          <p className="mt-1 font-display text-sm text-ink">★ {prize.name}</p>
          <p className="mt-0.5 font-sans text-[11px] font-bold text-yellow-deep">
            {prize.blurb} — only from this boss.
          </p>
        </PopCard>

        <div className="mt-3">
          <PopNote tone="light">
            20 questions · multiply and divide mixed · 8 seconds each.
          </PopNote>
        </div>

        <PopLink
          href={`/play/run?mode=boss&table=${table}`}
          tone="ink"
          size="lg"
          full
          className="mt-auto"
        >
          TAKE THE JOB ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
