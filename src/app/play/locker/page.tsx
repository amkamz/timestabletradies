import Link from "next/link";
import { redirect } from "next/navigation";

import { ArtSlot, Banner, PopCard } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";
import { getCosmetics } from "@/lib/data/student";
import { formatTradieName } from "@/lib/game/names";
import { rankName } from "@/lib/game/progression";

import { LockerGrid } from "./locker-grid";

/** F3 · Locker. */
export default async function LockerPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const owned = await getCosmetics(student.id);

  const tradieName =
    student.name_trade && student.name_adjective && student.name_surname
      ? formatTradieName({
          trade: student.name_trade,
          adjective: student.name_adjective,
          surname: student.name_surname,
        })
      : student.display_name;

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <div className="flex items-center justify-between">
          <Banner tone="ink">THE LOCKER</Banner>
          <Link
            href="/play/settings"
            className="rounded-xl border-[3px] border-ink bg-white px-2.5 py-1.5 font-display text-[10px] text-ink shadow-pop-sm"
          >
            SETTINGS
          </Link>
        </div>

        <PopCard className="mt-3 flex items-center gap-3 p-3 shadow-pop">
          <ArtSlot label="TRADIE" className="h-[86px] w-[58px]" />
          <span>
            <span className="block font-display text-sm text-ink">{tradieName}</span>
            <span className="block font-sans text-[11px] font-black text-red uppercase">
              {rankName(student.rank_rung)}
            </span>
            <span className="block font-sans text-[10.5px] font-bold text-mud">
              {owned.length} item{owned.length === 1 ? "" : "s"} collected
            </span>
          </span>
        </PopCard>

        <LockerGrid studentId={student.id} owned={owned} />
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
