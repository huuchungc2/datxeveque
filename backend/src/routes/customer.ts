import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";

export const customerRouter = Router();
customerRouter.use(requireAuth, requireRoles(["CUSTOMER"]));

customerRouter.get("/bookings", async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({ where: { userId: req.user!.id } });
    if (!customer) return res.json([]);

    const bookings = await prisma.booking.findMany({
      where: { customerId: customer.id },
      include: { route: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json(bookings);
  } catch (error) {
    console.error("GET /customer/bookings error:", error);
    res.status(500).json({ message: "Không tải được danh sách đơn của khách" });
  }
});
