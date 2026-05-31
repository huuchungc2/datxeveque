# Ghi chú logic điều phối — tổng hợp từ hội thoại + hiện trạng code

Tài liệu này ghi **logic đang chạy** (cập nhật khi sửa dispatch). Spec gốc: `04_DISPATCH_FLOW_SPEC.md`, tiền/ghế: `DISPATCH_SETTLEMENT_LOGIC.md`, gửi hàng: `CAP_NHAT_LOGIC_GUI_HANG_KHONG_TINH_GHE.md`.

---

## 1. Khái niệm cốt lõi

| Khái niệm | Ý nghĩa |
|-----------|---------|
| **Booking (đơn)** | Khách đặt; **còn chờ điều phối** khi `status` ∈ nhóm chờ **và** còn ghế chưa gán (`dispatchSeatRemaining > 0`) |
| **Trip (chuyến)** | Xe/tuyến/giờ đi; `bookedSeats`, `availableSeats` |
| **TripBooking** | Liên kết đơn ↔ chuyến; có **`seat_count`** = số ghế của đơn gán **trên chuyến đó** |
| **Gợi ý** | Đề xuất — chưa ghi DB cho đến khi admin **Xác nhận** |
| **Tài xế** | Gắn **trip**, không gắn trực tiếp booking |

**Một đơn nhiều ghế** → có thể nằm trên **nhiều chuyến** (nhiều dòng `trip_bookings` khác `trip_id`, cùng `booking_id`). Mỗi lần gán chỉ lấy `min(ghế còn trên đơn, ghế trống chuyến/xe)`.

---

## 2. Gán ghế từng phần (đã code — 2026-05-29)

### Khi nào áp dụng

- Đơn chở khách: `passengerCount` = tổng ghế trên đơn.
- Đơn **10 ghế**, chuyến còn **3 ghế** → lần 1 gán **3**, đơn còn **7** trong cột ①; gán tiếp chuyến khác đến hết.
- **Không** bắt admin tách đơn thành nhiều booking trong DB (khác spec “tách booking nâng cao” — chưa làm).

### Công thức

```txt
bookingSeatUnits(booking)     = passengerCount (xe khách) | 1 (CARGO/MARKET — 1 đơn)
bookingAssignedSeatUnits      = SUM(trip_bookings.seat_count) của đơn
bookingRemainingSeatUnits     = bookingSeatUnits - assigned

Mỗi lần gán:
  seatsToAssign = min(remaining, trip.availableSeats [, seatCounts[id] nếu client gửi])
```

### Trạng thái đơn sau gán

| Tình huống | `booking.status` |
|------------|------------------|
| Còn ghế chưa gán | `WAITING_DISPATCH` (vẫn trong hàng chờ điều phối) |
| Đã gán hết ghế | `ASSIGNED` (+ `driverRideStatus` / `driverCargoStatus` nếu trống) |

### Tiền / HH trên chuyến

- Mỗi lần gán: `rollupBookingFinancialsPortion(booking, seatsToAssign, bookingSeatUnits)` — chia tỷ lệ `seatsToAssign / tổng ghế đơn`.
- Chốt chuyến (`tripComplete.ts`): cộng tiền theo **từng** `trip_bookings.seat_count`, không nhân full đơn.

### Chống trùng

- Unique `(trip_id, booking_id)`: **một dòng** đơn ↔ chuyến; gán lại cùng chuyến → skip.
- Gán **chuyến khác** khi còn ghế → tạo dòng `trip_bookings` mới.

### API

| Endpoint | Ghi chú |
|----------|---------|
| `GET /api/admin/dispatch` | Đơn chờ = filter `bookingNeedsDispatch`; trả `dispatchSeatTotal/Assigned/Remaining` |
| `POST /api/admin/dispatch/apply` | Body có thể có `seatCounts: { "bookingId": n }` |
| `POST /api/admin/trips/:id/add-bookings` | `{ bookingIds, seatCounts? }` — không gửi thì auto `min(remaining, avail)` |
| `GET /api/admin/dispatch/bookings/:id/options` | Options theo **ghế còn** đơn |
| `POST /api/admin/dispatch/bookings/:id/confirm` | Gửi `seatsAssignable` từ option đã chọn |

### UI (`AdminDispatch.tsx`)

- Chọn đơn → cột ② + dropdown chuyến: **≥ 1 ghế**, **cùng `routeId` đơn** + cùng chiều. Cột ③ / tài xế: **cùng chiều** (`runDirection`), **mọi tuyến** (không lọc `driver.routeId`).
- Nút: `Gán 3/10 ghế lần này`; thẻ đơn: `7/10 ghế còn gán`.
- `computeAssignSeatCounts()` (frontend) và `buildDispatchOptionsForSuggestion()` (backend) đồng bộ logic chia ghế.

### DB

- Cột `trip_bookings.seat_count` (migration `trip_bookings_seat_count` trong `backend/scripts/migrate.mjs`).
- Backfill: bản ghi cũ = `passenger_count` (hoặc 1 với CARGO/MARKET).

---

## 3. Gợi ý tự động

- **1 pack** (gom tuyến/đầu đi/loại/ngày) → **1 thẻ gợi ý**; không có tuyến → 0 gợi ý.
- Loại: `assign_trip` (chuyến `COLLECTING`/`READY`) | `new_trip` (tạo chuyến + tài xế rảnh).
- **`seatsNeeded`** trên gợi ý = tổng **ghế còn gán** trong pack (`bookingRemainingSeatUnits`), không phải tổng `passengerCount` gốc nếu đã gán một phần.
- `pickTrip`: chuyến còn `availableSeats > 0` (không cần ≥ full pack); ưu tiên chuyến gán **đủ** pack một lần, rồi ít dư ghế.
- `packBookingsByVehicleCapacity`: đơn 1 ghế > cap fleet → pack riêng; gán nhiều lần qua UI/API.

Backend: `dispatchSuggestions.ts` · Apply: `dispatchApply.ts` · Options dropdown: `dispatchOptions.ts`

---

## 4. Dropdown phương án (`dispatchOptions`)

Mỗi gợi ý có `dispatchOptions[]` (chỉ **eligible** trên UI):

1. **`existing_trip`** — chuyến đang gom (`trip:ID`)
2. **`available_driver`** — tạo chuyến mới (`driver:ID`)

Trường quan trọng:

- `seatsNeeded` — ghế còn cần gán (cả nhóm đơn trong gợi ý)
- `seatsAssignable` — ghế gán **lần này** nếu chọn option (`min(seatsNeeded, avail xe/chuyến)`)
- Label ví dụ: `gán 3/10 ghế lần này`

Xác nhận gợi ý → `POST /dispatch/apply` kèm `seatCounts` build từ `seatsAssignable`.

---

## 5. Điều phối thủ công (3 cột)

| Cột | Nguồn | Khi đã chọn đơn |
|-----|--------|-----------------|
| ① Đơn chưa gán | `unassignedBookings` | Checkbox; hiện `dispatchSeatRemaining` |
| ② Chuyến | `collectingTrips` | Mọi chuyến còn ≥1 ghế, **cùng tuyến đơn** + chiều |
| ③ Tài xế rảnh | `availableDrivers` | Mọi tài có xe, **đúng chiều** (mọi tuyến); tạo chuyến gán phần theo `seats` xe |

Gán: `POST /trips/:id/add-bookings` với `seatCounts` tính từ `computeAssignSeatCounts`.

---

## 6. Gom đơn trước gợi ý

1. `routeId` (bắt buộc)
2. Đầu đi (SG / Tỉnh — `routeEndpoints.ts`)
3. `type` (không trộn loại dịch vụ)
4. Ngày `scheduledAt` — ≥2 đơn cùng giờ → bucket giờ; ít hơn → gom cả ngày

Sau đó `packBookingsByVehicleCapacity` theo xe lớn nhất trong fleet.

---

## 7. Chuyến / tài xế được phép nhận thêm

| Trạng thái chuyến | Gợi ý / gán thêm? |
|-------------------|-------------------|
| `COLLECTING`, `READY` | **Có** |
| `IN_PROGRESS` | **Không** — đã chạy |
| `COMPLETED`, `CANCELLED` | **Không** |

Tài xế rảnh: `dispatchDrivers.ts` — `Rảnh`, có xe, không trip `COLLECTING`/`READY`/`IN_PROGRESS` khi **tạo chuyến mới**.

---

## 8. Gửi hàng (`CARGO`) — chưa khớp spec

**Spec** (`CAP_NHAT_LOGIC_GUI_HANG_KHONG_TINH_GHE.md`): gửi hàng không tính ghế khách.

**Code hiện tại** (`backend/src/lib/bookingSeats.ts`):

- `CARGO`/`MARKET`: `bookingSeatUnits() = 1` (một “đơn” = 1 slot), gán một lần là xong.
- Chưa tách `passengerRevenue` / `parcelRevenue` trên trip.

---

## 9. Chuyển chuyến (`bookingMoveTrip.ts`)

- Chuyển theo **`seat_count`** trên link nguồn (tiền/ghế prorate tương ứng).
- Nếu sau khi gỡ nguồn đơn còn link khác hoặc còn ghế → có thể `WAITING_DISPATCH`.

---

## 10. File code

| File | Vai trò |
|------|---------|
| `backend/src/lib/bookingSeats.ts` | `bookingSeatUnits`, `bookingRemainingSeatUnits`, `bookingNeedsDispatch` |
| `backend/src/lib/settlement.ts` | `rollupBookingFinancialsPortion` |
| `backend/src/lib/dispatchApply.ts` | `assignBookingsToTrip`, `createTripAndAssign`, `seatCounts` |
| `backend/src/lib/dispatchOptions.ts` | `buildDispatchOptionsForSuggestion`, `enrichBookingDispatchSeats` |
| `backend/src/lib/dispatchSuggestions.ts` | Gom pack, `pickTrip`, `pickDriver` |
| `backend/src/lib/dispatchDrivers.ts` | Tài xế rảnh / bận |
| `backend/src/routes/admin.ts` | `/dispatch`, `/dispatch/apply`, `/trips/:id/add-bookings` |
| `frontend/src/lib/bookingSeats.ts` | `computeAssignSeatCounts`, nhãn còn gán |
| `frontend/src/pages/AdminDispatch.tsx` | UI 3 cột + gợi ý |
| `frontend/GHI_CHU_LOGIC.md` | Tóm tắt UI điều phối |

---

## 11. Việc chưa làm (spec / sau)

- Tách booking thành nhiều đơn con + `parentBookingId` (SPEC admin 2.9).
- Gửi hàng không trừ `availableSeats` (CAP_NHAT).
- Hiển thị lịch sử “đơn X: 3 ghế chuyến A, 7 ghế chuyến B” trên admin chi tiết đơn (UI).

---

## 12. Đặt trước + gán tài xế — ghi chú nghiệp vụ (TODO triển khai)

**Hiện trạng (2026-05-31, đã fix một phần UI/API):**

| Đã xong | Nội dung |
|---------|----------|
| ✓ | `GET /admin/trips` lọc ngày bằng `parseScheduledAtDateRange` (hết lỗi chỉ thấy chuyến 00:00) |
| ✓ | `/admin/dispatch` mục **④ Đã điều phối** (`dispatchedBookings`) |
| ✓ | Tạo chuyến mới: `departureAt` = `scheduledAt` đơn (không phải ngày admin bấm gán) |

**Vấn đề nghiệp vụ còn lại:**

- Gán **tài xế** cho chuyến `COLLECTING/READY` → tài xế **bận ngay** (`getBusyDriverIds`, `driverProfileFromTrip`), **không** xét `departureAt` còn xa.
- Dispatch mặc định lọc **hôm nay** → đơn/chuyến ngày sau dễ “mất” nếu admin không mở ngày.

**Quy trình vận hành tạm (trước khi sửa code):**

1. Khách đặt trước → đơn chờ (`NEW` / `WAITING_DISPATCH`).
2. **Sớm:** admin gom đơn → **tạo chuyến chưa tài xế** (`COLLECTING`, `driverId = null`).
3. **Gần ngày đi (T-1 hoặc sáng ngày đi):** mới **gán tài xế** + chờ tài xế **Đồng ý**.
4. Màn dispatch: mở lọc **Từ hôm nay → +7 ngày** khi xử lý đơn đặt trước.

**Triển khai code đề xuất (PR tiếp theo):**

### PR1 — Nhẹ (ưu tiên)

- Dispatch + Chuyến xe: mặc định `to = hôm nay + 7 ngày` (giữ `from = hôm nay`).
- Khi gán tài xế mà `departureAt` > now + `DISPATCH_DRIVER_LOCK_HOURS` (setting, mặc định **24h**):
  - Popup cảnh báo: gán sớm sẽ khóa tài xế.
  - Nút **Chỉ gom khách** / **Gán tài xế luôn**.
- Badge chuyến: **Chưa chốt tài xế · đi {ngày}** vs **Đã chốt tài xế**.

### PR2 — Tách pre-assign vs lock (gốc)

- Field `driverLockedAt` (nullable) trên `trips`, hoặc enum chế độ trên chuyến.
- **`getBusyDriverIds` / `assertDriverAvailableForNewTrip`:** chỉ coi tài xế busy khi:
  - chuyến `IN_PROGRESS`, hoặc
  - `READY`, hoặc
  - `COLLECTING` + đã có `driverId` + (`driverLockedAt` set **hoặc** `departureAt` trong cửa sổ 24h).
- **`assignDriverToTrip`:** mặc định pre-assign (có `driverId`, **chưa** lock) nếu còn xa ngày đi; admin bấm **Chốt chuyến** → set `driverLockedAt`, lúc đó mới `driverProfileFromTrip` → `Đang chạy chuyến`.
- Ràng buộc: **một tài xế không hai chuyến cùng ngày + cùng chiều** (kể pre-assign).
- (Tuỳ chọn) Cron / job: T-24h tự set `driverLockedAt` cho chuyến đã có tài xế.

**File sửa dự kiến:** `dispatchDrivers.ts`, `dispatchApply.ts`, `driverAvailability.ts`, `AdminDispatch.tsx`, `schema.prisma` + migration, `settings` env.

---

*Cập nhật: 2026-05-31 — thêm §12 đặt trước; §11 trước 2026-05-29 chi tiết gán ghế từng phần.*
