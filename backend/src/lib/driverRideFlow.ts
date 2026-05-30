/** Luồng trạng thái từng vé khách — tài xế bấm tuần tự, không nhảy bước */

const RIDE_INCIDENT = new Set([
  "CUSTOMER_CANCELLED",
  "UNREACHABLE",
  "NO_SHOW",
  "WAITING_ADMIN_REVIEW",
  "WAITING_REDISPATCH",
  "CANCELLED_BY_ADMIN",
]);

const RIDE_NEXT: Record<string, string> = {
  "": "PICKING_UP",
  WAITING_PICKUP: "PICKING_UP",
  PICKING_UP: "PICKED_UP",
  PICKED_UP: "DROPPING_OFF",
  DROPPING_OFF: "DROPPED_OFF",
};

const CARGO_INCIDENT = new Set([
  "FAILED_PICKUP",
  "FAILED_DELIVERY",
  "PARCEL_CANCELLED",
  "WAITING_ADMIN_REVIEW",
]);

const CARGO_NEXT: Record<string, string> = {
  "": "PICKING_UP",
  WAITING_PICKUP: "PICKING_UP",
  PICKING_UP: "PICKED_UP",
  PICKED_UP: "DELIVERING",
  DELIVERING: "DELIVERED",
};

function norm(current?: string | null) {
  return current?.trim() || "";
}

export function assertValidRideStatusTransition(current: string | null | undefined, next: string) {
  const to = String(next || "").trim();
  if (!to) throw Object.assign(new Error("Thiếu trạng thái"), { statusCode: 400 });
  if (RIDE_INCIDENT.has(to)) return;

  const from = norm(current);
  if (from === to) return;
  if (from === "DROPPED_OFF") {
    throw Object.assign(new Error("Khách đã trả — không đổi trạng thái đón/trả nữa"), { statusCode: 400 });
  }

  const expected = RIDE_NEXT[from] ?? null;
  if (expected !== to) {
    const labels: Record<string, string> = {
      "": "Chờ đón",
      WAITING_PICKUP: "Chờ đón",
      PICKING_UP: "Bắt đầu đón",
      PICKED_UP: "Đã đón",
      DROPPING_OFF: "Đang trả khách",
      DROPPED_OFF: "Đã trả khách",
    };
    const hint = expected ? ` Bước tiếp theo: ${labels[expected] || expected}.` : "";
    throw Object.assign(
      new Error(`Không thể chuyển từ «${labels[from] || from || "Chờ đón"}» sang «${labels[to] || to}».${hint}`),
      { statusCode: 400 }
    );
  }
}

export function assertValidCargoStatusTransition(current: string | null | undefined, next: string) {
  const to = String(next || "").trim();
  if (!to) throw Object.assign(new Error("Thiếu trạng thái"), { statusCode: 400 });
  if (CARGO_INCIDENT.has(to)) return;

  const from = norm(current);
  if (from === to) return;
  if (from === "DELIVERED") {
    throw Object.assign(new Error("Hàng đã giao — không đổi trạng thái nữa"), { statusCode: 400 });
  }

  const expected = CARGO_NEXT[from] ?? null;
  if (expected !== to) {
    throw Object.assign(new Error(`Không đúng thứ tự trạng thái gửi hàng (${from || "chờ"} → ${to})`), { statusCode: 400 });
  }
}
