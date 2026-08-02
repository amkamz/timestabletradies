/**
 * Next.js 16 renamed the `middleware` convention to `proxy`, and the exported
 * function must be named `proxy`. Runtime is always nodejs here.
 *
 * Its job: refresh the Supabase auth session on every request so Server
 * Components always see a valid user, and gate the parent-only areas.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes an unauthenticated visitor may reach.
 *
 * `/onboarding/parent` is the sign-up form itself, so it has to be reachable
 * before a session exists. The rest of `/onboarding` stays gated here and
 * guards itself again with `requireParent()`.
 */
const PUBLIC_PREFIXES = [
  "/",
  "/gate",
  "/sign-in",
  "/sign-up",
  "/join",
  "/auth",
  "/onboarding/parent",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser — a missed refresh
  // here logs users out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
