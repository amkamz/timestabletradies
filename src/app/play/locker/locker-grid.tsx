"use client";

import { useTransition } from "react";

import { PopCard, cx } from "@/components/ui/pop";
import { equipItem } from "@/lib/actions/shop";
import { SHOP_CATEGORIES, findItem, type ShopCategory } from "@/lib/game/shop";

/** F3 · Locker — everything owned, and what's currently worn. */
export function LockerGrid({
  studentId,
  owned,
}: {
  studentId: string;
  owned: Array<{ item_key: string; equipped: boolean }>;
}) {
  const [pending, startTransition] = useTransition();

  const byCategory = new Map<ShopCategory, typeof owned>();
  for (const entry of owned) {
    const item = findItem(entry.item_key);
    if (!item) continue;
    const list = byCategory.get(item.category) ?? [];
    list.push(entry);
    byCategory.set(item.category, list);
  }

  if (owned.length === 0) {
    return (
      <p className="mt-4 rounded-2xl border-2 border-dashed border-sand-light bg-white/60 p-4 text-center font-sans text-xs font-bold text-mud">
        Nothing in the locker yet. Finish a few jobs and spend the coins in the shop.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {[...byCategory.entries()].map(([category, entries]) => (
        <section key={category}>
          <h2 className="font-display text-sm text-ink">{SHOP_CATEGORIES[category].name}</h2>
          <ul className="mt-2 grid grid-cols-3 gap-2">
            {entries.map((entry) => {
              const item = findItem(entry.item_key)!;
              return (
                <li key={entry.item_key}>
                  <button
                    type="button"
                    disabled={pending || entry.equipped}
                    aria-pressed={entry.equipped}
                    onClick={() =>
                      startTransition(async () => {
                        await equipItem(studentId, entry.item_key);
                      })
                    }
                    className="w-full text-left"
                  >
                    <PopCard
                      className={cx(
                        "flex h-full flex-col gap-1.5 p-2",
                        entry.equipped && "border-teal bg-teal-tint",
                      )}
                    >
                      <span
                        aria-hidden
                        className="h-10 w-full rounded-md border-2 border-ink"
                        style={{
                          background: `linear-gradient(135deg, ${item.swatch[0]} 0 50%, ${item.swatch[1]} 50% 100%)`,
                        }}
                      />
                      <span className="font-display text-[10px] leading-tight text-ink">
                        {item.name}
                      </span>
                      <span
                        className={cx(
                          "font-sans text-[9px] font-black",
                          entry.equipped ? "text-teal-deep" : "text-mud",
                        )}
                      >
                        {entry.equipped ? "WEARING" : "TAP TO WEAR"}
                      </span>
                    </PopCard>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
