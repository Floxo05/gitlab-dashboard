import { cookies } from "next/headers";
import { config } from "./config";
import { seal, unseal } from "./crypto";
import { PAT_COOKIE } from "./constants";

export async function setPatCookie(pat: string) {
  const sealed = await seal(pat);
  const cookieStore = await cookies();
  cookieStore.set(PAT_COOKIE, sealed, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearPatCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PAT_COOKIE, "", {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getPatFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get(PAT_COOKIE)?.value;
  if (!sealed) return null;
  try {
    const pat = await unseal(sealed);
    return pat || null;
  } catch {
    return null;
  }
}

export async function requirePat(): Promise<string> {
  const pat = await getPatFromCookies();
  if (!pat) throw new Error("No PAT in session");
  return pat;
}
