// Crypto utilities to seal/unseal sensitive data (PAT) into cookies
// Uses Web Crypto (available in Node 24) with HKDF-SHA256 -> AES-GCM
// Token format: v1.<base64url(salt)>.<base64url(iv)>.<base64url(ciphertext)>

import { config } from "./config";

const te = new TextEncoder();
const td = new TextDecoder();

function toBase64(bytes: ArrayBuffer): string {
  // Use Buffer in Node, btoa in Edge runtimes
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  // @ts-ignore
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  // @ts-ignore
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64u(bytes: ArrayBuffer): string {
  const b64 = toBase64(bytes);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64uToBytes(b64uStr: string): Uint8Array {
  const b64 = b64uStr.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padLen);
  return fromBase64(padded);
}

async function deriveKey(salt: Uint8Array) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(config.encryptionSecret),
    "HKDF",
    false,
    ["deriveKey"]
  );
  const info = te.encode("gitlab-dashboard:pat-cookie");
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function seal(plaintext: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(plaintext));
  return `v1.${b64u(salt)}.${b64u(iv)}.${b64u(ciphertext)}`;
}

export async function unseal(token: string): Promise<string> {
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Invalid token format");
  const salt = b64uToBytes(parts[1]);
  const iv = b64uToBytes(parts[2]);
  const ct = b64uToBytes(parts[3]);
  const key = await deriveKey(salt);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return td.decode(pt);
}
