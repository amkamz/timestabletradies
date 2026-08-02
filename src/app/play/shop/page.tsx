import Link from "next/link";
import { redirect } from "next/navigation";

import { Banner, Coin, PopCard, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";
import { getCosmetics } from "@/lib/data/student";
import { SHOP_CATEGORIES, SHOP_ITEMS, type ShopCategory } from "@/lib/game/shop";

/**
 * F1 · Cosmetics Shop.
 *
 * Coins only — there is no real-money purchase, ad or upsell anywhere on
 * this screen or anywhere else in the student app (spec §2, §5).
 */
export default async function ShopPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const owned = await getCosmetics(student.id);
  const ownedKeys = new Set(owned.map((o) => o.item_key));

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <div className="flex items-center justify-between">
          <Banner tone="yellow">THE SUPPLY SHOP</Banner>
          <p className="flex items-center gap-1.5 rounded-xl border-[3px] border-ink bg-white py-1 pr-2.5 pl-1">
            <Coin />
            <span className="font-display text-[11px] text-ink" aria-hidden>
              {student.coins.toLocaleString()}
            </span>
            <span className="sr-only">You have {student.coins.toLocaleString()} coins</span>
          </p>
        </div>

        {(Object.keys(SHOP_CATEGORIES) as ShopCategory[]).map((category) => {
          const meta = SHOP_CATEGORIES[category];
          const items = SHOP_ITEMS.filter((i) => i.category === category);

          return (
            <section key={category} className="mt-4">
              <h2 className="font-display text-sm text-ink">{meta.name}</h2>
              <p className="font-sans text-[10.5px] font-bold text-mud">{meta.blurb}</p>

              <ul className="mt-2 grid grid-cols-2 gap-2">
                {items.map((item) => {
                  const isOwned = ownedKeys.has(item.key);
                  const lockedByRank = Boolean(
                    item.requiresRank && student.rank_rung < item.requiresRank,
                  );
                  const affordable = student.coins >= item.coins;

                  return (
                    <li key={item.key}>
                      <Link href={`/play/shop/${item.key}`} className="block h-full">
                        <PopCard
                          className={cx(
                            "flex h-full flex-col gap-1.5 p-2.5",
                            lockedByRank && "opacity-60",
                          )}
                        >
                          <span
                            aria-hidden
                            className="h-12 w-full rounded-lg border-2 border-ink"
                            style={{
                              background: `linear-gradient(135deg, ${item.swatch[0]} 0 50%, ${item.swatch[1]} 50% 100%)`,
                            }}
                          />
                          <span className="font-display text-[11.5px] leading-tight text-ink">
                            {item.name}
                          </span>

                          {isOwned ? (
                            <span className="font-sans text-[10px] font-black text-teal">
                              IN YOUR LOCKER
                            </span>
                          ) : lockedByRank ? (
                            <span className="font-sans text-[10px] font-black text-sand">
                              RANK {item.requiresRank}
                            </span>
                          ) : (
                            <span
                              className={cx(
                                "flex items-center gap-1 font-display text-[11px]",
                                affordable ? "text-ink" : "text-sand",
                              )}
                            >
                              <Coin size={13} />
                              <span aria-hidden>{item.coins.toLocaleString()}</span>
                              <span className="sr-only">
                                {item.coins.toLocaleString()} coins
                                {affordable ? "" : " — not enough yet"}
                              </span>
                            </span>
                          )}
                        </PopCard>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
