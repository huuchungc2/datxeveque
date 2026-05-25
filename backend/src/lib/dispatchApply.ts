import { BookingStatus, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { generateCode } from "./codes.js";
import { sumBookingRollups } from "./settlement.js";
import { assertDriverAvailableForNewTrip } from "./dispatchDrivers.js";
import { notifyDispatchAssigned, safeNotify } from "./notifications.js";
import { bookingSeatUnits } from "./bookingSeats.js";

export async function assignBookingsToTrip(
  tripId: number,
  bookingIds: number[],
  opts?: { isNewTrip?: boolean }
) {
  const ids = Array.from(new Set(bookingIds.map(Number).filter(Boolean)));
  if (!ids.length) throw Object.assign(new Error("Chưa chọn đơn để gán"), { statusCode: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

    const existing = await tx.tripBooking.findMany({
      where: { tripId, bookingId: { in: ids } },
      select: { bookingId: true },
    });
    const existingIds = new Set(existing.map((x) => x.bookingId));
    const newBookingIds = ids.filter((id) => !existingIds.has(id));

    if (!newBookingIds.length) {
      return {
        added: 0,
        skipped: ids.length,
        message: "Các đơn đã nằm trong chuyến.",
        trip,
        newBookingIds: [] as number[],
      };
    }

    const bookings = await tx.booking.findMany({ where: { id: { in: newBookingIds } } });
    const seats = bookings.reduce((s, b) => s + bookingSeatUnits(b), 0);
    if (seats <= 0) throw Object.assign(new Error("Số ghế không hợp lệ"), { statusCode: 400 });
    if (Number(trip.availableSeats) < seats) throw Object.assign(new Error("Chuyến không đủ ghế trống"), { statusCode: 400 });

    for (const id of newBookingIds) {
      await tx.tripBooking.create({ data: { tripId, bookingId: id } });
    }
    await tx.booking.updateMany({ where: { id: { in: newBookingIds } }, data: { status: BookingStatus.ASSIGNED } });

    const fin = sumBookingRollups(bookings);
    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        bookedSeats: { increment: seats },
        availableSeats: { decrement: seats },
        totalCustomerAmount: { increment: fin.total },
        adminCommission: { increment: fin.commission },
        driverNetAmount: { increment: fin.driverAmount },
        driverDebtAmount: { increment: fin.driverOwesAdmin },
        adminOwesDriverAmount: { increment: fin.adminOwesDriver },
      },
    });

    return {
      added: newBookingIds.length,
      skipped: ids.length - newBookingIds.length,
      message: `Đã gán ${newBookingIds.length} đơn vào chuyến.`,
      trip: updatedTrip,
      newBookingIds,
    };
  });

  if (result.added > 0 && result.newBookingIds?.length) {
    const full = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { route: { select: { name: true } } },
    });
    if (full) {
      await safeNotify(() =>
        notifyDispatchAssigned({
          tripId: full.id,
          tripCode: full.code,
          bookingIds: result.newBookingIds,
          driverId: full.driverId,
          departureAt: full.departureAt,
          routeName: full.route?.name,
          isNewTrip: opts?.isNewTrip,
        })
      );
    }
  }

  return result;
}

async function validateSeatsForAssign(
  bookingIds: number[],
  opts: { availableSeats: number; label: string }
) {
  const bookings = await prisma.booking.findMany({ where: { id: { in: bookingIds } } });
  const seats = bookings.reduce((s, b) => s + bookingSeatUnits(b), 0);
  if (seats <= 0) throw Object.assign(new Error("Số khách/đơn không hợp lệ"), { statusCode: 400 });
  if (Number(opts.availableSeats) < seats) {
    throw Object.assign(
      new Error(`${opts.label} chỉ còn ${opts.availableSeats} ghế, không gán thêm ${seats} khách được`),
      { statusCode: 400 }
    );
  }
  return { bookings, seats };
}

export async function createTripAndAssign(input: {
  routeId: number;
  bookingIds: number[];
  departureAt: string;
  totalSeats: number;
  driverId?: number | null;
  vehicleId?: number | null;
}) {
  const bookingIds = Array.from(new Set(input.bookingIds.map(Number).filter(Boolean)));
  if (!bookingIds.length) throw Object.assign(new Error("Chưa chọn đơn"), { statusCode: 400 });

  const { seats: seatsNeeded } = await validateSeatsForAssign(bookingIds, {
    availableSeats: Number(input.totalSeats || 0),
    label: "Chuyến mới",
  });

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(input.vehicleId) } });
    if (!vehicle) throw Object.assign(new Error("Không tìm thấy xe"), { statusCode: 404 });
    if (Number(vehicle.seats) < seatsNeeded) {
      throw Object.assign(
        new Error(`Xe ${vehicle.vehicleType || ""} chỉ ${vehicle.seats} chỗ, không chở ${seatsNeeded} khách`),
        { statusCode: 400 }
      );
    }
    input.totalSeats = Number(vehicle.seats);
  }

  if (input.driverId) {
    await assertDriverAvailableForNewTrip(Number(input.driverId));
  }

  if (input.driverId && !input.vehicleId) {
    const driver = await prisma.driver.findUnique({
      where: { id: Number(input.driverId) },
      include: { vehicles: true },
    });
    const v = driver?.vehicles?.[0];
    if (v && Number(v.seats) < seatsNeeded) {
      throw Object.assign(new Error(`Tài xế chỉ có xe ${v.seats} chỗ, cần ${seatsNeeded} khách`), { statusCode: 400 });
    }
    if (v) input.totalSeats = Number(v.seats);
  }

  if (Number(input.totalSeats) < seatsNeeded) {
    throw Object.assign(
      new Error(`Chuyến ${input.totalSeats} chỗ không đủ cho ${seatsNeeded} khách — chọn xe lớn hơn hoặc tách đơn`),
      { statusCode: 400 }
    );
  }

  let trip: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      trip = await prisma.trip.create({
        data: {
          code: generateCode("CX"),
          routeId: input.routeId,
          driverId: input.driverId ? Number(input.driverId) : null,
          vehicleId: input.vehicleId ? Number(input.vehicleId) : null,
          departureAt: new Date(input.departureAt),
          totalSeats: Number(input.totalSeats || 0),
          availableSeats: Number(input.totalSeats || 0),
          status: TripStatus.COLLECTING,
        },
      });
      break;
    } catch (err: any) {
      if (String(err?.code) !== "P2002" || attempt === 4) throw err;
    }
  }

  const assign = await assignBookingsToTrip(trip.id, bookingIds, { isNewTrip: true });

  if (input.driverId) {
    await prisma.driver.update({
      where: { id: Number(input.driverId) },
      data: { status: "Đang chạy chuyến" },
    });
  }

  return { ...assign, message: `Đã tạo chuyến ${trip.code} và gán ${assign.added} đơn.` };
}

export async function applyDispatchSuggestion(body: any) {
  const kind = body.kind;
  const bookingIds = Array.isArray(body.bookingIds) ? body.bookingIds : [];

  if (kind === "assign_trip") {
    const tripId = Number(body.tripId);
    if (!tripId) throw Object.assign(new Error("Thiếu chuyến đích"), { statusCode: 400 });
    return assignBookingsToTrip(tripId, bookingIds);
  }

  if (kind === "new_trip") {
    const routeId = Number(body.routeId);
    if (!routeId) throw Object.assign(new Error("Thiếu tuyến"), { statusCode: 400 });
    return createTripAndAssign({
      routeId,
      bookingIds,
      departureAt: body.departureAt || new Date().toISOString(),
      totalSeats: Number(body.totalSeats || 5),
      driverId: body.driverId,
      vehicleId: body.vehicleId,
    });
  }

  throw Object.assign(new Error("Loại gợi ý không hợp lệ"), { statusCode: 400 });
}
