import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { prisma } from "../util/prisma";

export const tagsRouter = Router();
const tagSchema = z.object({
  name: z.string().min(1).max(30),
  color: z.string().min(4).max(20).default("#22c55e"),
});

tagsRouter.get("/tags", requireAuth, async (req: AuthRequest, res) => {
  const tags = await prisma.tag.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { name: "asc" },
  });
  res.json({ tags });
});

tagsRouter.post("/tags", requireAuth, async (req: AuthRequest, res) => {
  const body = tagSchema.parse(req.body);
  const tag = await prisma.tag.upsert({
    where: {
      userId_name: {
        userId: req.auth!.userId,
        name: body.name,
      },
    },
    update: { color: body.color },
    create: {
      userId: req.auth!.userId,
      name: body.name,
      color: body.color,
    },
  });
  res.status(201).json({ tag });
});

