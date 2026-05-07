import crypto from "crypto";
import jwt from "jsonwebtoken";
import { config } from "./config";

export function hashDeviceFingerprint(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function signSessionToken(payload: { userId: string; sessionId: string }) {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN_SECONDS,
  });
}

