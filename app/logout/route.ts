import { NextResponse } from "next/server";
import { clearPatCookie } from "@/lib/auth";

export async function GET(request: Request) {
  await clearPatCookie();
  const url = new URL("/login", new URL(request.url).origin);
  return NextResponse.redirect(url);
}
