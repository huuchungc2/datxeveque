import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const phone = "0900000000";
const password = "admin123";

const u = await prisma.user.findUnique({ where: { phone } });
if (!u) {
  console.log("NO_USER", phone);
  process.exit(1);
}
console.log("user", { id: u.id, status: u.status, role: u.role });
console.log("hash", u.passwordHash.slice(0, 20) + "...", "len", u.passwordHash.length);
console.log("isBcrypt", /^\$2[aby]\$/.test(u.passwordHash));
console.log("bcrypt ok", await bcrypt.compare(password, u.passwordHash));
console.log("plain ok", u.passwordHash === password);

await prisma.$disconnect();
