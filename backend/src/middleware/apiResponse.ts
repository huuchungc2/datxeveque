import type { Response } from "express";

export function ok(res: Response, data: unknown, message = "") {
  return res.json({ success: true, data, message });
}

export function fail(res: Response, status: number, message: string, errors: unknown[] = []) {
  return res.status(status).json({ success: false, message, errors });
}

/** Middleware: bọc response JSON theo contract spec (tương thích frontend qua interceptor). */
export function apiResponseMiddleware(_req: unknown, res: Response, next: () => void) {
  const originalJson = res.json.bind(res);
  res.json = function wrap(body: unknown) {
    if (body && typeof body === "object" && "success" in (body as object)) {
      return originalJson(body);
    }
    const code = res.statusCode || 200;
    if (code >= 400) {
      const b = (body || {}) as { message?: string; errors?: unknown[] };
      return originalJson({ success: false, message: b.message || "Có lỗi xảy ra", errors: b.errors || [] });
    }
    const b = (body || {}) as { message?: string };
    return originalJson({ success: true, data: body ?? null, message: b.message || "" });
  };
  next();
}
