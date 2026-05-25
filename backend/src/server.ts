import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { authRouter } from "./routes/auth.js";
import { publicRouter } from "./routes/public.js";
import { adminRouter } from "./routes/admin.js";
import { driverRouter } from "./routes/driver.js";
import { customerRouter } from "./routes/customer.js";
import { notificationsRouter } from "./routes/notifications.js";
import { prisma } from "./lib/prisma.js";
import { bootstrapAuthOnStartup } from "./lib/bootstrapAuth.js";
import { apiResponseMiddleware } from "./middleware/apiResponse.js";

const app = express();
const port = Number(process.env.PORT || 4002);
const host = process.env.HOST || "0.0.0.0";

const corsOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Dev: cho phép mở web từ điện thoại qua IP LAN (5173) gọi API (4002). */
function corsOriginAllowed(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) return callback(null, true);
  if (corsOrigins.includes(origin)) return callback(null, true);
  // Production: cho phép www và không-www cùng gốc (tránh login OK local, lỗi VPS vì thiếu FRONTEND_URL)
  if (process.env.NODE_ENV === "production" && corsOrigins.length) {
    try {
      const reqHost = new URL(origin).host.replace(/^www\./, "");
      const allowed = corsOrigins.some((o) => {
        try {
          return new URL(o).host.replace(/^www\./, "") === reqHost;
        } catch {
          return false;
        }
      });
      if (allowed) return callback(null, true);
    } catch {
      /* ignore */
    }
  }
  if (process.env.NODE_ENV !== "production") {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return callback(null, true);
    if (/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) return callback(null, true);
    if (/^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) return callback(null, true);
  }
  callback(new Error(`CORS: origin không được phép — ${origin}`));
}

app.use(cors({ origin: corsOriginAllowed, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || "../uploads");
app.use("/uploads", express.static(uploadRoot));

app.get("/", (_req, res) => res.json({ ok: true, app: "dat-xe-ve-que-api", message: "Backend API đang chạy. Website mở ở http://localhost:5173" }));
app.get("/health", (_req, res) => res.json({ ok: true, app: "dat-xe-ve-que-api" }));
app.get("/api/health", async (_req, res) => {
  try {
    const adminCount = await prisma.user.count({ where: { phone: "0900000000", status: "ACTIVE" } });
    res.json({
      success: true,
      data: { ok: true, app: "dat-xe-ve-que-api", adminReady: adminCount > 0 },
    });
  } catch {
    res.status(503).json({ success: false, message: "Không kết nối được database" });
  }
});
app.use("/api", apiResponseMiddleware);
app.use("/api/auth", authRouter);
app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);
app.use("/api/driver", driverRouter);
app.use("/api/customer", customerRouter);
app.use("/api/notifications", notificationsRouter);

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /driver\nDisallow: /api\nSitemap: ${process.env.PUBLIC_SITE_URL || "http://localhost:5173"}/sitemap.xml\n`);
});

app.get("/sitemap.xml", async (_req, res) => {
  const base = process.env.PUBLIC_SITE_URL || "http://localhost:5173";
  const routes = await prisma.route.findMany();
  const posts = await prisma.post.findMany({ where: { status: "PUBLISHED" } });
  const urls = ["", "dat-xe", "gui-hang", "di-cho-que", "thue-xe-hop-dong", "xe-dam-cuoi", "xe-tham-quan", "xe-di-benh-vien", "xe-san-bay", "kinh-nghiem", "tra-cuu-don", "lien-he", ...routes.map((r) => r.slug), ...posts.map((p) => `kinh-nghiem/${p.slug}`)];
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${base}/${u}</loc></url>`).join("")}</urlset>`);
});

app.listen(port, host, () => {
  console.log(`Đặt Xe Về Quê API đang chạy tại http://localhost:${port} (LAN: port ${port}, host ${host})`);
  void bootstrapAuthOnStartup();
});
