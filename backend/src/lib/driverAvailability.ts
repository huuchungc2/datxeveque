import { TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { TRIP_BUSY_STATUSES } from "./dispatchDrivers.js";
import { publicRouteWhere } from "./routes.js";
import {
  departureEndpointForRun,
  endpointLabel,
  inferTripRunDirection,
  runDirectionLabel,
  type RunDirection,
} from "./routeEndpoints.js";

export function getDriverVehicleMaxSeats(driver: { vehicles?: { seats?: number }[] | null }) {
  const seats = driver.vehicles?.map((v) => Number(v.seats || 0)).filter((n) => n > 0) ?? [];
  return seats.length ? Math.max(...seats) : 0;
}

/** Ghế admin có thể gán thêm vào chuyến đang gom (vé riêng / khách riêng trừ vào seatsFree tài xế) */
export function effectiveTripDispatchSeats(
  trip: { availableSeats?: unknown; driverId?: number | null },
  driver?: { seatsFree?: unknown } | null
) {
  const tripAvail = Math.max(0, Number(trip.availableSeats ?? 0));
  if (!trip.driverId || !driver) return tripAvail;
  const declared = Number(driver.seatsFree ?? 0);
  if (declared <= 0) return 0;
  return Math.min(tripAvail, declared);
}

export async function loadDriverActiveTrip(driverId: number) {
  return prisma.trip.findFirst({
    where: {
      driverId,
      status: { in: TRIP_BUSY_STATUSES },
    },
    include: {
      route: { select: { id: true, name: true, fromName: true, toName: true, direction: true } },
      vehicle: { select: { seats: true } },
    },
    orderBy: { departureAt: "asc" },
  });
}

export async function loadDriverAvailabilityContext(userId: number) {
  const driver = await prisma.driver.findFirst({
    where: { userId },
    include: {
      vehicles: true,
      route: { select: { id: true, name: true, fromName: true, toName: true, direction: true } },
    },
  });
  if (!driver) return null;

  const vehicleMaxSeats = getDriverVehicleMaxSeats(driver);
  const activeTrip = await loadDriverActiveTrip(driver.id);
  const locked = Boolean(activeTrip);

  let displayStatus = driver.status;
  let displayRunDirection = driver.runDirection as RunDirection | null;
  let displayDirection = driver.direction;
  let displayLocation = driver.location;

  if (activeTrip) {
    const run = inferTripRunDirection(activeTrip);
    if (run) {
      displayRunDirection = run;
      displayLocation = endpointLabel(departureEndpointForRun(run));
      displayDirection = runDirectionLabel(run);
    }
    if (activeTrip.status === TripStatus.IN_PROGRESS) {
      displayStatus = "Đang chạy chuyến";
    } else {
      displayStatus = "Đang gom chuyến";
    }
  }

  const dispatchSeats = activeTrip
    ? effectiveTripDispatchSeats(activeTrip, driver)
    : Number(driver.seatsFree ?? 0);

  return {
    driver,
    vehicleMaxSeats,
    locked,
    activeTrip: activeTrip
      ? {
          id: activeTrip.id,
          code: activeTrip.code,
          status: activeTrip.status,
          routeId: activeTrip.routeId,
          routeName: activeTrip.route?.name,
          runDirection: inferTripRunDirection(activeTrip),
          totalSeats: activeTrip.totalSeats,
          bookedSeats: activeTrip.bookedSeats,
          availableSeats: activeTrip.availableSeats,
          dispatchSeats,
        }
      : null,
    form: {
      status: displayStatus,
      runDirection: displayRunDirection,
      location: displayLocation,
      direction: displayDirection,
      seatsFree: Number(driver.seatsFree ?? 0),
    },
    dispatchSeats,
  };
}

export async function patchDriverAvailability(
  userId: number,
  body: Record<string, unknown>
) {
  const driver = await prisma.driver.findFirst({
    where: { userId },
    include: { vehicles: true, route: true },
  });
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });

  const vehicleMaxSeats = getDriverVehicleMaxSeats(driver);
  const activeTrip = await loadDriverActiveTrip(driver.id);
  const seatsFree = Number(body.seatsFree ?? driver.seatsFree ?? 0);
  if (!Number.isFinite(seatsFree) || seatsFree < 0) {
    throw Object.assign(new Error("Số ghế không hợp lệ"), { statusCode: 400 });
  }
  if (vehicleMaxSeats > 0 && seatsFree > vehicleMaxSeats) {
    throw Object.assign(
      new Error(`Ghế trống không được vượt quá ${vehicleMaxSeats} chỗ trên xe đã khai báo`),
      { statusCode: 400 }
    );
  }

  if (activeTrip) {
    const updated = await prisma.driver.update({
      where: { id: driver.id },
      data: { seatsFree },
      include: {
        vehicles: true,
        route: { select: { id: true, name: true, fromName: true, toName: true, direction: true } },
      },
    });
    const dispatchSeats = effectiveTripDispatchSeats(activeTrip, updated);
    return {
      driver: updated,
      message: `Đã cập nhật ghế cho chuyến ${activeTrip.code}. Admin chỉ gán thêm tối đa ${dispatchSeats} ghế (chuyến còn ${activeTrip.availableSeats}, bạn báo ${seatsFree}).`,
      locked: true,
      activeTrip,
      dispatchSeats,
    };
  }

  const status = String(body.status ?? driver.status);
  const data: {
    status: string;
    seatsFree: number;
    routeId?: null;
    runDirection?: string | null;
    location?: string | null;
    direction?: string | null;
  } = { status, seatsFree };

  if (status === "Rảnh") {
    const runDirection = String(body.runDirection || "") as RunDirection;
    if (runDirection !== "SG_TO_PROVINCE" && runDirection !== "PROVINCE_TO_SG") {
      throw Object.assign(new Error("Chọn chiều chạy (Sài Gòn ↔ tỉnh)"), { statusCode: 400 });
    }
    Object.assign(data, resolveDriverRunDirectionFields(runDirection));
    data.routeId = null;
  } else if (body.runDirection !== undefined) {
    const runDirection = String(body.runDirection || "") as RunDirection;
    if (runDirection === "SG_TO_PROVINCE" || runDirection === "PROVINCE_TO_SG") {
      Object.assign(data, resolveDriverRunDirectionFields(runDirection));
      data.routeId = null;
    } else {
      data.runDirection = null;
    }
  }

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data,
    include: {
      vehicles: true,
      route: { select: { id: true, name: true, fromName: true, toName: true, direction: true } },
    },
  });

  return {
    driver: updated,
    message: "Đã lưu — admin thấy trên màn điều phối.",
    locked: false,
    activeTrip: null,
    dispatchSeats: Number(updated.seatsFree ?? 0),
  };
}

/** Khai báo rảnh / admin: chỉ chiều chạy — tài xế nhận mọi tuyến cùng chiều */
export function resolveDriverRunDirectionFields(runDirection: RunDirection) {
  if (runDirection !== "SG_TO_PROVINCE" && runDirection !== "PROVINCE_TO_SG") {
    throw Object.assign(new Error("Chọn chiều chạy (Sài Gòn ↔ tỉnh)"), { statusCode: 400 });
  }
  return {
    runDirection,
    location: endpointLabel(departureEndpointForRun(runDirection)),
    direction: runDirectionLabel(runDirection),
  };
}

/** @deprecated Chỉ dùng khi cần gắn routeId legacy; điều phối không lọc tài theo tuyến */
export async function resolveDriverRouteFields(routeId: number, runDirection: RunDirection) {
  if (!Number.isFinite(routeId) || routeId <= 0) {
    throw Object.assign(new Error("Chọn tuyến hợp lệ"), { statusCode: 400 });
  }
  const route = await prisma.route.findFirst({
    where: { id: routeId, ...publicRouteWhere() },
  });
  if (!route) throw Object.assign(new Error("Tuyến không hợp lệ hoặc đã ngừng"), { statusCode: 400 });
  return { routeId, ...resolveDriverRunDirectionFields(runDirection) };
}

export async function patchAdminDriver(driverId: number, body: Record<string, unknown>) {
  const existing = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!existing) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw Object.assign(new Error("Vui lòng nhập họ tên"), { statusCode: 400 });
    data.name = name;
  }
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.zaloPhone !== undefined) data.zaloPhone = body.zaloPhone || null;
  if (body.note !== undefined) data.note = body.note || null;

  if (body.runDirection !== undefined) {
    const runDirection = String(body.runDirection || "") as RunDirection;
    if (runDirection !== "SG_TO_PROVINCE" && runDirection !== "PROVINCE_TO_SG") {
      throw Object.assign(new Error("Chọn chiều chạy"), { statusCode: 400 });
    }
    Object.assign(data, resolveDriverRunDirectionFields(runDirection));
    data.routeId = null;
  } else if (body.location !== undefined || body.direction !== undefined) {
    if (body.location !== undefined) data.location = body.location || null;
    if (body.direction !== undefined) data.direction = body.direction || null;
  }

  return prisma.driver.update({
    where: { id: driverId },
    data,
    include: {
      vehicles: true,
      route: { select: { id: true, name: true, fromName: true, toName: true, direction: true } },
      user: { select: { id: true, phone: true, status: true, role: true, name: true } },
    },
  });
}

export function driverProfileFromTrip(trip: {
  routeId: number;
  route?: { name?: string | null; fromName?: string | null; toName?: string | null; direction?: string | null } | null;
  tripBookings?: { booking: Record<string, unknown> }[];
  driver?: { location?: string | null; direction?: string | null } | null;
}) {
  const run = inferTripRunDirection(trip);
  if (!run) {
    return { status: "Đang chạy chuyến" as const };
  }
  return {
    status: "Đang chạy chuyến" as const,
    runDirection: run,
    location: endpointLabel(departureEndpointForRun(run)),
    direction: runDirectionLabel(run),
  };
}
