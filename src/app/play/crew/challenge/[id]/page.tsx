import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PopCard, PopLink, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { createClient } from "@/lib/supabase/server";

/** E4 · Job Challenge result — the async head-to-head compare. */
export default async function ChallengePage(props: PageProps<"/play/crew/challenge/[id]">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { id } = await props.params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!challenge) notFound();

  const isRecipient = challenge.to_student === student.id;
  const myRunId = isRecipient ? challenge.to_run : challenge.from_run;
  const theirRunId = isRecipient ? challenge.from_run : challenge.to_run;

  // Haven't played my side yet — go and play it.
  if (!myRunId) {
    return (
      <Screen tone="blue">
        <ScreenBody className="items-center px-5 pt-10 text-center">
          <h1 className="font-display text-[26px] text-white [text-shadow:2px_2px_0_#111]">
            Job Challenge
          </h1>
          <p className="mt-2 font-sans text-[13px] font-extrabold text-white/85">
            {challenge.questions} questions
            {challenge.table_no ? ` on the ×${challenge.table_no} table` : ""}. Same set for both
            of you.
          </p>
          <PopLink
            href={`/play/run?job=muster&challenge=${challenge.id}`}
            tone="yellow"
            size="lg"
            full
            className="mt-auto"
          >
            TAKE IT ON ▸
          </PopLink>
          <Link href="/play/crew" className="mt-3 font-sans text-xs font-bold text-white underline">
            Not now
          </Link>
        </ScreenBody>
      </Screen>
    );
  }

  const runIds = [myRunId, theirRunId].filter(Boolean) as string[];
  const { data: runs } = await supabase.from("runs").select("*").in("id", runIds);

  const mine = runs?.find((r) => r.id === myRunId);
  const theirs = runs?.find((r) => r.id === theirRunId);

  const waiting = !theirs;
  const myScore = mine?.correct ?? 0;
  const theirScore = theirs?.correct ?? 0;
  const iWon = myScore > theirScore;
  const drawn = myScore === theirScore;

  return (
    <Screen tone="blue">
      <ScreenBody className="items-center px-5 pt-9 text-center">
        <h1 className="font-display text-[26px] text-white [text-shadow:2px_2px_0_#111]">
          Job Challenge
        </h1>

        {waiting ? (
          <p className="mt-3 font-sans text-sm font-extrabold text-white/90">
            Your score is locked in. Waiting on the other tradie to finish.
          </p>
        ) : (
          <p
            className={cx(
              "anim-pop-in mt-4 inline-block -rotate-2 rounded-2xl border-4 border-ink px-5 py-2 font-display text-xl shadow-pop",
              iWon ? "bg-yellow text-ink" : drawn ? "bg-white text-ink" : "bg-slate text-white",
            )}
          >
            {iWon ? "YOU TOOK IT!" : drawn ? "DEAD HEAT!" : "GOOD RACE!"}
          </p>
        )}

        <div className="mt-5 flex w-full gap-2.5">
          <ScoreCard
            label="You"
            correct={myScore}
            total={mine?.questions ?? challenge.questions}
            avgMs={mine?.avg_ms ?? 0}
            highlight={!waiting && iWon}
          />
          <ScoreCard
            label="Them"
            correct={waiting ? null : theirScore}
            total={theirs?.questions ?? challenge.questions}
            avgMs={theirs?.avg_ms ?? 0}
            highlight={!waiting && !iWon && !drawn}
          />
        </div>

        <PopLink href="/play/crew" tone="white" size="md" full className="mt-auto">
          BACK TO CREW
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}

function ScoreCard({
  label,
  correct,
  total,
  avgMs,
  highlight,
}: {
  label: string;
  correct: number | null;
  total: number;
  avgMs: number;
  highlight: boolean;
}) {
  return (
    <PopCard className={cx("flex-1 p-3 text-center shadow-pop", highlight && "bg-yellow")}>
      <p className="font-sans text-[10px] font-black text-mud uppercase">{label}</p>
      <p className="font-display text-2xl text-ink">
        {correct === null ? "—" : `${correct}/${total}`}
      </p>
      <p className="font-sans text-[10px] font-bold text-mud">
        {correct === null ? "still playing" : `${(avgMs / 1000).toFixed(1)}s avg`}
      </p>
    </PopCard>
  );
}
