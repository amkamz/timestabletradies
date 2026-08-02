import Link from "next/link";

import { cx } from "@/components/ui/pop";

/** Switches which student the dashboard tab is showing. */
export function StudentSwitcher({
  roster,
  selectedId,
  basePath,
}: {
  roster: Array<{ id: string; display_name: string }>;
  selectedId: string;
  basePath: string;
}) {
  if (roster.length < 2) return null;

  return (
    <nav aria-label="Choose a student" className="flex flex-wrap gap-1.5">
      {roster.map((student) => (
        <Link
          key={student.id}
          href={`${basePath}?student=${student.id}`}
          aria-current={student.id === selectedId ? "page" : undefined}
          className={cx(
            "rounded-lg border-[2.5px] border-ink px-2.5 py-1 font-sans text-xs font-black",
            student.id === selectedId ? "bg-teal text-white" : "bg-white text-ink",
          )}
        >
          {student.display_name}
        </Link>
      ))}
    </nav>
  );
}
