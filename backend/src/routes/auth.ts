import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { config } from "../util/config";
import { prisma } from "../util/prisma";
import { hashDeviceFingerprint, signSessionToken } from "../util/auth";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { ensureBridgePairingAccount, revokeHostedAccounts } from "../util/megacandleTrading";

export const authRouter = Router();

let googleOAuthSingleton: OAuth2Client | null | undefined;

function googleOAuthClient(): OAuth2Client | null {
  if (!config.GOOGLE_CLIENT_ID) return null;
  if (googleOAuthSingleton === undefined) {
    googleOAuthSingleton = new OAuth2Client(config.GOOGLE_CLIENT_ID);
  }
  return googleOAuthSingleton;
}

const cookieMaxAgeMs = config.JWT_EXPIRES_IN_SECONDS * 1000;
const BCRYPT_ROUNDS = 11;

const googleBodySchema = z.object({
  credential: z.string().min(1),
  deviceFingerprint: z.string().min(1),
  deviceLabel: z.string().max(120).optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
  deviceFingerprint: z.string().min(1),
  deviceLabel: z.string().max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  deviceFingerprint: z.string().min(1),
  deviceLabel: z.string().max(120).optional(),
});

async function issueAuthSession(
  req: Request,
  res: Response,
  userId: string,
  deviceFingerprint: string,
  deviceLabel?: string | null,
) {
  const session = await prisma.session.create({
    data: {
      userId,
      deviceFingerprint: hashDeviceFingerprint(deviceFingerprint),
      deviceLabel: deviceLabel ?? null,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? null,
      expiresAt: new Date(Date.now() + cookieMaxAgeMs),
      lastActiveAt: new Date(),
    },
  });

  const token = signSessionToken({ userId, sessionId: session.id });

  res.cookie("tradefx_token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: cookieMaxAgeMs,
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return { user, session };
}

function userResponse(user: NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique>>>, sessionId: string) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    currentSessionId: sessionId,
  };
}

/** Public OAuth Web Client ID for Google Identity Services (safe to expose). */
authRouter.get("/auth/public-config", (_req, res) => {
  const googleClientId = config.GOOGLE_CLIENT_ID;
  return res.json({
    googleClientId,
    googleOAuthConfigured: Boolean(googleClientId),
    apiBaseOk: true,
  });
});

authRouter.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid registration. Use a valid email and password (8+ characters)." });
  }
  const { email, password, name, deviceFingerprint, deviceLabel } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists. Sign in instead." });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const displayName = name?.trim() || emailNorm.split("@")[0] || "Trader";

  const user = await prisma.user.create({
    data: {
      email: emailNorm,
      name: displayName,
      passwordHash,
      googleId: null,
      picture: null,
    },
  });

  const { user: fullUser, session } = await issueAuthSession(req, res, user.id, deviceFingerprint, deviceLabel);
  if (!fullUser) return res.status(500).json({ error: "Could not create session" });

  await revokeHostedAccounts(user.id);
  await ensureBridgePairingAccount(user.id);

  return res.status(201).json({ user: userResponse(fullUser, session.id) });
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password." });
  }
  const { email, password, deviceFingerprint, deviceLabel } = parsed.data;
  const emailNorm = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (!user?.passwordHash) {
    return res.status(401).json({
      error: "Invalid email or password. Try Google sign-in if you registered with Google.",
    });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const { user: fullUser, session } = await issueAuthSession(req, res, user.id, deviceFingerprint, deviceLabel);
  if (!fullUser) return res.status(500).json({ error: "Could not create session" });

  await revokeHostedAccounts(user.id);
  await ensureBridgePairingAccount(user.id);

  return res.json({ user: userResponse(fullUser, session.id) });
});

authRouter.post("/auth/google", async (req, res) => {
  const oauth = googleOAuthClient();
  if (!oauth || !config.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error:
        "Google sign-in is not configured. Set GOOGLE_CLIENT_ID in backend/.env to your OAuth 2.0 Web Client ID and restart the API.",
    });
  }

  const parsed = googleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid auth payload" });
  }
  const body = parsed.data;

  let payload:
    | { sub?: string; email?: string; name?: string | null; picture?: string | null }
    | undefined;
  try {
    const ticket = await oauth.verifyIdToken({
      idToken: body.credential,
      audience: config.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Invalid google token" });
  }
  if (!payload?.sub || !payload.email) {
    return res.status(401).json({ error: "Invalid google token" });
  }

  const emailNorm = payload.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (byEmail) {
      if (byEmail.googleId && byEmail.googleId !== payload.sub) {
        return res.status(409).json({ error: "This email is linked to a different Google account." });
      }
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: payload.sub,
          name: payload.name ?? byEmail.name,
          picture: payload.picture ?? byEmail.picture,
          email: emailNorm,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          googleId: payload.sub,
          email: emailNorm,
          name: payload.name ?? emailNorm,
          picture: payload.picture ?? null,
        },
      });
    }
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: emailNorm,
        name: payload.name ?? user.name,
        picture: payload.picture ?? user.picture,
      },
    });
  }

  const { user: fullUser, session } = await issueAuthSession(req, res, user.id, body.deviceFingerprint, body.deviceLabel);
  if (!fullUser) return res.status(500).json({ error: "Could not create session" });

  await revokeHostedAccounts(user.id);
  await ensureBridgePairingAccount(user.id);

  return res.json({
    user: userResponse(fullUser, session.id),
  });
});

authRouter.post("/auth/logout", requireAuth, async (req: AuthRequest, res) => {
  const sessionId = req.auth!.sessionId;
  await prisma.session.update({
    where: { id: sessionId },
    data: { revoked: true },
  });
  res.clearCookie("tradefx_token");
  return res.json({ ok: true });
});

authRouter.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      currentSessionId: req.auth!.sessionId,
    },
  });
});
