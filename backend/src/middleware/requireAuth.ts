import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../util/config";
import { prisma } from "../util/prisma";

export type AuthRequest = Request & {
  auth?: {
    userId: string;
    sessionId: string;
  };
};

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.tradefx_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      sessionId: string;
    };

    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session || session.revoked || session.userId !== decoded.userId) {
      return res.status(401).json({ error: "Session invalid" });
    }

    if (session.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ error: "Session expired" });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    });

    req.auth = { userId: decoded.userId, sessionId: decoded.sessionId };
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

