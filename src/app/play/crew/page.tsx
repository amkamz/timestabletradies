import Link from "next/link";
import { redirect } from "next/navigation";

import { Banner, PopCard, PopNote, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";
import { formatTradieName } from "@/lib/game/names";
import { levelLabel } from "@/lib/game/city-level";
import { createClient } from "@/lib/supabase/server";

/** E1 · Crew race lobby, plus the entry points for Trade Expo and challenges. */
export default async function CrewPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const supabase = await createClient();
  const [{ data: crew }, { data: challenges }] = await Promise.all([
    supabase.from("crew_roster").select("*"),
    supabase
      .from("challenges")
      .select("*")
      .eq("to_student", student.id)
      .eq("status", "sent")
      .order("created_at", { ascending: false }),
  ]);

  const roster = crew ?? [];

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="teal">YOUR CREW</Banner>

        {challenges && challenges.length > 0 ? (
          <PopCard tone="yellow" className="mt-3 p-3 shadow-pop">
            <p className="font-display text-[13px] text-ink">
              ⚡ {challenges.length} job challenge{challenges.length === 1 ? "" : "s"} waiting
            </p>
            <Link
              href={`/play/crew/challenge/${challenges[0].id}`}
              className="mt-1.5 inline-block font-sans text-[11px] font-black text-red underline"
            >
              Take the first one →
            </Link>
          </PopCard>
        ) : null}

        <ul className="mt-3 flex flex-col gap-2">
          {roster.map((mate) => (
            <PopCard as="li" key={mate.id} className="flex items-center gap-2.5 py-2">
              <span
                aria-hidden
                className="h-9 w-9 shrink-0 rounded-[10px] border-[2.5px] border-ink bg-yellow"
              />
              <span className="flex-1">
                <span className="block font-display text-[13px] text-ink">
                  {mate.name_trade && mate.name_adjective && mate.name_surname
                    ? formatTradieName({
                        trade: mate.name_trade,
                        adjective: mate.name_adjective,
                        surname: mate.name_surname,
                      })
                    : mate.display_name}
                </span>
                <span className="block font-sans text-[10px] font-extrabold text-mud">
                  {levelLabel(mate.city_xp)}
                </span>
              </span>
              <Link
                href={`/play/crew/challenge/new?to=${mate.id}`}
                className="rounded-full border-2 border-ink bg-red px-2.5 py-1 font-display text-[9px] text-white"
              >
                CHALLENGE
              </Link>
            </PopCard>
          ))}

          {roster.length === 0 ? (
            <li>
              <PopNote>
                No crew linked yet. A parent adds crew from the dashboard — you can still race
                practice opponents any time.
              </PopNote>
            </li>
          ) : null}
        </ul>

        <div className="mt-4 flex flex-col gap-2.5">
          <RaceLink
            href="/play/crew/race"
            title="Crew Race"
            blurb="Live race on your teacher's tables"
            tone="bg-blue text-white"
            sub="text-white/80"
          />
          <RaceLink
            href="/play/crew/expo"
            title="Trade Expo"
            blurb="Open race across your whole crew network"
            tone="bg-teal text-white"
            sub="text-teal-mist"
          />
        </div>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}

function RaceLink({
  href,
  title,
  blurb,
  tone,
  sub,
}: {
  href: string;
  title: string;
  blurb: string;
  tone: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className={cx("block rounded-xl border-[3px] border-ink px-3.5 py-3 shadow-pop", tone)}
    >
      <span className="block font-display text-[15px]">{title}</span>
      <span className={cx("block font-sans text-[11px] font-extrabold", sub)}>{blurb}</span>
    </Link>
  );
}
