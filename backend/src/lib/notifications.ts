import { NotificationType, UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
import { bookingCapacityLabel } from "./bookingSeats.js";

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
  if (!d) return "chưa hẹn giờ";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function staffUserIds() {
  const users = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES }, status: "ACTIVE" },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

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
  if (!ids.length) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({ userId, ...data })),
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
  await createForUsers(await staffUserIds(), {
    type: NotificationType.BOOKING_NEW,
    title: `Đơn mới ${booking.code}`,
    body: `${booking.customerName} • ${booking.customerPhone} • ${typeLabel} • ${routeName} • ${bookingCapacityLabel(booking)} • ${fmtWhen(booking.scheduledAt)}${via}`,
    link: "/admin/don-hang",
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

  await createForUsers(await staffUserIds(), {
    type: NotificationType.DISPATCH_ASSIGNED,
    title: `Đã gán ${count} đơn vào ${input.tripCode}`,
    body: `Đơn: ${codes}${route ? ` • ${route}` : ""} • Khởi hành: ${when}`,
    link: "/admin/dispatch",
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

export async function notifyDriverTripAssigned(
  driverId: number,
  input: {
    tripId: number;
    tripCode: string;
    bookingCount: number;
    departureAt?: Date | string | null;
    routeName?: string;
    isNewTrip?: boolean;
  }
) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { userId: true, name: true },
  });
  if (!driver?.userId) return;

  const when = fmtWhen(input.departureAt);
  const route = input.routeName || "";
  const action = input.isNewTrip ? "Chuyến mới được tạo" : "Được gán thêm khách";

  await createForUsers([driver.userId], {
    type: NotificationType.DRIVER_TRIP_ASSIGNED,
    title: `${action}: ${input.tripCode}`,
    body: `${input.bookingCount} khách${route ? ` • ${route}` : ""} • Khởi hành: ${when}`,
    link: "/tai-xe",
    entityType: "trip",
    entityId: input.tripId,
  });
}
