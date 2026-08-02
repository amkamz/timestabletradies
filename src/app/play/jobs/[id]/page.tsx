import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Brick, Coin, Pill, PopCard, PopLink, PopNote, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";
import { DIFFICULTY_META, JOB_TYPES, generateJobBoard } from "@/lib/game/questions";
import { parseJobId } from "@/lib/game/job-id";
import { dailySeed } from "@/lib/game/seed";
import { ACCENT_BG, tradeName, zoneForTable } from "@/lib/game/zones";

/** B3 · Job briefing — confirm before starting, with the multiply-first note. */
export default async function JobBriefingPage(props: PageProps<"/play/jobs/[id]">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { id } = await props.params;
  const { unlocked, divisionUnlocked } = await getUnlockState(student.id);

  // Mixed Muster has no single table — it draws from everything unlocked.
  if (id === "muster") {
    return (
      <MusterBriefing
        tables={unlocked}
        questions={JOB_TYPES.muster.questions}
        href="/play/run?job=muster"
      />
    );
  }

  const parsed = parseJobId(id);
  if (!parsed) notFound();

  const offer = generateJobBoard(dailySeed(student.id), unlocked).find((j) => j.id === id);
  if (!offer) notFound();

  const meta = JOB_TYPES[offer.type];
  const diff = DIFFICULTY_META[offer.difficulty];
  const zone = zoneForTable(offer.table);
  const divisionOpen = divisionUnlocked.includes(offer.table);

  return (
    <Screen tone="orange" className={cx(ACCENT_BG[zone.accent], "text-white")}>
      <ScreenBody className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <Link
            href="/play/jobs"
            aria-label="Back to the job board"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
          <Pill tone="ink">
            {tradeName(offer.table).toUpperCase()} · ×{offer.table}
          </Pill>
        </div>

        <h1 className="mt-4 font-display text-[26px] leading-tight text-white [text-shadow:2px_2px_0_#111]">
          {meta.name}
        </h1>
        <p className="mt-1.5 font-sans text-[13px] font-extrabold text-white/90">{meta.blurb}</p>

        <PopCard className="mt-4 flex flex-col gap-2.5 p-3.5 shadow-pop">
          <Row label="Questions" value={String(offer.questions)} />
          <Divider />
          <Row label="Difficulty" value={diff.label} valueClass="text-amber-deep" />
          <Divider />
          <div className="flex items-center justify-between font-sans text-xs font-extrabold text-mud">
            <span>Reward</span>
            <span className="flex gap-2">
              <span className="flex items-center gap-1 font-display text-[13px] text-ink">
                <Coin size={15} />
                <span aria-hidden>{offer.coins}</span>
                <span className="sr-only">{offer.coins} coins</span>
              </span>
              <span className="flex items-center gap-1 font-display text-[13px] text-ink">
                <Brick size={15} />
                <span aria-hidden>{offer.materials}</span>
                <span className="sr-only">{offer.materials} loads of materials</span>
              </span>
            </span>
          </div>
        </PopCard>

        <div className="mt-3">
          <PopNote tone="light">
            {divisionOpen
              ? `÷ Division for ×${offer.table} is unlocked — it'll turn up in Toolbox Time and Mixed Muster.`
              : `✕ ÷ Division for ×${offer.table} unlocks once you finish a full multiply round.`}
          </PopNote>
        </div>

        <PopLink href={`/play/run?job=${offer.id}`} tone="teal" size="lg" full className="mt-auto">
          CLOCK ON ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between font-sans text-xs font-extrabold text-mud">
      <span>{label}</span>
      <span className={cx("font-display text-ink", valueClass)}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div aria-hidden className="h-0.5 bg-[#eee]" />;
}

function MusterBriefing({
  tables,
  questions,
  href,
}: {
  tables: number[];
  questions: number;
  href: string;
}) {
  return (
    <Screen tone="ink">
      <ScreenBody className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <Link
            href="/play/jobs"
            aria-label="Back to the job board"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
          <Pill tone="red">REVIEW</Pill>
        </div>

        <h1 className="mt-4 font-display text-[26px] leading-tight text-yellow">Mixed Muster</h1>
        <p className="mt-1.5 font-sans text-[13px] font-extrabold text-[#c9c4ba]">
          Everything you&apos;ve unlocked, mixed together — including facts due for a check-in.
        </p>

        <PopCard tone="ink" className="mt-4 border-white/20 p-3.5">
          <p className="font-sans text-[10px] font-black tracking-wide text-teal-light uppercase">
            In the mix
          </p>
          <p className="mt-2 flex flex-wrap gap-1.5">
            {tables.map((t) => (
              <span
                key={t}
                className="rounded-lg border-2 border-yellow px-2 py-0.5 font-display text-[11px] text-yellow"
              >
                ×{t}
              </span>
            ))}
          </p>
          <p className="mt-3 font-sans text-[11px] font-bold text-[#c9c4ba]">
            {questions} questions · spaced repetition brings back anything slipping.
          </p>
        </PopCard>

        <PopLink href={href} tone="yellow" size="lg" full className="mt-auto">
          CLOCK ON ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
