import crypto from "crypto";
import bcrypt from "bcryptjs";

export function generatePairingCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function generateApiToken(accountId: string): string {
  const secret = crypto.randomBytes(24).toString("hex");
  return `${accountId}.${secret}`;
}

export function parseApiToken(token: string): { accountId: string; secret: string } | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  return { accountId: token.slice(0, dot), secret: token.slice(dot + 1) };
}

export async function hashApiToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function verifyApiToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}
