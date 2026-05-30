import { BookingStatus, BookingType, TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { generateCode } from "./codes.js";
import { rollupBookingFinancialsPortion } from "./settlement.js";
import { assertDriverAvailableForNewTrip } from "./dispatchDrivers.js";
import { notifyDispatchAssigned, notifyDriverTripAssigned, safeNotify } from "./notifications.js";
import { bookingRemainingSeatUnits, bookingSeatUnits } from "./bookingSeats.js";
import {
  driverMatchesBooking,
  driverMatchesRun,
  driverMismatchReason,
  inferRunDirectionFromBooking,
  inferTripRunDirection,
  tripMatchesRun,
  tripMismatchReason,
  type RunDirection,
} from "./routeEndpoints.js";
import { driverProfileFromTrip, effectiveTripDispatchSeats } from "./driverAvailability.js";

function inferBookingsRun(bookings: { pickupAddress?: string | null; dropoffAddress?: string | null; direction?: string | null; route?: any }[]): RunDirection {
  const b = bookings[0];
  if (!b) return "SG_TO_PROVINCE";
  return inferRunDirectionFromBooking(b);
}

async function assertBookingsMatchTripRoute(tripId: number, bookingIds: number[]) {
  const [trip, bookings] = await Promise.all([
    prisma.trip.findUnique({ where: { id: tripId }, select: { routeId: true, code: true } }),
    prisma.booking.findMany({ where: { id: { in: bookingIds } }, select: { id: true, routeId: true, code: true } }),
  ]);
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
  for (const b of bookings) {
    if (Number(b.routeId) !== Number(trip.routeId)) {
      throw Object.assign(
        new Error(`Đơn ${b.code} thuộc tuyến khác với chuyến ${trip.code}, không thể gán`),
        { statusCode: 400 }
      );
    }
  }
}

async function assertBookingsMatchTripRun(tripId: number, bookingIds: number[]) {
  const [trip, bookings] = await Promise.all([
    prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
        driver: true,
        tripBookings: { include: { booking: { include: { route: true } } } },
      },
    }),
    prisma.booking.findMany({ where: { id: { in: bookingIds } }, include: { route: true } }),
  ]);
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
  if (!bookings.length) return;

  const run = inferBookingsRun(bookings);
  if (!tripMatchesRun(trip, run)) {
    throw Object.assign(new Error(tripMismatchReason(run)), { statusCode: 400 });
  }
}

async function assertDriverMatchesBookings(driverId: number, bookingIds: number[]) {
  const [driver, bookings] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId }, include: { route: true } }),
    prisma.booking.findMany({ where: { id: { in: bookingIds } }, include: { route: true } }),
  ]);
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });
  if (!bookings.length) return;

  for (const b of bookings) {
    const run = inferRunDirectionFromBooking(b);
    if (!driverMatchesBooking(driver, b.routeId, run)) {
      throw Object.assign(
        new Error(driverMismatchReason(driver, run, b.routeId)),
        { statusCode: 400 }
      );
    }
  }
}

/** Tài xế phải ở đầu tuyến đúng chiều chuyến (SG hoặc tỉnh) — dùng khi gán tài xế / tài xế nhận chuyến */
export async function assertDriverMatchesTrip(driverId: number, tripId: number) {
  const [driver, trip] = await Promise.all([
    prisma.driver.findUnique({ where: { id: driverId }, include: { route: true } }),
    prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
        driver: true,
        tripBookings: { include: { booking: { include: { route: true } } } },
      },
    }),
  ]);
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

  const run = inferTripRunDirection(trip);
  if (!run) return;

  if (!driverMatchesBooking(driver, trip.routeId, run)) {
    throw Object.assign(new Error(driverMismatchReason(driver, run, trip.routeId)), { statusCode: 400 });
  }
}

function parseSeatCounts(body: unknown): Record<number, number> {
  const raw = (body as { seatCounts?: Record<string, number> })?.seatCounts;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const id = Number(k);
    const n = Number(v);
    if (id && Number.isFinite(n) && n > 0) out[id] = Math.floor(n);
  }
  return out;
}

function assertTripAcceptsMoreBookings(trip: { status: string; availableSeats: number; bookedSeats: number }) {
  if (trip.status !== TripStatus.COLLECTING && trip.status !== TripStatus.READY) {
    throw Object.assign(
      new Error("Chuyến không còn ở trạng thái gom khách — không gán thêm đơn"),
      { statusCode: 400 }
    );
  }
  if (Number(trip.availableSeats) <= 0) {
    throw Object.assign(
      new Error("Chuyến đã đủ khách / hết ghế trống — chọn chuyến khác hoặc tài xế rảnh để tạo chuyến mới"),
      { statusCode: 400 }
    );
  }
}

export async function assignBookingsToTrip(
  tripId: number,
  bookingIds: number[],
  opts?: { isNewTrip?: boolean; seatCounts?: Record<number, number> }
) {
  const ids = Array.from(new Set(bookingIds.map(Number).filter(Boolean)));
  if (!ids.length) throw Object.assign(new Error("Chưa chọn đơn để gán"), { statusCode: 400 });

  const tripPreview = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!tripPreview) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
  if (!opts?.isNewTrip) assertTripAcceptsMoreBookings(tripPreview);

  await assertBookingsMatchTripRoute(tripId, ids);
  await assertBookingsMatchTripRun(tripId, ids);

  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
    if (!opts?.isNewTrip) assertTripAcceptsMoreBookings(trip);

    const existing = await tx.tripBooking.findMany({
      where: { tripId, bookingId: { in: ids } },
      select: { bookingId: true },
    });
    const existingIds = new Set(existing.map((x) => x.bookingId));
    const candidateIds = ids.filter((id) => !existingIds.has(id));

    if (!candidateIds.length) {
      return {
        added: 0,
        skipped: ids.length,
        seatsAssigned: 0,
        message: "Các đơn đã nằm trong chuyến.",
        trip,
        newBookingIds: [] as number[],
      };
    }

    const bookings = await tx.booking.findMany({
      where: { id: { in: candidateIds } },
      include: { tripBookings: true },
    });

    let tripAvail = Number(trip.availableSeats);
    if (trip.driverId) {
      const tripDriver = await tx.driver.findUnique({ where: { id: trip.driverId } });
      tripAvail = effectiveTripDispatchSeats(trip, tripDriver ?? undefined);
    }
    let totalSeatsAdded = 0;
    const assignedIds: number[] = [];
    const finParts: ReturnType<typeof rollupBookingFinancialsPortion>[] = [];

    for (const booking of bookings) {
      if (tripAvail <= 0) break;

      const remaining = bookingRemainingSeatUnits(booking, booking.tripBookings);
      if (remaining <= 0) continue;

      const requested = opts?.seatCounts?.[booking.id];
      let seatsToAssign = requested != null ? Math.min(requested, remaining) : remaining;
      seatsToAssign = Math.min(seatsToAssign, tripAvail);
      if (seatsToAssign <= 0) continue;

      await tx.tripBooking.create({
        data: { tripId, bookingId: booking.id, seatCount: seatsToAssign },
      });

      const bookingTotalSeats = bookingSeatUnits(booking);
      finParts.push(rollupBookingFinancialsPortion(booking, seatsToAssign, bookingTotalSeats));

      const fully = seatsToAssign >= remaining;
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: fully ? BookingStatus.ASSIGNED : BookingStatus.WAITING_DISPATCH,
        },
      });

      if (fully) {
        if (booking.type !== BookingType.CARGO && !booking.driverRideStatus) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { driverRideStatus: "WAITING_PICKUP" as any },
          });
        }
        if (booking.type === BookingType.CARGO && !booking.driverCargoStatus) {
          await tx.booking.update({
            where: { id: booking.id },
            data: { driverCargoStatus: "WAITING_PICKUP" as any },
          });
        }
      }

      tripAvail -= seatsToAssign;
      totalSeatsAdded += seatsToAssign;
      assignedIds.push(booking.id);
    }

    if (!assignedIds.length) {
      return {
        added: 0,
        skipped: ids.length,
        seatsAssigned: 0,
        message: "Không gán được — đơn đã đủ ghế hoặc chuyến hết chỗ.",
        trip,
        newBookingIds: [] as number[],
      };
    }

    const fin = finParts.reduce(
      (acc, f) => {
        acc.total += f.total;
        acc.commission += f.commission;
        acc.driverAmount += f.driverAmount;
        acc.driverOwesAdmin += f.driverOwesAdmin;
        acc.adminOwesDriver += f.adminOwesDriver;
        return acc;
      },
      { total: 0, commission: 0, driverAmount: 0, driverOwesAdmin: 0, adminOwesDriver: 0 }
    );

    const updatedTrip = await tx.trip.update({
      where: { id: tripId },
      data: {
        bookedSeats: { increment: totalSeatsAdded },
        availableSeats: { decrement: totalSeatsAdded },
        totalCustomerAmount: { increment: fin.total },
        adminCommission: { increment: fin.commission },
        driverNetAmount: { increment: fin.driverAmount },
        driverDebtAmount: { increment: fin.driverOwesAdmin },
        adminOwesDriverAmount: { increment: fin.adminOwesDriver },
      },
    });

    let partialCount = 0;
    for (const b of bookings) {
      if (!assignedIds.includes(b.id)) continue;
      const assignedNow = opts?.seatCounts?.[b.id];
      const remainingBefore = bookingRemainingSeatUnits(b, b.tripBookings);
      const used = assignedNow != null ? Math.min(assignedNow, remainingBefore) : remainingBefore;
      if (used < remainingBefore) partialCount++;
    }
    const partialNote = partialCount ? ` (còn ghế chưa gán trên ${partialCount} đơn)` : "";

    return {
      added: assignedIds.length,
      skipped: ids.length - assignedIds.length,
      seatsAssigned: totalSeatsAdded,
      message: `Đã gán ${totalSeatsAdded} ghế từ ${assignedIds.length} đơn vào chuyến${partialNote}.`,
      trip: updatedTrip,
      newBookingIds: assignedIds,
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

async function validateSeatsForNewTrip(
  bookingIds: number[],
  opts: { availableSeats: number; label: string; seatCounts?: Record<number, number> }
) {
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: { tripBookings: true },
  });
  let avail = Number(opts.availableSeats);
  let seatsNeeded = 0;
  for (const b of bookings) {
    const remaining = bookingRemainingSeatUnits(b, b.tripBookings);
    const requested = opts.seatCounts?.[b.id];
    let want = requested != null ? Math.min(requested, remaining) : remaining;
    const assign = Math.min(want, avail);
    seatsNeeded += assign;
    avail -= assign;
  }
  if (seatsNeeded <= 0) throw Object.assign(new Error("Số khách/đơn không hợp lệ hoặc hết ghế trống"), { statusCode: 400 });
  return { bookings, seats: seatsNeeded };
}

export async function createTripAndAssign(input: {
  routeId: number;
  bookingIds: number[];
  departureAt: string;
  totalSeats: number;
  driverId?: number | null;
  vehicleId?: number | null;
  seatCounts?: Record<number, number>;
}) {
  const bookingIds = Array.from(new Set(input.bookingIds.map(Number).filter(Boolean)));
  if (!bookingIds.length) throw Object.assign(new Error("Chưa chọn đơn"), { statusCode: 400 });

  const { seats: seatsNeeded } = await validateSeatsForNewTrip(bookingIds, {
    availableSeats: Number(input.totalSeats || 0),
    label: "Chuyến mới",
    seatCounts: input.seatCounts,
  });

  if (input.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(input.vehicleId) } });
    if (!vehicle) throw Object.assign(new Error("Không tìm thấy xe"), { statusCode: 404 });
    if (Number(vehicle.seats) < seatsNeeded) {
      throw Object.assign(
        new Error(`Xe ${vehicle.vehicleType || ""} chỉ ${vehicle.seats} chỗ, không chở ${seatsNeeded} khách lần này`),
        { statusCode: 400 }
      );
    }
    input.totalSeats = Number(vehicle.seats);
  }

  if (input.driverId) {
    await assertDriverAvailableForNewTrip(Number(input.driverId));
    await assertDriverMatchesBookings(Number(input.driverId), bookingIds);
  }

  if (input.driverId && !input.vehicleId) {
    const driver = await prisma.driver.findUnique({
      where: { id: Number(input.driverId) },
      include: { vehicles: true },
    });
    const v = driver?.vehicles?.[0];
    if (v && Number(v.seats) < seatsNeeded) {
      throw Object.assign(new Error(`Tài xế chỉ có xe ${v.seats} chỗ, lần gán này cần ${seatsNeeded} khách`), {
        statusCode: 400,
      });
    }
    if (v) input.totalSeats = Number(v.seats);
  }

  if (Number(input.totalSeats) < seatsNeeded) {
    throw Object.assign(
      new Error(`Chuyến ${input.totalSeats} chỗ không đủ cho ${seatsNeeded} khách lần này — chọn xe lớn hơn`),
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

  const assign = await assignBookingsToTrip(trip.id, bookingIds, {
    isNewTrip: true,
    seatCounts: input.seatCounts,
  });

  if (input.driverId && trip) {
    const tripFull = await prisma.trip.findUnique({
      where: { id: trip.id },
      include: {
        route: true,
        tripBookings: { include: { booking: { include: { route: true } } } },
      },
    });
    if (tripFull) {
      await prisma.driver.update({
        where: { id: Number(input.driverId) },
        data: driverProfileFromTrip(tripFull),
      });
    }
  }

  return { ...assign, message: `Đã tạo chuyến ${trip.code} và gán ${assign.seatsAssigned ?? 0} ghế.` };
}

export async function assignDriverToTrip(tripId: number, driverId: number, vehicleId?: number | null) {
  await assertDriverAvailableForNewTrip(Number(driverId));
  await assertDriverMatchesTrip(Number(driverId), tripId);

  const driver = await prisma.driver.findUnique({
    where: { id: Number(driverId) },
    include: { vehicles: true },
  });
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });
  if (trip.driverId) {
    throw Object.assign(new Error("Chuyến đã có tài xế — không gán thêm"), { statusCode: 400 });
  }
  if (trip.status !== TripStatus.COLLECTING && trip.status !== TripStatus.READY) {
    throw Object.assign(new Error("Chỉ gán tài xế cho chuyến đang gom hoặc sẵn sàng chạy"), { statusCode: 400 });
  }
  assertTripAcceptsMoreBookings(trip);

  let vehicle =
    vehicleId != null && Number(vehicleId) > 0
      ? await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } })
      : driver.vehicles?.[0] ?? null;
  if (!vehicle) {
    throw Object.assign(new Error("Tài xế chưa khai báo xe"), { statusCode: 400 });
  }
  if (Number(vehicle.driverId) !== Number(driverId)) {
    throw Object.assign(new Error("Xe không thuộc tài xế này"), { statusCode: 400 });
  }

  const cap = Number(vehicle.seats);
  const booked = Number(trip.bookedSeats);
  if (cap < booked) {
    throw Object.assign(
      new Error(`Xe chỉ ${cap} chỗ, chuyến đã có ${booked} khách — gom bớt hoặc chọn xe lớn hơn`),
      { statusCode: 400 }
    );
  }

  const totalSeats = Math.max(Number(trip.totalSeats), cap);
  const availableSeats = Math.max(0, totalSeats - booked);

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.trip.update({
      where: { id: tripId },
      data: {
        driverId: Number(driverId),
        vehicleId: vehicle!.id,
        totalSeats,
        availableSeats,
      },
      include: { route: true, driver: true, vehicle: true },
    });
    const tripForDir = await tx.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
        tripBookings: { include: { booking: { include: { route: true } } } },
      },
    });
    await tx.driver.update({
      where: { id: Number(driverId) },
      data: tripForDir ? driverProfileFromTrip(tripForDir) : { status: "Đang chạy chuyến" },
    });
    return t;
  });

  const bookingCount = await prisma.tripBooking.count({ where: { tripId } });
  await safeNotify(() =>
    notifyDriverTripAssigned(Number(driverId), {
      tripId: updated.id,
      tripCode: updated.code,
      bookingCount,
      departureAt: updated.departureAt,
      routeName: updated.route?.name,
      driverOnly: true,
    })
  );

  return {
    trip: updated,
    message: `Đã gán ${driver.name}${vehicle.licensePlate ? ` · ${vehicle.licensePlate}` : ""} cho chuyến ${updated.code}.`,
  };
}

export async function applyDispatchSuggestion(body: any) {
  const kind = body.kind;
  const bookingIds = Array.isArray(body.bookingIds) ? body.bookingIds : [];
  const seatCounts = parseSeatCounts(body);

  if (kind === "assign_driver") {
    const tripId = Number(body.tripId);
    const driverId = Number(body.driverId);
    if (!tripId || !driverId) {
      throw Object.assign(new Error("Thiếu chuyến hoặc tài xế"), { statusCode: 400 });
    }
    return assignDriverToTrip(tripId, driverId, body.vehicleId);
  }

  if (kind === "assign_trip") {
    const tripId = Number(body.tripId);
    if (!tripId) throw Object.assign(new Error("Thiếu chuyến đích"), { statusCode: 400 });
    return assignBookingsToTrip(tripId, bookingIds, { seatCounts });
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
      seatCounts,
    });
  }

  throw Object.assign(new Error("Loại gợi ý không hợp lệ"), { statusCode: 400 });
}
