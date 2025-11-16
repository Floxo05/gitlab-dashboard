"use server";

import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { setPatCookie } from "@/lib/auth";

async function validatePat(pat: string): Promise<{ ok: boolean; message?: string }>
{
  try {
    const res = await fetch(`${config.gitlabBaseUrl}/api/v4/user`, {
      headers: {
        "Private-Token": pat,
        Accept: "application/json",
      },
      // Avoid caching sensitive responses
      cache: "no-store",
      // A short timeout via AbortController could be added later
    });
    if (res.ok) return { ok: true };
    if (res.status === 401 || res.status === 403) return { ok: false, message: "Ungültiges Token oder unzureichende Berechtigung" };
    return { ok: false, message: `Login-Validierung fehlgeschlagen (HTTP ${res.status})` };
  } catch (e) {
    return { ok: false, message: "Netzwerkfehler bei der Validierung" };
  }
}

export async function loginWithPat(formData: FormData) {
  const pat = String(formData.get("pat") || "").trim();
  if (!pat) {
    redirect(`/login?error=${encodeURIComponent("Bitte gib ein Token ein")}`);
  }

  const result = await validatePat(pat);
  if (!result.ok) {
    const msg = result.message || "Ungültiges Token";
    redirect(`/login?error=${encodeURIComponent(msg)}`);
  }

  await setPatCookie(pat);
  redirect("/dashboard");
}
