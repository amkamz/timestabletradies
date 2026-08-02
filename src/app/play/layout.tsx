import { redirect } from "next/navigation";

import { AppFrame } from "@/components/shell/screen";
import { A11yProvider } from "@/components/a11y/a11y-provider";
import { requireActiveStudent } from "@/lib/data/session";
import { getSettings } from "@/lib/data/student";

/**
 * The student-facing app.
 *
 * Nothing under /play may ever render pricing, billing, purchase prompts,
 * ads or upsells (spec §2) — that all lives under /dashboard.
 */
export default async function PlayLayout({ children }: LayoutProps<"/play">) {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const settings = await getSettings(student.id);

  return (
    <A11yProvider settings={settings}>
      <AppFrame>{children}</AppFrame>
    </A11yProvider>
  );
}
