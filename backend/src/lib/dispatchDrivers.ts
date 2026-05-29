import { TripStatus, UserStatus } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Có chuyến chưa xong → không gán chuyến mới (vẫn gom thêm đơn vào chuyến COLLECTING ở cột ②) */
export const TRIP_BUSY_STATUSES: TripStatus[] = [
  TripStatus.COLLECTING,
  TripStatus.READY,
  TripStatus.IN_PROGRESS,
];

/** Đang chạy — không điều phối thêm */
export const TRIP_RUNNING_STATUSES: TripStatus[] = [TripStatus.IN_PROGRESS];

/** Chỉ trạng thái này mới được gán chuyến mới */
export const DRIVER_IDLE_STATUS = "Rảnh";

export async function getBusyDriverIds(): Promise<number[]> {
  const trips = await prisma.trip.findMany({
    where: {
      driverId: { not: null },
      status: { in: TRIP_BUSY_STATUSES },
    },
    select: { driverId: true },
  });
  return [...new Set(trips.map((t) => t.driverId!).filter(Boolean))];
}

export async function getDriversOnActiveTrips() {
  return prisma.trip.findMany({
    where: {
      driverId: { not: null },
      status: { in: TRIP_BUSY_STATUSES },
    },
    select: {
      id: true,
      code: true,
      status: true,
      driverId: true,
      driver: { select: { id: true, name: true, status: true } },
    },
    orderBy: { departureAt: "asc" },
  });
}

export function buildAvailableDriverWhere(busyDriverIds: number[], extra?: Record<string, unknown>) {
  const where: Record<string, unknown> = {
    status: DRIVER_IDLE_STATUS,
    seatsFree: { gt: 0 },
    user: { status: UserStatus.ACTIVE },
    ...extra,
  };
  if (busyDriverIds.length) where.id = { notIn: busyDriverIds };
  return where;
}

export async function assertDriverUserActive(driverId: number, driverName?: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { user: { select: { status: true } } },
  });
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });
  const label = driverName || driver.name;
  if (!driver.user || driver.user.status !== UserStatus.ACTIVE) {
    throw Object.assign(
      new Error(`Tài xế ${label} đã bị khóa tài khoản, không thể gán chuyến mới`),
      { statusCode: 400 }
    );
  }
}

export async function assertDriverAvailableForNewTrip(driverId: number) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) throw Object.assign(new Error("Không tìm thấy tài xế"), { statusCode: 404 });
  await assertDriverUserActive(driverId, driver.name);
  if (driver.status !== DRIVER_IDLE_STATUS) {
    throw Object.assign(
      new Error(`Tài xế ${driver.name} không ở trạng thái "${DRIVER_IDLE_STATUS}" (hiện: ${driver.status})`),
      { statusCode: 400 }
    );
  }
  if (Number(driver.seatsFree) <= 0) {
    throw Object.assign(new Error(`Tài xế ${driver.name} báo 0 ghế rảnh`), { statusCode: 400 });
  }

  const onTrip = await prisma.trip.findFirst({
    where: { driverId, status: { in: TRIP_BUSY_STATUSES } },
    select: { code: true, status: true },
  });
  if (onTrip) {
    throw Object.assign(
      new Error(`Tài xế ${driver.name} đang có chuyến ${onTrip.code} (${onTrip.status}), không gán chuyến mới`),
      { statusCode: 400 }
    );
  }
}
