import { PopCard, PopNote, cx } from "@/components/ui/pop";
import { requireParent } from "@/lib/actions/auth";
import { updatePlan } from "@/lib/actions/family";
import {
  FAMILY_LIMITS,
  PLANS,
  describeSubscription,
  formatAud,
  subscriptionTotalCents,
  type PlanKey,
} from "@/lib/game/billing";
import { createClient } from "@/lib/supabase/server";

/**
 * H4 · Billing.
 *
 * This screen — and every other mention of money — exists only in the
 * parent area. The student app has no payment prompts, ads, upsells or
 * currency purchases of any kind (spec §2).
 */
export default async function BillingPage() {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const [{ data: family }, { count }] = await Promise.all([
    supabase.from("families").select("*").eq("id", familyId).single(),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId),
  ]);

  const students = Math.max(1, count ?? 1);
  const currentPlan = (family?.plan ?? "annual") as PlanKey;

  return (
    <>
      <h1 className="font-display text-2xl text-ink">Billing</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        Real money only ever touches this account. Kids never see any of it.
      </p>

      <PopCard className="mt-5 p-4">
        <p className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
          Current subscription
        </p>
        <p className="mt-1 font-display text-xl text-ink">
          {describeSubscription(currentPlan, students)}
        </p>
        <p className="mt-1 font-sans text-xs font-bold text-mud">
          Status: {family?.plan_status ?? "trialing"}
        </p>
      </PopCard>

      <form action={updatePlan} className="mt-5 grid gap-3 sm:grid-cols-2">
        {(Object.keys(PLANS) as PlanKey[]).map((key) => {
          const plan = PLANS[key];
          const total = subscriptionTotalCents(key, students);
          const active = key === currentPlan;

          return (
            <label key={key} className="cursor-pointer">
              <input
                type="radio"
                name="plan"
                value={key}
                defaultChecked={active}
                className="peer sr-only"
              />
              <PopCard
                className={cx(
                  "h-full p-4 peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
                  active ? "border-teal bg-teal-tint" : "",
                )}
              >
                <h2 className="font-display text-lg text-ink">{plan.name}</h2>
                <p className="mt-1 font-display text-2xl text-ink">
                  {formatAud(plan.baseCents)}
                  <span className="font-sans text-xs font-black text-mud">/{plan.period}</span>
                </p>
                <p className="mt-1.5 font-sans text-xs font-bold text-mud">{plan.blurb}</p>
                <p className="mt-2 font-sans text-xs font-black text-teal-deep">
                  Your total: {formatAud(total)} per {plan.period}
                </p>
                {active ? (
                  <p className="mt-1.5 font-sans text-[11px] font-black text-teal uppercase">
                    Current plan
                  </p>
                ) : null}
              </PopCard>
            </label>
          );
        })}

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="pop-press rounded-2xl border-[3px] border-ink bg-teal px-5 py-3 font-display text-base text-white shadow-pop"
          >
            SAVE PLAN
          </button>
        </div>
      </form>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">What&apos;s included</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          <Bullet>Up to {FAMILY_LIMITS.maxStudents} student profiles on one account.</Bullet>
          <Bullet>
            Up to {FAMILY_LIMITS.maxParents} parent accounts, each with full admin access.
          </Bullet>
          <Bullet>Unlimited grandparent accounts — stickers only, no stats or billing.</Bullet>
          <Bullet>Every game mode, all trade zones, and the full cosmetics shop.</Bullet>
        </ul>

        <div className="mt-4">
          <PopNote>
            Coins are earned by doing jobs and can never be bought. There is no way to spend real
            money inside the kids&apos; app.
          </PopNote>
        </div>
      </section>
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 font-sans text-sm font-bold text-mud">
      <span aria-hidden className="text-teal">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
