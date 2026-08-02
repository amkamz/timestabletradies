import { notFound, redirect } from "next/navigation";

import { Runner, type RunnerConfig } from "@/components/play/runner";
import { requireActiveStudent } from "@/lib/data/session";
import {
  getAssignment,
  getMastery,
  getUnlockState,
  statsFor,
} from "@/lib/data/student";
import { isDueForReview, practiceWeight } from "@/lib/game/mastery";
import {
  JOB_TYPES,
  buildOrderSteps,
  deliveryQuestion,
  generateJobBoard,
  generateQuestionSet,
  makeRng,
  matchPairs,
  type Question,
} from "@/lib/game/questions";
import { parseJobId } from "@/lib/game/job-id";
import { dailySeed, newRunSeed } from "@/lib/game/seed";
import { zoneForTable } from "@/lib/game/zones";

/**
 * Assembles the question set for whatever is being played — a job board job,
 * Mixed Muster, or any of the single-player modes — then hands it to the
 * shared Runner. Every mode obeys the multiplication-first rule by only ever
 * being handed tables whose division has actually been unlocked.
 */
export default async function RunPage(props: PageProps<"/play/run">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const params = await props.searchParams;
  const jobParam = typeof params.job === "string" ? params.job : null;
  const modeParam = typeof params.mode === "string" ? params.mode : null;

  const [{ unlocked, divisionUnlocked }, mastery] = await Promise.all([
    getUnlockState(student.id),
    getMastery(student.id),
  ]);

  if (unlocked.length === 0) redirect("/play");

  const weightFor = (a: number, b: number) => practiceWeight(statsFor(mastery, a, b));

  /* ------------------------------------------------------------- job board */

  if (jobParam) {
    const config = await buildJobConfig({
      studentId: student.id,
      jobParam,
      unlocked,
      divisionUnlocked,
      weightFor,
    });
    if (!config) notFound();
    return <Runner {...config} />;
  }

  /* ------------------------------------------------------------------ modes */

  const opParam = typeof params.op === "string" ? params.op : "multiply";
  const tablesParam =
    typeof params.tables === "string"
      ? params.tables
          .split(",")
          .map(Number)
          .filter((t) => unlocked.includes(t))
      : [];

  const seed = newRunSeed(student.id, String(modeParam));

  switch (modeParam) {
    case "garage": {
      // Smart practice against the teacher's focus tables, adapting to
      // whatever the student is weakest and slowest on (spec §6.1).
      const assignment = await getAssignment(student.id);
      const focus =
        assignment && assignment.tables.length > 0
          ? assignment.tables.filter((t) => unlocked.includes(t))
          : unlocked;

      return (
        <Runner
          studentId={student.id}
          mode="garage"
          format="choice"
          label="The Garage"
          tone="teal"
          operation={assignment?.operation ?? "multiply"}
          questions={generateQuestionSet({
            seed,
            tables: focus.length > 0 ? focus : unlocked,
            divisionUnlocked,
            operation: assignment?.operation ?? "multiply",
            count: 15,
            weightFor,
          })}
          homeHref="/play/modes"
        />
      );
    }

    case "yard": {
      // Speed test across the whole unlocked range → Trade Rank.
      return (
        <Runner
          studentId={student.id}
          mode="yard"
          format="choice"
          label="The Yard"
          tone="blue"
          questions={generateQuestionSet({
            seed,
            tables: unlocked,
            divisionUnlocked,
            operation: "both",
            count: 20,
          })}
          timerSeconds={10}
          homeHref="/play/modes"
        />
      );
    }

    case "inspection": {
      // 25 multiplication-only questions, strict 6-second timer (spec §6.1).
      return (
        <Runner
          studentId={student.id}
          mode="inspection"
          format="choice"
          label="Site Inspection"
          tone="red"
          questions={generateQuestionSet({
            seed,
            tables: unlocked,
            operation: "multiply",
            count: 25,
          })}
          timerSeconds={6}
          homeHref="/play/modes"
        />
      );
    }

    case "toolbox": {
      // Relaxed and timer-free, with the student's own choice of mix.
      const tables = tablesParam.length > 0 ? tablesParam : unlocked;
      const operation = opParam === "divide" || opParam === "both" ? opParam : "multiply";
      return (
        <Runner
          studentId={student.id}
          mode="toolbox"
          format="type"
          label="Toolbox Time"
          tone="teal"
          operation={operation}
          questions={generateQuestionSet({
            seed,
            tables,
            divisionUnlocked,
            operation,
            count: 12,
            withChoices: false,
            // Bring back anything drifting, per spaced repetition (spec §11).
            weightFor: (a, b) =>
              isDueForReview(statsFor(mastery, a, b)) ? weightFor(a, b) : weightFor(a, b) / 2,
          })}
          timerSeconds={null}
          homeHref="/play/modes"
        />
      );
    }

    case "bigjob": {
      // 100 questions, 5 minutes, once a month. Shared to the teacher.
      return (
        <Runner
          studentId={student.id}
          mode="bigjob"
          format="choice"
          label="The Big Job"
          tone="ink"
          questions={generateQuestionSet({
            seed,
            tables: unlocked,
            divisionUnlocked,
            operation: "both",
            count: 100,
          })}
          totalSeconds={300}
          homeHref="/play/modes"
        />
      );
    }

    case "boss": {
      const table = Number(params.table);
      if (!unlocked.includes(table)) notFound();
      const zone = zoneForTable(table);
      return (
        <Runner
          studentId={student.id}
          mode="boss"
          table={table}
          format="choice"
          label={`Boss · ${zone.trade}`}
          tone="red"
          operation="both"
          questions={generateQuestionSet({
            seed,
            tables: [table],
            divisionUnlocked,
            operation: "both",
            count: 20,
          })}
          timerSeconds={8}
          reward={{ coins: 400, materials: 12 }}
          homeHref="/play/zones"
        />
      );
    }

    default:
      notFound();
  }
}

/* ------------------------------------------------------------------ helpers */

async function buildJobConfig({
  studentId,
  jobParam,
  unlocked,
  divisionUnlocked,
  weightFor,
}: {
  studentId: string;
  jobParam: string;
  unlocked: number[];
  divisionUnlocked: number[];
  weightFor: (a: number, b: number) => number;
}): Promise<RunnerConfig | null> {
  // Mixed Muster draws across everything unlocked.
  if (jobParam === "muster") {
    return {
      studentId,
      mode: "job",
      jobType: "muster",
      format: "choice",
      label: "Mixed Muster",
      tone: "ink",
      operation: "both",
      questions: generateQuestionSet({
        seed: newRunSeed(studentId, "muster"),
        tables: unlocked,
        divisionUnlocked,
        operation: "both",
        count: JOB_TYPES.muster.questions,
        weightFor,
      }),
      reward: { coins: 90, materials: 5 },
      homeHref: "/play/jobs",
    };
  }

  const parsed = parseJobId(jobParam);
  if (!parsed) return null;

  // Must match the seed the job board itself used, or the offer won't resolve.
  const offer = generateJobBoard(dailySeed(studentId), unlocked).find((j) => j.id === jobParam);
  if (!offer) return null;

  const meta = JOB_TYPES[offer.type];
  const zone = zoneForTable(offer.table);
  const tone =
    zone.accent === "yellow" || zone.accent === "slate" ? "orange" : (zone.accent as RunnerConfig["tone"]);

  const rng = makeRng(newRunSeed(offer.id));
  const label = `${meta.name} · ×${offer.table}`;
  const base = {
    studentId,
    mode: "job" as const,
    jobType: offer.type,
    table: offer.table,
    label,
    tone,
    reward: { coins: offer.coins, materials: offer.materials },
    homeHref: "/play/jobs",
  };

  switch (offer.type) {
    case "delivery": {
      // Word problems, typed answers, read-aloud available.
      const questions: Question[] = Array.from({ length: meta.questions }, () =>
        deliveryQuestion(rng, offer.table, 2 + Math.floor(rng() * 10)),
      );
      return { ...base, format: "word", questions };
    }
    case "measure": {
      const pairs = matchPairs(rng, offer.table, 4);
      const questions: Question[] = pairs.map((p) => ({
        id: p.id,
        operation: "multiply",
        a: offer.table,
        b: p.answer / offer.table,
        prompt: p.prompt,
        spoken: `What is ${p.prompt}?`,
        answer: p.answer,
        factKey: p.factKey,
      }));
      return { ...base, format: "match", questions };
    }
    case "build": {
      const steps = buildOrderSteps(rng, offer.table, meta.questions);
      return { ...base, format: "sequence", questions: steps };
    }
    default: {
      return {
        ...base,
        format: "choice",
        questions: generateQuestionSet({
          seed: newRunSeed(offer.id),
          tables: [offer.table],
          operation: "multiply",
          count: meta.questions,
          weightFor,
        }),
      };
    }
  }
}
