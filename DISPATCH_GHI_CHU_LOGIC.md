# Ghi chú logic điều phối — tổng hợp từ hội thoại + hiện trạng code

Tài liệu này ghi lại **logic đang chạy**, **khoảng trống so với spec gửi hàng**, và **hướng sửa dropdown** admin đã thống nhất. Spec sản phẩm gốc: `04_DISPATCH_FLOW_SPEC.md`, gom tiền/ghế: `DISPATCH_SETTLEMENT_LOGIC.md`, gửi hàng: `CAP_NHAT_LOGIC_GUI_HANG_KHONG_TINH_GHE.md`.

---

## 1. Khái niệm cốt lõi

| Khái niệm | Ý nghĩa |
|-----------|---------|
| **Booking (đơn)** | Khách đặt; chưa gán khi `tripBookings` rỗng và status thuộc nhóm chờ điều phối |
| **Trip (chuyến)** | Xe/tuyến/giờ đi; có `driverId`, `bookedSeats`, `availableSeats` |
| **Gợi ý** | Chỉ là **đề xuất** — **chưa tạo chuyến** cho đến khi admin bấm Xác nhận |
| **Tài xế** | Gắn với **trip**, không gắn trực tiếp với booking |

**1 đơn tại một thời điểm** → thường chỉ thuộc **1 chuyến** (flow UI đang vận hành theo hướng đó).

---

## 2. Gợi ý tự động — bao nhiêu gợi ý cho 1 đơn?

- **1 nhóm đơn** (đã gom theo tuyến/ngày/loại) → **tối đa 1 thẻ gợi ý** trên UI.
- **0 gợi ý** nếu đơn **không có `routeId`**.
- Loại gợi ý:
  - **`assign_trip`**: gán vào **chuyến đang gom** (`COLLECTING` / `READY` trong DB; spec gọi `OPEN` / `SCHEDULED`).
  - **`new_trip`**: **tạo chuyến mới** (+ có thể gán 1 tài xế rảnh) khi không có chuyến phù hợp.

Backend: `buildDispatchSuggestions()` — `backend/src/lib/dispatchSuggestions.ts`  
Áp dụng: `applyDispatchSuggestion()` — `backend/src/lib/dispatchApply.ts`  
UI: `frontend/src/pages/AdminDispatch.tsx`

---

## 3. Tiêu chí gom đơn trước khi gợi ý

Gom nhóm booking chờ theo:

1. **`routeId`** (bắt buộc)
2. **Đầu đi** (SG vs Đức Linh/Tánh Linh — suy từ pickup/drop/direction)
3. **`type`** (loại dịch vụ: `SHARED_RIDE`, `CARGO`, …)
4. **Ngày** (`scheduledAt`)

Trong cùng ngày:

- Nếu **≥ 2 đơn cùng giờ** → gom theo **bucket giờ**
- Nếu < 2 đơn/giờ → gom **cả ngày**

Sau đó **tách pack** theo sức chứa xe lớn nhất trong fleet (`packBookingsByVehicleCapacity`).

**`seatsNeeded`** = tổng `bookingSeatUnits()` của các đơn trong pack.

---

## 4. Chọn chuyến mặc định (`assign_trip`) — `pickTrip()`

Chỉ xét trip:

- Cùng **`routeId`**
- **`availableSeats >= seatsNeeded`**
- **`status` ∈ `COLLECTING`, `READY`**

Nếu nhiều trip đạt, xếp hạng (ưu tiên trước → sau):

1. **Ít dư ghế nhất**: `availableSeats - seatsNeeded` nhỏ nhất (vd. còn đúng 2 ghế cho đơn 2 khách → dư 0, ưu tiên hơn chuyến còn 3 ghế → dư 1)
2. Trip **đã có `driverId`**
3. Tài xế **đúng đầu chạy** (location SG/Tỉnh)
4. **`departureAt`** gần giờ đi gợi ý của nhóm đơn nhất

→ Backend chọn **1 trip “best fit”** làm mặc định (`s.tripId`).

---

## 5. Dropdown “Chuyến đích” trên UI (hiện tại)

**Không phải** “gợi ý cho tất cả tài xế rảnh”.

- Dropdown chỉ liệt kê **`collectingTrips`** cùng tuyến và **`availableSeats >= seatsNeeded`** (`tripsForRoute` trong `AdminDispatch.tsx`).
- Admin **đổi chuyến** trong dropdown → bấm **Xác nhận** → gửi `tripId` đã chọn lên `POST /admin/dispatch/apply` → **vẫn được** (backend check ghế lại).
- Trip gợi ý mặc định nhưng không nằm trong list (edge case) vẫn được **inject** vào đầu list.

**Ví dụ đã bàn:** cần **2 ghế**, tuyến SG–Đức Linh:

| Nguồn | Còn ghế | Trong dropdown gợi ý `assign_trip`? |
|-------|---------|-------------------------------------|
| Chuyến tài xế **A** (đang gom) | 3 | Có |
| Chuyến tài xế **B** (đang gom) | 1 | **Không** (1 < 2) |
| Tài xế **C** rảnh | 4 (trên xe, chưa có trip) | **Không** (không phải trip) |

Mặc định: thường chuyến **khít ghế nhất**; nếu chỉ A đủ → gợi ý A, sau gán còn 1 ghế.

**Muốn gán cho tài xế rảnh C (hiện tại):**

1. **Điều phối thủ công** → tick đơn → cột ③ → **“Tạo chuyến”** trên C, hoặc  
2. Gán vào trip rồi **`PATCH /admin/trips/:id`** đổi `driverId`.

---

## 6. Gợi ý `new_trip` + tài xế rảnh

Khi **không có** trip `COLLECTING/READY` đủ ghế:

- 1 gợi ý **`new_trip`**
- Backend **`pickDriver()`** chọn **một** tài xế rảnh “best fit” (đủ ghế, đúng hướng, xe nhỏ vừa đủ…)
- UI có dropdown **tài xế** (lọc `driverFitsSeats`) — **không** liệt kê hết mọi tài xế nếu không đủ ghế

Tài xế rảnh: `status = "Rảnh"`, `seatsFree > 0`, **không** có trip `COLLECTING/READY/IN_PROGRESS` (`dispatchDrivers.ts`).

---

## 7. Khi admin bấm Xác nhận — update hay tạo mới?

| Loại | Hành vi |
|------|---------|
| **`assign_trip`** | **Không** tạo trip mới. Tạo `TripBooking`, update `bookedSeats`/`availableSeats`, tiền trip, `booking.status = ASSIGNED` |
| **`new_trip`** | **`prisma.trip.create`** rồi gán booking vào trip mới |

**Đổi tài xế sau khi đã gán:** `PATCH /api/admin/trips/:id` (`driverId`, `vehicleId`) — đơn trên chuyến “đi theo” tài xế mới. **Chưa có** API “gỡ đơn khỏi chuyến” / chuyển đơn sang trip khác một bước.

**Chống gán trùng:** cùng `tripId + bookingId` → skip, không cộng ghế/tiền lần 2 (`assignBookingsToTrip`).

---

## 8. Tính ghế hiện tại vs spec gửi hàng

**Spec** (`CAP_NHAT_LOGIC_GUI_HANG_KHONG_TINH_GHE.md`):

- `PARCEL` / gửi hàng (**`CARGO`** trong DB): **không tính ghế**
- Gợi ý gửi hàng **không bắt buộc** còn ghế khách
- Gán parcel: **không** tăng `bookedSeats`, **không** giảm `availableSeats`
- Tách doanh thu khách / hàng

**Code hiện tại** (`bookingSeats.ts`):

- `CARGO` / `MARKET`: không nhập `passengerCount` nhưng **`bookingSeatUnits()` = 1** → vẫn **trừ 1 ghế** khi gán
- Gợi ý & gán đều check `availableSeats >= seatsNeeded`
- Trip không tách `passengerRevenue` / `parcelRevenue`

→ **Chưa khớp spec gửi hàng**; cần sửa riêng khi triển khai `CAP_NHAT_...`.

---

## 9. Hướng sửa đã nêu — dropdown thống nhất `dispatchOptions`

**Mục tiêu (admin yêu cầu, chưa code xong):**

Mỗi gợi ý / booking cần dropdown **một list chung**, gồm:

1. **Chuyến đang gom** (existing trip) — đủ/không đủ điều kiện  
2. **Tài xế rảnh** (tạo chuyến mới khi chọn) — đủ/không đủ điều kiện  
3. Mục **không đủ điều kiện**: **disabled**, xuống cuối, có **lý do**

Admin chọn **1 option** → **Xác nhận điều phối** → backend tự:

- `existing_trip` → gán vào trip (`add-bookings` / `assign_trip`)
- `new_driver` → tạo trip + gán (`new_trip`)

**Điều kiện dự kiến (chở khách):**

```txt
eligible = trip.availableSeats >= booking.requiredSeats
         = driver.vehicle.seats >= requiredSeats (và seatsFree / không bận)
```

**Parcel (`CARGO`):** theo spec — **không** check ghế (cần chốt khi implement).

**Mapping trạng thái trip:** spec `OPEN/SCHEDULED` ≈ code `COLLECTING/READY`; `IN_PROGRESS/COMPLETED/CANCELLED` không gợi ý nhận thêm (trừ khi nghiệp vụ cho phép hàng trên chuyến đang chạy).

---

## 10. File code liên quan

| File | Vai trò |
|------|---------|
| `backend/src/lib/dispatchSuggestions.ts` | Gom đơn, `pickTrip`, `pickDriver`, build suggestions |
| `backend/src/lib/dispatchApply.ts` | Gán / tạo trip |
| `backend/src/lib/dispatchDrivers.ts` | Tài xế rảnh / bận |
| `backend/src/lib/bookingSeats.ts` | `bookingSeatUnits`, CARGO=1 chỗ |
| `backend/src/routes/admin.ts` | `GET /admin/dispatch`, `POST /dispatch/apply` |
| `frontend/src/pages/AdminDispatch.tsx` | UI gợi ý + dropdown override + thủ công 3 cột |

---

## 11. Đã chốt nghiệp vụ (admin, 2026-05-27)

### Dropdown / gợi ý theo đơn hay theo nhóm?

- **Hiện tại:** theo **thẻ gợi ý** (gom nhiều đơn trong 1 pack). Chưa có màn “mở 1 booking → list riêng”.

### Chuyến nào được đưa vào phương án điều phối?

| Trạng thái chuyến | Nhãn UI | Được gợi ý / dropdown? |
|-------------------|---------|-------------------------|
| `COLLECTING` | Đang gom khách | **Có** — chưa chạy |
| `READY` | Sẵn sàng chạy | **Có** — chưa chạy |
| `IN_PROGRESS` | Đang chạy | **Không** — đã chạy, **bỏ qua hẳn** |
| `COMPLETED` / `CANCELLED` | Xong / Hủy | **Không** |

- **Admin không được cố gán** vào chuyến `IN_PROGRESS` (không có option, không override).
- Rule này áp dụng **cả chở khách và gửi hàng** — không tách ngoại lệ “chuyến đang chạy vẫn nhận hàng”.

### Gửi hàng (`CARGO`) — ghế vs trạng thái chuyến

- **Trạng thái chuyến:** như bảng trên (chỉ chưa chạy).
- **Ghế:** theo spec `CAP_NHAT_LOGIC_GUI_HANG_KHONG_TINH_GHE.md` — gửi hàng **không tính ghế** (code hiện tại vẫn tính 1 ghế → cần sửa riêng).
- Chuyến **FULL ghế khách** nhưng `COLLECTING`/`READY`: vẫn có thể là phương án gửi hàng sau khi sửa logic ghế (không liên quan `IN_PROGRESS`).

### `IN_PROGRESS` là gì?

Tài xế đã bấm **Bắt đầu** — chuyến **đang chạy trên đường**. Không còn coi là “ở đầu tuyến / đang gom” để nhận thêm đơn qua điều phối.

---

*Cập nhật: 2026-05-27 — từ hội thoại Cursor + đọc code hiện tại.*
