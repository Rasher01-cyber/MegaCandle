import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const normalizeOptionalSecret = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || /^replace_me/i.test(trimmed)) return "";
  return trimmed;
};

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  /** OAuth Web Client ID — optional so the API can run for email-only dev; Google routes validate when used. */
  GOOGLE_CLIENT_ID: z.preprocess(normalizeOptionalSecret, z.string()),
  GOOGLE_CLIENT_SECRET: z.preprocess(normalizeOptionalSecret, z.string()),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().default(2592000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  UPLOAD_DIR: z.string().default("./uploads"),
});

export const config = EnvSchema.parse(process.env);

