import { TripStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { completeTrip } from "./tripComplete.js";

/** Tài xế đổi trạng thái chuyến: đang gom → đang chạy (xuất phát) → hoàn thành */
export async function driverSetTripStatus(
  driverId: number,
  tripId: number,
  target: "READY" | "IN_PROGRESS" | "COMPLETED",
  userId?: number | null
) {
  const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId } });
  if (!trip) throw Object.assign(new Error("Không tìm thấy chuyến"), { statusCode: 404 });

  if (trip.status === TripStatus.CANCELLED) {
    throw Object.assign(new Error("Chuyến đã hủy"), { statusCode: 400 });
  }
  if (trip.status === TripStatus.COMPLETED) {
    throw Object.assign(new Error("Chuyến đã hoàn thành"), { statusCode: 400 });
  }

  if (target === "READY") {
    if (trip.status !== TripStatus.COLLECTING && trip.status !== TripStatus.READY) {
      throw Object.assign(new Error("Chỉ chuyển về «Đang gom» khi chuyến chưa xuất phát"), { statusCode: 400 });
    }
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.READY },
    });
    return { trip: updated, message: "Chuyến đang gom — có thể nhận thêm khách." };
  }

  if (target === "IN_PROGRESS") {
    if (trip.status !== TripStatus.READY && trip.status !== TripStatus.COLLECTING) {
      throw Object.assign(new Error("Chỉ xuất phát khi chuyến đang gom"), { statusCode: 400 });
    }
    const updated = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.IN_PROGRESS,
        availableSeats: 0,
      },
    });
    return {
      trip: updated,
      message: "Đã chuyển sang đang chạy — không nhận thêm khách vào chuyến này.",
    };
  }

  if (target === "COMPLETED") {
    const result = await completeTrip(tripId, { completedBy: "DRIVER", userId });
    return { trip: result.trip, message: result.message, autoCompleted: true };
  }

  throw Object.assign(new Error("Trạng thái chuyến không hợp lệ"), { statusCode: 400 });
}
