// Centralized config loading and validation for server-side usage
import { z } from "zod";

const EnvSchema = z.object({
  GITLAB_BASE_URL: z
    .string()
    .url()
    .transform((s) => s.replace(/\/$/, "")),
  ALLOWED_GITLAB_HOSTS: z.string().optional().default(""),
  ENCRYPTION_SECRET: z.string().min(16, "ENCRYPTION_SECRET must be set"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = EnvSchema.safeParse({
  GITLAB_BASE_URL: process.env.GITLAB_BASE_URL,
  ALLOWED_GITLAB_HOSTS: process.env.ALLOWED_GITLAB_HOSTS,
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  // Fail fast in development to surface config issues early
  const message = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const config = {
  gitlabBaseUrl: parsed.data.GITLAB_BASE_URL,
  allowedGitlabHosts: parsed.data.ALLOWED_GITLAB_HOSTS
    ? parsed.data.ALLOWED_GITLAB_HOSTS.split(",").map((s) => s.trim()).filter(Boolean)
    : [],
  encryptionSecret: parsed.data.ENCRYPTION_SECRET,
  isProd: parsed.data.NODE_ENV === "production",
};

export function assertGitLabHostAllowed(url: string) {
  if (config.allowedGitlabHosts.length === 0) return; // no explicit whitelist
  try {
    const u = new URL(url);
    if (!config.allowedGitlabHosts.includes(u.host)) {
      throw new Error(`GitLab host not allowed: ${u.host}`);
    }
  } catch (e) {
    throw new Error(`Invalid GitLab URL: ${url}`);
  }
}
