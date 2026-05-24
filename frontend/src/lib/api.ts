import axios from "axios";

function normalizeApiBase(value?: string) {
  const raw = (value || "http://localhost:4002").trim().replace(/\/+$/, "");
  // Cho phép .env ghi cả http://localhost:4002 hoặc http://localhost:4002/api đều chạy được.
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && typeof body === "object" && "success" in body) {
      if (body.success === false) {
        const err: any = new Error(body.message || "Có lỗi xảy ra");
        err.response = res;
        return Promise.reject(err);
      }
      if ("data" in body) res.data = body.data;
    }
    return res;
  },
  (err) => {
    const msg = err.response?.data?.message;
    if (msg && err.response?.data && typeof err.response.data === "object") {
      err.response.data = { message: msg };
    }
    return Promise.reject(err);
  }
);

export function unwrapList<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.routes)) return payload.routes;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
}

export const formatMoney = (value?: number | string | null) =>
  new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";
