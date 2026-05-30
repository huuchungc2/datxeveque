import { SettlementStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

export const SETTLEMENT_DIRECTIONS = ["DRIVER_OWES_ADMIN", "ADMIN_OWES_DRIVER"] as const;
export type SettlementDirection = (typeof SETTLEMENT_DIRECTIONS)[number];

export function buildPaidByTrip(payments: { tripId: number | null; amount: unknown; direction: string }[]) {
  const paidByTrip = new Map<number, { driverPaid: number; adminPaid: number }>();
  for (const p of payments) {
    if (!p.tripId) continue;
    const cur = paidByTrip.get(p.tripId) || { driverPaid: 0, adminPaid: 0 };
    const amt = Number(p.amount);
    if (p.direction === "DRIVER_OWES_ADMIN") cur.driverPaid += amt;
    if (p.direction === "ADMIN_OWES_DRIVER") cur.adminPaid += amt;
    paidByTrip.set(p.tripId, cur);
  }
  return paidByTrip;
}

export function enrichTripDebtRow(
  t: { id: number; driverDebtAmount: unknown; adminOwesDriverAmount?: unknown },
  paidByTrip: Map<number, { driverPaid: number; adminPaid: number }>
) {
  const paid = paidByTrip.get(t.id) || { driverPaid: 0, adminPaid: 0 };
  const driverDebt = Number(t.driverDebtAmount);
  const adminOwes = Number(t.adminOwesDriverAmount || 0);
  return {
    driverPaidAdmin: paid.driverPaid,
    adminPaidDriver: paid.adminPaid,
    driverDebtRemaining: Math.max(0, driverDebt - paid.driverPaid),
    adminOwesRemaining: Math.max(0, adminOwes - paid.adminPaid),
  };
}

export async function loadPaymentsForTrips(tripIds: number[]) {
  if (!tripIds.length) return [];
  return prisma.driverSettlementPayment.findMany({
    where: { tripId: { in: tripIds } },
    orderBy: { createdAt: "desc" },
  });
}

export function computeSettlementStatus(
  trip: { driverDebtAmount: unknown; adminOwesDriverAmount?: unknown },
  driverPaid: number,
  adminPaid: number
): SettlementStatus {
  const driverRem = Math.max(0, Number(trip.driverDebtAmount) - driverPaid);
  const adminRem = Math.max(0, Number(trip.adminOwesDriverAmount || 0) - adminPaid);
  if (driverRem <= 0 && adminRem <= 0) return SettlementStatus.PAID;
  if (driverPaid > 0 || adminPaid > 0) return SettlementStatus.PARTIAL;
  return SettlementStatus.PENDING;
}

export async function validateSettlementPayment(input: {
  tripId?: number | null;
  driverId: number;
  amount: number;
  direction: string;
}) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error("Số tiền phải lớn hơn 0"), { statusCode: 400 });
  }
  const direction = String(input.direction || "").trim();
  if (!SETTLEMENT_DIRECTIONS.includes(direction as SettlementDirection)) {
    throw Object.assign(new Error("Chiều thanh toán không hợp lệ"), { statusCode: 400 });
  }

  const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });

  if (!input.tripId) return { amount, direction: direction as SettlementDirection };

  const trip = await prisma.trip.findUnique({ where: { id: input.tripId } });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
  if (!trip.driverId) {
    throw Object.assign(new Error("Chuyến chưa gán tài xế — không đối soát được"), { statusCode: 400 });
  }
  if (Number(trip.driverId) !== Number(input.driverId)) {
    throw Object.assign(new Error("Tài xế không khớp với chuyến đã chọn"), { statusCode: 400 });
  }

  const pays = await loadPaymentsForTrips([trip.id]);
  const paidByTrip = buildPaidByTrip(pays);
  const debt = enrichTripDebtRow(trip, paidByTrip);

  const remaining =
    direction === "DRIVER_OWES_ADMIN" ? debt.driverDebtRemaining : debt.adminOwesRemaining;

  if (remaining <= 0) {
    throw Object.assign(
      new Error(
        direction === "DRIVER_OWES_ADMIN"
          ? "Chuyến không còn công nợ tài xế nộp văn phòng"
          : "Văn phòng không còn nợ tài xế trên chuyến này"
      ),
      { statusCode: 400 }
    );
  }
  if (amount > remaining + 0.01) {
    throw Object.assign(
      new Error(`Số tiền vượt còn lại (${Math.round(remaining).toLocaleString("vi-VN")}đ)`),
      { statusCode: 400 }
    );
  }

  return {
    amount,
    direction: direction as SettlementDirection,
    trip: {
      driverDebtAmount: trip.driverDebtAmount,
      adminOwesDriverAmount: trip.adminOwesDriverAmount,
    },
  };
}
