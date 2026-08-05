import { Brick, Coin, cx } from "@/components/ui/pop";
import { hairHex, skinHex } from "@/lib/game/character";
import { levelLabel } from "@/lib/game/city-level";
import type { StudentRow } from "@/lib/supabase/types";

/**
 * The tradie avatar. Character art is still a labelled placeholder in the
 * design doc, so this renders a deterministic stand-in built from the chosen
 * skin/hair — enough to read as "yours" until the illustrated models land.
 */
export function TradieAvatar({
  student,
  size = 40,
  className,
}: {
  student: Pick<StudentRow, "look_model" | "look_skin" | "look_hair" | "display_name">;
  size?: number;
  className?: string;
}) {
  const skin = skinHex(student.look_skin);
  const hair = hairHex(student.look_hair);

  return (
    <span
      role="img"
      aria-label={`${student.display_name}'s tradie`}
      className={cx("relative inline-block shrink-0 overflow-hidden rounded-[11px] border-[2.5px] border-ink", className)}
      style={{ width: size, height: size, background: skin }}
    >
      {/* hair */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0"
        style={{ height: size * 0.3, background: hair }}
      />
      {/* hard hat brim, so every model reads as a tradie at a glance */}
      <span
        aria-hidden
        className="absolute inset-x-0"
        style={{ top: size * 0.26, height: size * 0.1, background: "#ffd400" }}
      />
      {/* hi-vis collar */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0"
        style={{ height: size * 0.26, background: "#ffd400", borderTop: "2px solid #111" }}
      />
    </span>
  );
}

/** Top HUD from B1: who you are, plus coins and materials. */
export function Hud({
  student,
  materials,
}: {
  student: StudentRow;
  materials: number;
}) {
  return (
    <header className="flex items-start justify-between gap-2 px-4 pt-4">
      <div className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-white py-1 pr-3 pl-1 shadow-pop-sm">
        <TradieAvatar student={student} size={32} />
        <span className="leading-tight">
          <span className="block font-display text-[13px] text-ink">{student.display_name}</span>
          <span className="block font-sans text-[9px] font-black text-red uppercase">
            {levelLabel(student.city_xp)}
          </span>
        </span>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <p className="flex items-center gap-1.5 rounded-xl border-[3px] border-ink bg-white py-0.5 pr-3 pl-1">
          <Coin />
          <span className="font-display text-[11px] text-ink" aria-hidden>
            {student.coins.toLocaleString()}
          </span>
          <span className="sr-only">{student.coins.toLocaleString()} coins</span>
        </p>
        <p className="flex items-center gap-1.5 rounded-xl border-[3px] border-ink bg-white py-0.5 pr-3 pl-1">
          <Brick />
          <span className="font-display text-[11px] text-ink" aria-hidden>
            {materials}
          </span>
          <span className="sr-only">{materials} loads of materials banked</span>
        </p>
      </div>
    </header>
  );
}
