import type { NextFunction, Request, Response } from "express";
import { prisma } from "../util/prisma";
import { parseApiToken, verifyApiToken } from "../util/mt5Tokens";

export type MtAuthRequest = Request & {
  mtAuth?: {
    accountId: string;
    userId: string;
  };
};

export async function requireMtAuth(req: MtAuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bridge token" });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Missing bridge token" });
  }

  const parsed = parseApiToken(token);
  if (!parsed) {
    return res.status(401).json({ error: "Invalid bridge token format" });
  }

  const account = await prisma.mtAccount.findFirst({
    where: { id: parsed.accountId, revoked: false, connected: true, apiTokenHash: { not: null } },
    select: { id: true, userId: true, apiTokenHash: true },
  });

  if (!account?.apiTokenHash) {
    return res.status(401).json({ error: "Invalid bridge token" });
  }

  const ok = await verifyApiToken(token, account.apiTokenHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid bridge token" });
  }

  req.mtAuth = { accountId: account.id, userId: account.userId };
  return next();
}
