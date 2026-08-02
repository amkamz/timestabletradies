import Link from "next/link";

import { Eyebrow } from "@/components/ui/pop";
import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";

import { SignInForm } from "./sign-in-form";

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const { next } = await props.searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/play";

  return (
    <AppFrame>
      <Screen tone="paper">
        <ScreenBody className="px-6 pt-10">
          <Eyebrow>Welcome back</Eyebrow>
          <h1 className="mt-1.5 font-display text-2xl leading-tight text-ink">Clock back on</h1>

          <div className="mt-5 flex flex-1 flex-col">
            <SignInForm next={target} />
          </div>

          <p className="pt-4 text-center font-sans text-xs font-bold text-mud">
            No account yet?{" "}
            <Link href="/gate?next=/onboarding/parent" className="text-red underline">
              Start a new site
            </Link>
          </p>
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
