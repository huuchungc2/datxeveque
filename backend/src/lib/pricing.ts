import { BookingType } from "@prisma/client";
import { prisma } from "./prisma.js";

type PriceInput = {
  type: BookingType;
  routeId?: number | null;
  passengerCount?: number;
  weightKg?: number;
  vehicleType?: string | null;
};

export async function calculatePrice(input: PriceInput) {
  const routeId = input.routeId ? Number(input.routeId) : null;
  const where: any = {
    serviceType: input.type,
    active: true,
  };

  if (routeId) {
    where.OR = [{ routeId }, { routeId: null }];
  } else {
    where.routeId = null;
  }

  if (input.vehicleType) {
    where.OR = (where.OR || [{ routeId: null }]).map((item: any) => ({
      ...item,
      OR: [{ vehicleType: input.vehicleType }, { vehicleType: null }],
    }));
  }

  const rules = await prisma.priceRule.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  const rule = rules.sort((a, b) => {
    const aRouteScore = a.routeId === routeId ? 2 : a.routeId === null ? 1 : 0;
    const bRouteScore = b.routeId === routeId ? 2 : b.routeId === null ? 1 : 0;
    const aVehicleScore = input.vehicleType && a.vehicleType === input.vehicleType ? 2 : a.vehicleType === null ? 1 : 0;
    const bVehicleScore = input.vehicleType && b.vehicleType === input.vehicleType ? 2 : b.vehicleType === null ? 1 : 0;
    return bRouteScore - aRouteScore || bVehicleScore - aVehicleScore || b.id - a.id;
  })[0];

  if (!rule) {
    return { estimatedTotal: 0, commissionAmount: 0, note: "Chưa có bảng giá, nhân viên sẽ báo giá." };
  }

  const passengerCount = Math.max(1, Number(input.passengerCount || 1));
  let total = Number(rule.basePrice || 0);

  if (rule.pricingType === "PER_PERSON") total = Number(rule.pricePerPerson || 0) * passengerCount;
  else if (rule.pricingType === "PER_KG") total = Number(rule.basePrice || 0) + Number(rule.pricePerKg || 0) * Number(input.weightKg || 0);
  else if (rule.pricingType === "PER_TRIP") total = Number(rule.basePrice || 0);

  let commission = 0;
  if (rule.commissionType === "PERCENT") commission = Math.round((total * Number(rule.commissionValue || 0)) / 100);
  else commission = Number(rule.commissionValue || 0) * (rule.pricingType === "PER_PERSON" ? passengerCount : 1);

  const driverAmount = Math.max(0, total - commission);
  return {
    estimatedTotal: total,
    commissionAmount: commission,
    driverAmount,
    note: "Giá tạm tính, nhân viên sẽ xác nhận lại.",
  };
}
