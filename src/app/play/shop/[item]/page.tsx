import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ArtSlot, Coin, PopCard } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getCosmetics } from "@/lib/data/student";
import { SHOP_CATEGORIES, canPurchase, findItem } from "@/lib/game/shop";
import { levelFromXp } from "@/lib/game/city-level";

import { TryOnActions } from "./try-on";

/** F2 · Try-on — preview before spending coins. */
export default async function TryOnPage(props: PageProps<"/play/shop/[item]">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { item: itemKey } = await props.params;
  const item = findItem(itemKey);
  if (!item) notFound();

  const owned = await getCosmetics(student.id);
  const ownedKeys = owned.map((o) => o.item_key);
  const check = canPurchase(item, {
    coins: student.coins,
    level: levelFromXp(student.city_xp).level,
    owned: ownedKeys,
  });
  const isOwned = ownedKeys.includes(item.key);

  return (
    <Screen tone="paper">
      <ScreenBody className="items-center px-5 pt-7">
        <div className="flex w-full items-center justify-between">
          <Link
            href="/play/shop"
            aria-label="Back to the shop"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
          <p className="flex items-center gap-1.5 rounded-xl border-[3px] border-ink bg-white py-1 pr-2.5 pl-1">
            <Coin />
            <span className="font-display text-[11px] text-ink" aria-hidden>
              {student.coins.toLocaleString()}
            </span>
            <span className="sr-only">You have {student.coins.toLocaleString()} coins</span>
          </p>
        </div>

        <div
          className="mt-4 flex h-[240px] w-full items-center justify-center rounded-2xl border-[3px] border-ink shadow-pop"
          style={{
            background: `linear-gradient(160deg, ${item.swatch[0]} 0 55%, ${item.swatch[1]} 55% 100%)`,
          }}
        >
          <ArtSlot
            label={"TRADIE WEARING\nTHIS ITEM"}
            className="h-[180px] w-[118px] flex-col border-ink"
          />
        </div>

        <h1 className="mt-4 font-display text-xl text-ink">{item.name}</h1>
        <p className="font-sans text-[11px] font-bold text-mud">
          {SHOP_CATEGORIES[item.category].name}
        </p>

        <PopCard className="mt-3 w-full p-3 text-center shadow-pop">
          <p className="flex items-center justify-center gap-2 font-display text-lg text-ink">
            <Coin size={20} />
            <span aria-hidden>{item.coins.toLocaleString()}</span>
            <span className="sr-only">{item.coins.toLocaleString()} coins</span>
          </p>
          <p className="mt-1 font-sans text-[11px] font-bold text-mud">
            Looks only — it won&apos;t change how hard your jobs are, or what they pay.
          </p>
        </PopCard>

        <div className="mt-auto w-full pt-5">
          <TryOnActions
            studentId={student.id}
            itemKey={item.key}
            canBuy={check.ok}
            blockedMessage={check.ok ? undefined : check.message}
            owned={isOwned}
          />
        </div>
      </ScreenBody>
    </Screen>
  );
}
