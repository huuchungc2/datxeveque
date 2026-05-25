import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const unreadOnly = req.query.unreadOnly === "1" || req.query.unreadOnly === "true";

  const items = await prisma.notification.findMany({
    where: {
      userId: req.user!.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  res.json(items);
});

notificationsRouter.get("/unread-count", async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, readAt: null },
  });
  res.json({ count });
});

notificationsRouter.patch("/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});

notificationsRouter.patch("/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  const row = await prisma.notification.findFirst({
    where: { id, userId: req.user!.id },
  });
  if (!row) return res.status(404).json({ message: "Không tìm thấy thông báo" });
  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
  res.json(updated);
});
