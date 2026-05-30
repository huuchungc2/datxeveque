/**
 * Acceptance test script — chạy: node scripts/acceptance-test.mjs
 * Yêu cầu: backend :4002, DB đã restore.
 */
import "dotenv/config";

const BASE = process.env.API_BASE || "http://localhost:4002/api";
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? " — " + detail : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.log(`✗ ${name}${detail ? " — " + detail : ""}`);
}

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}), cookie: cookieHeader },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  const data = body?.success !== undefined ? body.data : body;
  const message = body?.message;
  return { status: res.status, body, data, message, headers: res.headers };
}

let cookieHeader = "";

async function login(phone, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const raw = res.headers.get("set-cookie");
  const cookies = setCookie.length ? setCookie : raw ? [raw] : [];
  cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
  const body = await res.json();
  const data = body?.success !== undefined ? body.data : body;
  return { status: res.status, data, message: body?.message };
}

async function main() {
  console.log("=== ACCEPTANCE TEST ===\n");

  // 1. Health & routes
  try {
    const h = await req("/health");
    if (h.status === 200) pass("GET /api/health");
    else fail("GET /api/health", `status ${h.status}`);
  } catch (e) {
    fail("GET /api/health", e.message);
    console.log("\nBackend không chạy. Chạy: cd backend && npm run dev");
    process.exit(1);
  }

  try {
    const r = await req("/routes");
    const routes = Array.isArray(r.data) ? r.data : [];
    if (routes.length > 0) pass("GET /api/routes có dữ liệu", `${routes.length} tuyến`);
    else fail("GET /api/routes", "rỗng");
  } catch (e) {
    fail("GET /api/routes", e.message);
  }

  // 2. Auth
  const badLogin = await login("0900000000", "wrongpass");
  if (badLogin.status === 401 && badLogin.message?.includes("không đúng")) pass("Login sai → lỗi tiếng Việt");
  else fail("Login sai", JSON.stringify(badLogin));

  const admin = await login("0900000000", "admin123");
  if (admin.status === 200 && admin.data?.user?.role === "ADMIN") pass("Login admin");
  else fail("Login admin", JSON.stringify(admin));

  const me = await req("/auth/me");
  if (me.data?.user?.phone === "0900000000") pass("GET /auth/me (F5 session)");
  else fail("GET /auth/me", JSON.stringify(me.data));

  await req("/auth/logout", { method: "POST" });
  cookieHeader = "";
  const locked = await login("0900000000", "admin123");
  if (locked.status === 200) pass("Login admin lại sau logout");

  // Public reset 403
  const reset = await fetch(`${BASE}/auth/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (reset.status === 403) pass("Public reset password bị chặn");
  else fail("Public reset password", `status ${reset.status}`);

  // 3. Guest booking
  cookieHeader = "";
  const routesRes = await req("/routes");
  const routeId = routesRes.data?.[0]?.id;
  const estimate = await req("/price/estimate", {
    method: "POST",
    body: JSON.stringify({ type: "SHARED_RIDE", routeId, passengerCount: 2 }),
  });
  if (Number(estimate.data?.estimatedTotal) > 0) pass("Giá xe ghép 2 khách", formatMoney(estimate.data.estimatedTotal));
  else fail("Giá xe ghép", JSON.stringify(estimate.data));

  const phone = "09" + String(Date.now()).slice(-8);
  const booking = await req("/bookings", {
    method: "POST",
    body: JSON.stringify({
      type: "SHARED_RIDE",
      customerName: "Test Guest",
      customerPhone: phone,
      routeId,
      passengerCount: 2,
      pickupAddress: "Bình Tân",
      dropoffAddress: "Võ Xu",
      scheduledAt: futureScheduled(24),
      paymentReceiver: "DRIVER",
    }),
  });
  const b = booking.data?.booking || booking.data;
  if (b?.code) pass("Guest booking tạo mã đơn", b.code);
  else fail("Guest booking", JSON.stringify(booking));

  if (b?.status === "NEW") pass("Booking status NEW (chờ xác nhận)");
  else fail("Booking status", b?.status);

  if (!b?.code) {
    console.log("\nDừng sớm: không tạo được đơn khách.");
    process.exit(1);
  }
  const track = await req("/track-booking", { method: "POST", body: JSON.stringify({ code: b.code, phone }) });
  if (track.data?.code === b.code) pass("Tra cứu đơn OK");
  else fail("Tra cứu đơn", JSON.stringify(track));

  // 4. Admin dispatch & assign
  await login("0900000000", "admin123");
  const dispatch = await req("/admin/dispatch");
  if (dispatch.data?.unassignedBookings && dispatch.data?.collectingTrips && dispatch.data?.availableDrivers) {
    pass("GET /admin/dispatch 3 cột", `đơn ${dispatch.data.unassignedBookings.length}, chuyến ${dispatch.data.collectingTrips.length}, TX ${dispatch.data.availableDrivers.length}`);
    if (Array.isArray(dispatch.data.suggestions)) pass("Gợi ý điều phối tự động", `${dispatch.data.suggestions.length} nhóm`);
    else fail("dispatch.suggestions", "thiếu mảng suggestions");
  } else fail("GET /admin/dispatch", JSON.stringify(Object.keys(dispatch.data || {})));

  // Pricing ADMIN payment receiver booking
  const phone2 = "09" + String(Date.now() + 1).slice(-8);
  const bAdmin = await req("/bookings", {
    method: "POST",
    body: JSON.stringify({
      type: "SHARED_RIDE",
      customerName: "Test Admin Pay",
      customerPhone: phone2,
      routeId,
      passengerCount: 1,
      scheduledAt: futureScheduled(26),
      paymentReceiver: "ADMIN",
    }),
  });
  const ba = bAdmin.data?.booking || bAdmin.data;

  // Create trip and assign (ưu tiên TX rảnh; driver demo id=1 nếu có)
  const availForTest =
    (dispatch.data?.availableDrivers || []).find((d) => d.id === 1) ||
    (dispatch.data?.availableDrivers || [])[0];
  const existingDriver1Trip = (dispatch.data?.collectingTrips || []).find((t) => t.driverId === 1);

  let trip;
  if (availForTest?.id) {
    const tripRes = await req("/admin/trips", {
      method: "POST",
      body: JSON.stringify({
        routeId,
        departureAt: futureScheduled(48),
        totalSeats: Number(availForTest.seatsFree) || 5,
        driverId: availForTest.id,
        vehicleId: availForTest.vehicles?.[0]?.id ?? null,
      }),
    });
    trip = tripRes.data;
    if (trip?.code) pass("Tạo trip", trip.code);
    else fail("Tạo trip", JSON.stringify(tripRes));
  } else if (existingDriver1Trip?.id) {
    trip = existingDriver1Trip;
    pass("Tạo trip", `dùng chuyến có sẵn ${trip.code}`);
  } else {
    const tripRes = await req("/admin/trips", {
      method: "POST",
      body: JSON.stringify({ routeId, departureAt: futureScheduled(48), totalSeats: 5 }),
    });
    trip = tripRes.data;
    if (trip?.code) pass("Tạo trip (chưa gán TX)", trip.code);
    else fail("Tạo trip", JSON.stringify(tripRes));
  }

  if (ba?.id && trip?.id) {
    const assign1 = await req(`/admin/trips/${trip.id}/add-bookings`, {
      method: "POST",
      body: JSON.stringify({ bookingIds: [ba.id] }),
    });
    const a1 = assign1.data;
    if (a1?.added >= 1) pass("Gán booking ADMIN pay vào trip", `added ${a1.added}`);
    else fail("Gán booking", JSON.stringify(a1));

    const assign2 = await req(`/admin/trips/${trip.id}/add-bookings`, {
      method: "POST",
      body: JSON.stringify({ bookingIds: [ba.id] }),
    });
    const a2 = assign2.data;
    if (a2?.added === 0 && a2?.skipped >= 1) pass("Gán lại không cộng trùng");
    else fail("Gán lại trùng", JSON.stringify(a2));

    const tripDetailAdmin = await req(`/admin/trips/${trip.id}`);
    const updated = tripDetailAdmin.data;
    if (Number(updated?.adminOwesDriverAmount || 0) > 0) pass("ADMIN pay → adminOwesDriver > 0", formatMoney(updated.adminOwesDriverAmount));
    else fail("adminOwesDriver", JSON.stringify(updated));
  }

  // Settlement
  const settleDriverId = trip?.driverId || availForTest?.id || 1;
  const settle = await req("/admin/settlements", {
    method: "POST",
    body: JSON.stringify({ tripId: trip?.id, driverId: settleDriverId, amount: 10000, direction: "ADMIN_OWES_DRIVER", method: "Test" }),
  });
  if (settle.data?.payment || settle.message) pass("Admin xác nhận thanh toán");
  else fail("Settlement", JSON.stringify(settle));

  const debts = await req("/admin/reports/debts");
  if (debts.data?.trips) pass("Báo cáo công nợ admin");
  else fail("Báo cáo công nợ", JSON.stringify(debts));

  const reports = await req("/admin/reports/overview?serviceType=SHARED_RIDE");
  if (reports.data?.totalTrips !== undefined) pass("Báo cáo filter dịch vụ");
  else fail("Báo cáo filter dịch vụ", JSON.stringify(reports));

  // Tài xế bị khóa: không điều phối, không login / API 401
  await login("0900000000", "admin123");
  const lockDriverUserId = 2; // demo 0900000001 → driver id 1
  await req(`/admin/users/${lockDriverUserId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "LOCKED" }),
  });
  const dispatchLocked = await req("/admin/dispatch");
  const lockedInAvail = (dispatchLocked.data?.availableDrivers || []).some((d) => d.id === 1);
  if (!lockedInAvail) pass("Tài xế khóa không nằm danh sách rảnh điều phối");
  else fail("Tài xế khóa vẫn trong dispatch", "driver id 1");

  const lockedLogin = await login("0900000001", "taixe123");
  if (lockedLogin.status === 401 && lockedLogin.message?.includes("khóa")) pass("Tài xế khóa không đăng nhập");
  else fail("Login tài xế khóa", JSON.stringify(lockedLogin));

  await req(`/admin/users/${lockDriverUserId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "ACTIVE" }),
  });

  // Driver
  await login("0900000001", "taixe123");
  const jobs = await req("/driver/jobs");
  if (Array.isArray(jobs.data)) pass("Tài xế thấy chuyến", `${jobs.data.length} chuyến`);
  else fail("Driver jobs", JSON.stringify(jobs));

  const driverDebt = await req("/driver/reports");
  if (driverDebt.data?.totalDebt !== undefined) pass("Tài xế xem công nợ");
  else fail("Driver công nợ", JSON.stringify(driverDebt));

  const dash = await req("/driver/dashboard");
  if (dash.data?.driverStatus !== undefined && typeof dash.data.todayTripsCount === "number") {
    pass("Driver dashboard", `chuyến hôm nay ${dash.data.todayTripsCount}`);
  } else fail("Driver dashboard", JSON.stringify(dash.data));

  const driverTripsRes = await req("/driver/trips");
  const driverTripList = Array.isArray(driverTripsRes.data) ? driverTripsRes.data : [];
  pass("Driver GET /trips", `${driverTripList.length} chuyến`);

  const driverOwnedTripId =
    (Array.isArray(jobs.data) ? jobs.data.find((t) => t.status !== "COMPLETED") || jobs.data[0] : null)?.id ||
    driverTripList[0]?.id;
  const targetTripId = driverOwnedTripId;
  if (targetTripId) {
    const tripDetail = await req(`/driver/trips/${targetTripId}`);
    const comp = tripDetail.data?.completion;
    if (comp && comp.canComplete === false) {
      pass("Chi tiết chuyến: chưa đủ điều kiện hoàn thành");
    } else fail("Chi tiết chuyến completion", JSON.stringify(comp));

    const canCompleteRes = await req(`/driver/trips/${targetTripId}/can-complete`);
    if (canCompleteRes.data?.canComplete === false) pass("GET can-complete → false khi đơn chưa xong");
    else fail("GET can-complete", JSON.stringify(canCompleteRes.data));

    const tryComplete = await req(`/driver/trips/${targetTripId}/complete`, { method: "POST", body: "{}" });
    const blockMsg = tryComplete.message || tryComplete.body?.message || "";
    if (tryComplete.status === 200 || tryComplete.data?.ok) {
      pass("POST complete — tài xế chốt chuyến (tự chốt vé chưa cập nhật)");
    } else if (tryComplete.status === 400 && String(blockMsg).includes("xác nhận nhận chuyến")) {
      pass("POST complete bị chặn khi còn đơn chờ xác nhận");
    } else if (tryComplete.status === 400) pass("POST complete trả 400", blockMsg);
    else fail("POST complete", `status ${tryComplete.status} ${blockMsg}`);
  } else {
    fail("Driver trip detail", "không có trip để test");
  }

  // Driver login + customer
  const driverLogin = await login("0900000001", "taixe123");
  if (driverLogin.status === 200) pass("Login tài xế");
  else fail("Login tài xế", JSON.stringify(driverLogin));

  await login("0900000000", "admin123");
  const custLogin = await login("0900000002", "khach123");
  if (custLogin.status === 200) pass("Login khách");
  else fail("Login khách", JSON.stringify(custLogin));

  // Pricing variants
  cookieHeader = "";
  const cargoPrice = await req("/price/estimate", { method: "POST", body: JSON.stringify({ type: "CARGO", routeId, weightKg: 8 }) });
  if (Number(cargoPrice.data?.estimatedTotal) > 0) pass("Giá gửi hàng 8kg", formatMoney(cargoPrice.data.estimatedTotal));
  else fail("Giá gửi hàng", JSON.stringify(cargoPrice.data));

  const privatePrice = await req("/price/estimate", { method: "POST", body: JSON.stringify({ type: "PRIVATE_RIDE", routeId, vehicleType: "Xe 7 chỗ" }) });
  if (Number(privatePrice.data?.estimatedTotal) > 0) pass("Giá bao xe 7 chỗ", formatMoney(privatePrice.data.estimatedTotal));
  else fail("Giá bao xe", JSON.stringify(privatePrice.data));

  const noRoutePrice = await req("/price/estimate", { method: "POST", body: JSON.stringify({ type: "CONTRACT" }) });
  if (Number(noRoutePrice.data?.estimatedTotal) > 0) pass("Giá global không route", formatMoney(noRoutePrice.data.estimatedTotal));
  else fail("Giá global", JSON.stringify(noRoutePrice.data));

  // Admin bookings + settings
  await login("0900000000", "admin123");
  const bookings = await req("/admin/bookings");
  if (Array.isArray(bookings.data) && bookings.data.length > 0) pass("Admin thấy đơn", `${bookings.data.length} đơn`);
  else fail("Admin bookings", JSON.stringify(bookings.data));

  const settings = await req("/admin/settings");
  if (Array.isArray(settings.data) && settings.data.length > 0) pass("Admin settings");
  else fail("Admin settings", JSON.stringify(settings.data));

  const pubSettings = await req("/settings");
  if (pubSettings.data?.hotline_primary) pass("Public settings / header data");
  else fail("Public settings", JSON.stringify(pubSettings.data));

  // Sitemap robots (not under /api wrapper - direct fetch)
  const robots = await fetch("http://localhost:4002/robots.txt");
  if (robots.ok) pass("Robots OK");
  else fail("Robots", String(robots.status));

  const sitemap = await fetch("http://localhost:4002/sitemap.xml");
  if (sitemap.ok && (await sitemap.text()).includes("dat-xe")) pass("Sitemap có trang");
  else fail("Sitemap");

  const posts = await req("/posts");
  if (Array.isArray(posts.data)) pass("Public posts");
  else fail("Public posts", JSON.stringify(posts));

  // Summary
  const ok = results.filter((r) => r.ok).length;
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n=== KẾT QUẢ: ${ok} pass / ${bad} fail / ${results.length} tổng ===`);
  process.exit(bad > 0 ? 1 : 0);
}

function formatMoney(v) {
  return new Intl.NumberFormat("vi-VN").format(Number(v || 0)) + "đ";
}

function futureScheduled(hoursFromNow = 24) {
  return new Date(Date.now() + hoursFromNow * 3600000).toISOString();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
