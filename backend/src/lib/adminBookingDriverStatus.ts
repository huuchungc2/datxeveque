import { BookingStatus, BookingType } from "@prisma/client";
import { prisma } from "./prisma.js";
import { assertValidCargoStatusTransition, assertValidRideStatusTransition } from "./driverRideFlow.js";
import { tryAutoCompleteTrip } from "./tripComplete.js";

/** Trùng schema Prisma — khai báo local để tránh lỗi ESM named export enum trên Node VPS. */
const DriverBookingRideStatus = {
  WAITING_PICKUP: "WAITING_PICKUP",
  PICKING_UP: "PICKING_UP",
  PICKED_UP: "PICKED_UP",
  DROPPING_OFF: "DROPPING_OFF",
  DROPPED_OFF: "DROPPED_OFF",
  CUSTOMER_CANCELLED: "CUSTOMER_CANCELLED",
  UNREACHABLE: "UNREACHABLE",
  NO_SHOW: "NO_SHOW",
  WAITING_ADMIN_REVIEW: "WAITING_ADMIN_REVIEW",
  WAITING_REDISPATCH: "WAITING_REDISPATCH",
  CANCELLED_BY_ADMIN: "CANCELLED_BY_ADMIN",
} as const;

const DriverBookingCargoStatus = {
  WAITING_PICKUP: "WAITING_PICKUP",
  PICKING_UP: "PICKING_UP",
  PICKED_UP: "PICKED_UP",
  DELIVERING: "DELIVERING",
  DELIVERED: "DELIVERED",
  FAILED_PICKUP: "FAILED_PICKUP",
  FAILED_DELIVERY: "FAILED_DELIVERY",
  PARCEL_CANCELLED: "PARCEL_CANCELLED",
  WAITING_ADMIN_REVIEW: "WAITING_ADMIN_REVIEW",
} as const;

const RIDE_STATUS_VALUES = new Set<string>(Object.values(DriverBookingRideStatus));
const CARGO_STATUS_VALUES = new Set<string>(Object.values(DriverBookingCargoStatus));

export async function patchBookingDriverStatus(
  tripId: number,
  bookingId: number,
  body: { driverRideStatus?: string; driverCargoStatus?: string; strict?: boolean }
) {
  const link = await prisma.tripBooking.findFirst({
    where: { tripId, bookingId },
    include: { booking: true, trip: { select: { id: true, status: true } } },
  });
  if (!link) throw Object.assign(new Error("Đơn không thuộc chuyến này"), { statusCode: 404 });
  if (link.booking.status === BookingStatus.CANCELLED) {
    throw Object.assign(new Error("Đơn đã hủy"), { statusCode: 400 });
  }

  const strict = Boolean(body.strict);
  const data: Record<string, unknown> = {};

  if (body.driverRideStatus !== undefined) {
    if (link.booking.type === BookingType.CARGO) {
      throw Object.assign(new Error("Đơn gửi hàng — dùng trạng thái hàng"), { statusCode: 400 });
    }
    const status = String(body.driverRideStatus).trim();
    if (!RIDE_STATUS_VALUES.has(status)) {
      throw Object.assign(new Error("Trạng thái khách không hợp lệ"), { statusCode: 400 });
    }
    if (strict) assertValidRideStatusTransition(link.booking.driverRideStatus, status);
    data.driverRideStatus = status;
    if (status === DriverBookingRideStatus.CUSTOMER_CANCELLED) {
      data.status = BookingStatus.WAITING_DISPATCH;
    } else if (
      status === DriverBookingRideStatus.UNREACHABLE ||
      status === DriverBookingRideStatus.NO_SHOW
    ) {
      data.status = BookingStatus.CONTACTED;
    }
  }

  if (body.driverCargoStatus !== undefined) {
    if (link.booking.type !== BookingType.CARGO) {
      throw Object.assign(new Error("Đơn khách — dùng trạng thái đón/trả"), { statusCode: 400 });
    }
    const status = String(body.driverCargoStatus).trim();
    if (!CARGO_STATUS_VALUES.has(status)) {
      throw Object.assign(new Error("Trạng thái hàng không hợp lệ"), { statusCode: 400 });
    }
    if (strict) assertValidCargoStatusTransition(link.booking.driverCargoStatus, status);
    data.driverCargoStatus = status;
  }

  if (!Object.keys(data).length) {
    throw Object.assign(new Error("Thiếu trạng thái cần cập nhật"), { statusCode: 400 });
  }

  const updated = await prisma.booking.update({ where: { id: bookingId }, data });

  let autoCompleted = false;
  let autoMessage: string | undefined;
  if (
    data.driverRideStatus === DriverBookingRideStatus.DROPPED_OFF ||
    data.driverCargoStatus === DriverBookingCargoStatus.DELIVERED
  ) {
    const auto = await tryAutoCompleteTrip(tripId, { completedBy: "ADMIN" });
    autoCompleted = Boolean(auto.autoCompleted);
    if (auto.autoCompleted && "message" in auto) autoMessage = auto.message;
  }

  return { booking: updated, autoCompleted, message: autoMessage };
}
