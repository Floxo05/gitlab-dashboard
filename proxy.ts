import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { unseal } from "./lib/crypto";
import { PAT_COOKIE } from "./lib/constants";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard dashboard (and future protected paths via matcher below)
  const sealed = request.cookies.get(PAT_COOKIE)?.value;
  if (!sealed) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "Bitte melde dich an");
    return NextResponse.redirect(url);
  }

  try {
    await unseal(sealed);
    // token format valid; do not call upstream here
    return NextResponse.next();
  } catch {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "Sitzung ungültig oder abgelaufen");
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
  ],
};
