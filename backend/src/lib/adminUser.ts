import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "./prisma.js";
import { hashPassword } from "./auth.js";
import { assertVnPhone } from "./phone.js";
import { resolveDriverRunDirectionFields } from "./driverAvailability.js";
import type { RunDirection } from "./routeEndpoints.js";

function parseRole(raw: unknown): UserRole {
  const role = String(raw || "").toUpperCase() as UserRole;
  if (!Object.values(UserRole).includes(role)) {
    throw Object.assign(new Error("Vai trò không hợp lệ"), { statusCode: 400 });
  }
  return role;
}

function parseStatus(raw: unknown): UserStatus {
  if (raw === "LOCKED") return UserStatus.LOCKED;
  return UserStatus.ACTIVE;
}

async function assertEmailFree(email: string | null, excludeUserId?: number) {
  if (!email) return;
  const other = await prisma.user.findFirst({ where: { email, ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}) } });
  if (other) throw Object.assign(new Error("Email đã được dùng"), { statusCode: 400 });
}

export const userInclude = {
  driver: {
    include: {
      vehicles: true,
      route: { select: { id: true, name: true, direction: true } },
    },
  },
  customer: true,
} as const;

type DriverRunFields = ReturnType<typeof resolveDriverRunDirectionFields>;

async function driverRunFieldsFromBody(body: Record<string, unknown>): Promise<Partial<DriverRunFields> & { routeId: null }> {
  const runDirection = String(body.runDirection || "") as RunDirection;
  if (runDirection !== "SG_TO_PROVINCE" && runDirection !== "PROVINCE_TO_SG") {
    if (body.runDirection !== undefined) {
      throw Object.assign(new Error("Chọn chiều chạy"), { statusCode: 400 });
    }
    return { routeId: null };
  }
  return { ...resolveDriverRunDirectionFields(runDirection), routeId: null };
}

export async function createAdminUser(body: Record<string, unknown>) {
  const name = String(body.name || "").trim();
  if (!name) throw Object.assign(new Error("Vui lòng nhập họ tên"), { statusCode: 400 });

  const phone = assertVnPhone(String(body.phone || ""));
  const role = parseRole(body.role);
  const password = String(body.password || "");
  if (password.length < 6) {
    throw Object.assign(new Error("Mật khẩu tối thiểu 6 ký tự"), { statusCode: 400 });
  }

  const email = body.email ? String(body.email).trim() || null : null;
  await assertEmailFree(email);

  const exists = await prisma.user.findUnique({ where: { phone } });
  if (exists) throw Object.assign(new Error("Số điện thoại đã tồn tại"), { statusCode: 400 });

  const status = parseStatus(body.status);
  const passwordHash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, phone, email, passwordHash, role, status },
      include: userInclude,
    });

    if (role === UserRole.DRIVER) {
      const zaloPhone =
        body.zaloPhone && String(body.zaloPhone).trim()
          ? assertVnPhone(String(body.zaloPhone))
          : null;
      const runFields = await driverRunFieldsFromBody(body);
      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          name,
          phone,
          zaloPhone,
          status: String(body.driverStatus || "Rảnh"),
          location:
            runFields.location ??
            (body.location ? String(body.location) : null),
          direction:
            runFields.direction ??
            (body.direction ? String(body.direction) : null),
          routeId: null,
          runDirection: runFields.runDirection ?? null,
          seatsFree: Number(body.seatsFree ?? 0),
          note: body.note ? String(body.note) : null,
        },
      });
      const vehicleType = String(body.vehicleType || "").trim();
      const seats = Number(body.vehicleSeats ?? body.seats ?? 0);
      if (vehicleType || seats > 0) {
        await tx.vehicle.create({
          data: {
            driverId: driver.id,
            vehicleType: vehicleType || "Xe chưa cập nhật",
            licensePlate: body.licensePlate ? String(body.licensePlate) : null,
            seats: seats > 0 ? seats : 7,
          },
        });
      }
    } else if (role === UserRole.CUSTOMER) {
      const zalo =
        body.zaloPhone && String(body.zaloPhone).trim()
          ? assertVnPhone(String(body.zaloPhone))
          : null;
      await tx.customer.create({
        data: {
          userId: user.id,
          name,
          phone,
          zaloPhone: zalo,
          note: body.note ? String(body.note) : null,
        },
      });
    }

    return tx.user.findUnique({ where: { id: user.id }, include: userInclude });
  });
}

export async function updateAdminUser(id: number, body: Record<string, unknown>) {
  const existing = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!existing) throw Object.assign(new Error("Không tìm thấy người dùng"), { statusCode: 404 });

  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  if (!name) throw Object.assign(new Error("Vui lòng nhập họ tên"), { statusCode: 400 });

  const phone =
    body.phone !== undefined ? assertVnPhone(String(body.phone)) : existing.phone;
  if (phone !== existing.phone) {
    const dup = await prisma.user.findFirst({ where: { phone, NOT: { id } } });
    if (dup) throw Object.assign(new Error("Số điện thoại đã tồn tại"), { statusCode: 400 });
  }

  const role = body.role !== undefined ? parseRole(body.role) : existing.role;
  const status = body.status !== undefined ? parseStatus(body.status) : existing.status;
  const email =
    body.email !== undefined
      ? body.email
        ? String(body.email).trim() || null
        : null
      : existing.email;
  await assertEmailFree(email, id);

  return prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: { name, phone, email, role, status },
    });

    if (role === UserRole.DRIVER) {
      const zaloPhone =
        body.zaloPhone !== undefined
          ? body.zaloPhone
            ? assertVnPhone(String(body.zaloPhone))
            : null
          : undefined;
      let runFields: Partial<DriverRunFields> & { routeId?: null } = {};
      if (body.runDirection !== undefined) {
        runFields = await driverRunFieldsFromBody(body);
      }
      const driverData: Record<string, unknown> = {
        name,
        phone,
        ...(zaloPhone !== undefined ? { zaloPhone } : {}),
        ...(body.driverStatus !== undefined ? { status: String(body.driverStatus) } : {}),
        ...(runFields.runDirection !== undefined
          ? { ...runFields, routeId: null }
          : {}),
        ...(runFields.runDirection === undefined && body.location !== undefined
          ? { location: body.location || null }
          : {}),
        ...(runFields.runDirection === undefined && body.direction !== undefined
          ? { direction: body.direction || null }
          : {}),
        ...(body.seatsFree !== undefined ? { seatsFree: Number(body.seatsFree) } : {}),
        ...(body.note !== undefined ? { note: body.note || null } : {}),
      };

      if (existing.driver) {
        await tx.driver.update({ where: { id: existing.driver.id }, data: driverData });
      } else {
        const runFieldsNew = await driverRunFieldsFromBody(body);
        await tx.driver.create({
          data: {
            userId: id,
            name,
            phone,
            zaloPhone: (zaloPhone as string | null) ?? null,
            status: String(body.driverStatus || "Rảnh"),
            location: runFieldsNew.location ?? (body.location ? String(body.location) : null),
            direction: runFieldsNew.direction ?? (body.direction ? String(body.direction) : null),
            routeId: null,
            runDirection: runFieldsNew.runDirection ?? null,
            seatsFree: Number(body.seatsFree ?? 0),
            note: body.note ? String(body.note) : null,
          },
        });
      }
    }

    if (role === UserRole.CUSTOMER) {
      const zaloPhone =
        body.zaloPhone !== undefined
          ? body.zaloPhone
            ? assertVnPhone(String(body.zaloPhone))
            : null
          : undefined;
      const customerData: Record<string, unknown> = {
        name,
        phone,
        ...(zaloPhone !== undefined ? { zaloPhone } : {}),
        ...(body.note !== undefined ? { note: body.note || null } : {}),
      };

      if (existing.customer) {
        await tx.customer.update({ where: { id: existing.customer.id }, data: customerData });
      } else {
        await tx.customer.create({
          data: {
            userId: id,
            name,
            phone,
            zaloPhone: (zaloPhone as string | null) ?? null,
            note: body.note ? String(body.note) : null,
          },
        });
      }
    }

    return tx.user.findUnique({ where: { id }, include: userInclude });
  });
}
