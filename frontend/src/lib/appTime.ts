import { api } from "./api";
import { buildAppTimeFallback, setServerAppTime, type AppTimePayload } from "./datetime";

let cached: AppTimePayload | null = null;
let loading: Promise<AppTimePayload> | null = null;

/** Đồng bộ giờ hệ thống từ server (múi giờ VN). */
export async function ensureAppTime(): Promise<AppTimePayload> {
  if (cached) return cached;
  if (!loading) {
    loading = api
      .get<AppTimePayload>("/public/app-time")
      .then((res) => {
        cached = res.data;
        setServerAppTime(cached);
        return cached;
      })
      .catch(() => {
        cached = buildAppTimeFallback();
        setServerAppTime(cached);
        return cached;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

export function getAppTime(): AppTimePayload | null {
  return cached;
}

export function todayAppDate(): string {
  return cached?.today ?? buildAppTimeFallback().today;
}
