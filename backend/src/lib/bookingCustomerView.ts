import { toWallClockIso } from "./datetime.js";

/** Dữ liệu đơn cho khách (tra cứu / tài khoản) — không lộ thêm PII ngoài SĐT đã biết */
export function maskPhone(phone?: string | null) {  const p = String(phone || "").replace(/\D/g, "");
  if (p.length < 7) return phone || "";
  return `${p.slice(0, 3)}***${p.slice(-3)}`;
}

export function serializeBookingForCustomer(booking: any) {
  const tripLink = booking.tripBookings?.[0]?.trip;
  const driver = tripLink?.driver;
  const vehicle = tripLink?.vehicle;

  return {
    id: booking.id,
    code: booking.code,
    type: booking.type,
    hasAccompanyingCargo: Boolean(booking.hasAccompanyingCargo),
    status: booking.status,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    cargoReceiverName: booking.cargoReceiverName ?? null,
    cargoReceiverPhone: booking.cargoReceiverPhone ?? null,
    route: booking.route ? { id: booking.route.id, name: booking.route.name, slug: booking.route.slug } : null,
    direction: booking.direction,
    scheduledAt: booking.scheduledAt,
    scheduledAtLocal: booking.scheduledAt ? toWallClockIso(new Date(booking.scheduledAt)) : null,
    pickupAddress: booking.pickupAddress,
    dropoffAddress: booking.dropoffAddress,
    parcelDropoffAddress: booking.parcelDropoffAddress ?? null,
    passengerCount: booking.passengerCount,
    cargoDescription: booking.cargoDescription,
    note: booking.note,
    estimatedTotal: booking.estimatedTotal,
    finalTotal: booking.finalTotal,
    canRequestChange: ["NEW", "CONTACTED", "QUOTED", "WAITING_DEPOSIT", "DEPOSITED", "WAITING_DISPATCH"].includes(
      booking.status
    ),
    trip: driver
      ? {
          code: tripLink?.code,
          departureAt: tripLink?.departureAt,
          driver: {
            name: driver.name,
            phone: driver.phone,
            phoneMasked: maskPhone(driver.phone),
          },
          vehicle: vehicle
            ? {
                model: vehicle.vehicleType,
                plate: vehicle.licensePlate,
              }
            : null,
        }
      : null,
  };
}

export const bookingCustomerInclude = {
  route: true,
  tripBookings: {
    take: 1,
    orderBy: { id: "desc" as const },
    include: {
      trip: {
        include: {
          driver: true,
          vehicle: true,
        },
      },
    },
  },
};
