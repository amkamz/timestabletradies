import { redirect } from "next/navigation";

import { ArtSlot, PopCard, PopLink } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getRareItems } from "@/lib/data/student";
import { RARE_HOUSE_ITEMS } from "@/lib/game/progression";

/** D5 · Move-in Day — the completed house. */
export default async function MoveInPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const rare = await getRareItems(student.id);
  const won = RARE_HOUSE_ITEMS.filter((i) => rare.some((r) => r.item_key === i.key));

  return (
    <Screen tone="teal">
      <ScreenBody className="items-center px-5 pt-9 text-center">
        <h1 className="anim-pop-in inline-block -rotate-3 rounded-2xl border-4 border-ink bg-yellow px-5 py-2 font-display text-2xl text-ink shadow-pop">
          MOVE-IN DAY!
        </h1>

        <ArtSlot
          tone="light"
          label={"FINISHED HOUSE\n+ TRADIE\n+ SOLD SIGN"}
          className="mt-5 h-[200px] w-full flex-col"
        />

        <p className="mt-4 font-display text-lg text-white [text-shadow:2px_2px_0_#111]">
          {student.name_trade ? `The ${student.name_trade}'s Cottage` : "Your house"} is finished.
        </p>
        <p className="mt-1.5 font-sans text-[13px] leading-relaxed font-extrabold text-teal-wash">
          Foundations to landscaping — every stage built off the back of your times tables.
        </p>

        {won.length > 0 ? (
          <PopCard className="mt-4 w-full p-3 text-left shadow-pop">
            <p className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
              Rare items on the build
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {won.map((item) => (
                <li key={item.key} className="font-sans text-[11.5px] font-bold text-ink">
                  ★ {item.name}
                </li>
              ))}
            </ul>
          </PopCard>
        ) : null}

        <div className="mt-auto flex w-full flex-col gap-2.5 pt-6">
          <PopLink href="/play" tone="ink" size="lg" full>
            START THE NEXT BUILD ▸
          </PopLink>
          <PopLink href="/play/house" tone="white" size="md" full>
            LOOK BACK OVER THE STAGES
          </PopLink>
        </div>
      </ScreenBody>
    </Screen>
  );
}
