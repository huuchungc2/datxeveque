import { NotificationType, UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
import { bookingCapacityLabel } from "./bookingSeats.js";
import { mirrorInAppNotification } from "./telegramNotify.js";
import { formatZonedDateTime } from "./datetime.js";

const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.DISPATCHER, UserRole.ACCOUNTANT];

const TYPE_LABELS: Record<string, string> = {
  SHARED_RIDE: "Xe ghép",
  PRIVATE_RIDE: "Bao xe",
  CARGO: "Gửi hàng",
  MARKET: "Đi chợ quê",
  CONTRACT: "Xe hợp đồng",
  WEDDING: "Xe đám cưới",
  TOUR: "Xe tham quan",
  HOSPITAL: "Xe bệnh viện",
  AIRPORT: "Xe sân bay",
};

function fmtWhen(d?: Date | string | null) {
  return formatZonedDateTime(d);
}

async function staffUserIds() {
  const users = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES }, status: "ACTIVE" },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/**
 * Tạo thông báo chuông + mirror sang nhóm Telegram (nếu đã cấu hình bot).
 * Mọi sự kiện phải đi qua đây để Telegram và chuông luôn khớp nhau.
 */
async function createForUsers(
  userIds: number[],
  data: {
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
    entityType?: string;
    entityId?: number;
  }
) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length) {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, ...data })),
    });
  }
  // Nhóm Telegram luôn nhận tin khi đã cấu hình bot — không phụ thuộc có user staff trong DB.
  await mirrorInAppNotification({
    title: data.title,
    body: data.body,
    link: data.link,
  });
}

/** Không chặn luồng chính nếu ghi thông báo lỗi */
export async function safeNotify(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error("notify error:", e);
  }
}

export async function notifyStaffNewBooking(booking: {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  type: string;
  passengerCount: number;
  scheduledAt?: Date | null;
  route?: { name?: string } | null;
  source?: string;
}) {
  const typeLabel = TYPE_LABELS[booking.type] || booking.type;
  const routeName = booking.route?.name || "Chưa chọn tuyến";
  const via = booking.source === "ADMIN" ? " (nhập bởi admin)" : "";
  const body = `${booking.customerName} • ${booking.customerPhone} • ${typeLabel} • ${routeName} • ${bookingCapacityLabel(booking)} • ${fmtWhen(booking.scheduledAt)}${via}`;
  await createForUsers(await staffUserIds(), {
    type: NotificationType.BOOKING_NEW,
    title: `Đơn mới ${booking.code}`,
    body,
    link: "/don-hang",
    entityType: "booking",
    entityId: booking.id,
  });
}

export async function notifyStaffBookingRequest(
  booking: {
    id: number;
    code: string;
    customerName: string;
    customerPhone: string;
    type: string;
    passengerCount: number;
    scheduledAt?: Date | null;
    route?: { name?: string } | null;
  },
  kind: "change" | "cancel",
  detail: string
) {
  const label = kind === "cancel" ? "Yêu cầu hủy" : "Yêu cầu sửa";
  const body = `${booking.customerName} • ${booking.customerPhone} • ${detail}`;
  await createForUsers(await staffUserIds(), {
    type: NotificationType.BOOKING_NEW,
    title: `${label} — ${booking.code}`,
    body,
    link: "/don-hang",
    entityType: "booking",
    entityId: booking.id,
  });
}

export async function notifyDispatchAssigned(input: {
  tripId: number;
  tripCode: string;
  bookingIds: number[];
  driverId?: number | null;
  departureAt?: Date | string | null;
  routeName?: string;
  isNewTrip?: boolean;
}) {
  const count = input.bookingIds.length;
  if (!count) return;

  const bookings = await prisma.booking.findMany({
    where: { id: { in: input.bookingIds } },
    select: { code: true },
  });
  const codes = bookings.map((b) => b.code).join(", ");
  const when = fmtWhen(input.departureAt);
  const route = input.routeName || "";

  const dispatchBody = `Đơn: ${codes}${route ? ` • ${route}` : ""} • Khởi hành: ${when}`;
  await createForUsers(await staffUserIds(), {
    type: NotificationType.DISPATCH_ASSIGNED,
    title: `Đã gán ${count} đơn vào ${input.tripCode}`,
    body: dispatchBody,
    link: "/dispatch",
    entityType: "trip",
    entityId: input.tripId,
  });

  if (input.driverId) {
    await notifyDriverTripAssigned(input.driverId, {
      tripId: input.tripId,
      tripCode: input.tripCode,
      bookingCount: count,
      departureAt: input.departureAt,
      routeName: input.routeName,
      isNewTrip: input.isNewTrip,
    });
  }
}

function driverAssignAction(input: { isNewTrip?: boolean; driverOnly?: boolean }) {
  if (input.isNewTrip) return "Chuyến mới được tạo";
  if (input.driverOnly) return "Bạn được gán chuyến";
  return "Được gán thêm khách";
}

export async function notifyDriverTripAssigned(
  driverId: number,
  input: {
    tripId: number;
    tripCode: string;
    bookingCount: number;
    departureAt?: Date | string | null;
    routeName?: string;
    isNewTrip?: boolean;
    /** Admin chỉ gán tài xế vào chuyến đã có khách — không gán thêm đơn lúc đó */
    driverOnly?: boolean;
  }
) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { userId: true, name: true },
  });
  if (!driver?.userId) return;

  const when = fmtWhen(input.departureAt);
  const route = input.routeName || "";
  const action = driverAssignAction(input);
  const driverName = driver.name ? ` • Tài xế: ${driver.name}` : "";
  const guests =
    input.bookingCount > 0 ? `${input.bookingCount} khách` : "Chờ xác nhận trên app tài xế";

  await createForUsers([driver.userId], {
    type: NotificationType.DRIVER_TRIP_ASSIGNED,
    title: `${action}: ${input.tripCode}`,
    body: `${guests}${route ? ` • ${route}` : ""} • Khởi hành: ${when}${driverName}`,
    link: "/tai-xe/chuyen",
    entityType: "trip",
    entityId: input.tripId,
  });
}

export async function notifyStaffDriverTripAccepted(input: {
  tripId: number;
  tripCode: string;
  driverName: string;
  departureAt?: Date | string | null;
  routeName?: string;
}) {
  const when = fmtWhen(input.departureAt);
  const route = input.routeName || "";
  const body = `${input.driverName} đã nhận chuyến${route ? ` • ${route}` : ""} • Khởi hành: ${when}`;
  await createForUsers(await staffUserIds(), {
    type: NotificationType.DISPATCH_ASSIGNED,
    title: `Tài xế nhận chuyến ${input.tripCode}`,
    body,
    link: "/dispatch",
    entityType: "trip",
    entityId: input.tripId,
  });
}

export async function notifyStaffDriverTripRejected(input: {
  tripId: number;
  tripCode: string;
  driverName: string;
  reason?: string;
  departureAt?: Date | string | null;
  routeName?: string;
}) {
  const when = fmtWhen(input.departureAt);
  const route = input.routeName || "";
  const reasonLine = input.reason ? ` • Lý do: ${input.reason}` : "";
  const body = `${input.driverName} từ chối chuyến${route ? ` • ${route}` : ""} • Khởi hành: ${when}${reasonLine}`;
  await createForUsers(await staffUserIds(), {
    type: NotificationType.DISPATCH_ASSIGNED,
    title: `Tài xế từ chối ${input.tripCode}`,
    body,
    link: "/dispatch",
    entityType: "trip",
    entityId: input.tripId,
  });
}
