import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export type AuthUser = { id: number; role: string; phone: string; name: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.dxvq_token || req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập" });

    const decoded = verifyToken<AuthUser>(token);
    if (!decoded?.id) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.status !== "ACTIVE") {
      res.clearCookie("dxvq_token");
      return res.status(401).json({ message: "Tài khoản không còn hoạt động" });
    }

    req.user = { id: user.id, role: user.role, phone: user.phone, name: user.name };
    next();
  } catch (error) {
    console.error("requireAuth error:", error);
    return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }
}

export function requireRoles(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Không có quyền truy cập" });
    next();
  };
}
