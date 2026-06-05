# DOCS — Dispatch 3 cột + gán booking + settlement (công nợ)

## 1) Dispatch board bắt buộc là “3 cột”

Route UI: `/admin/dispatch`

Phải có đúng 3 vùng dữ liệu:

- **Cột 1 — Đơn chưa gán**: bookings `assignedTripId = null` và status phù hợp (`new/contacted/quoted/deposited/waiting_dispatch`…)
- **Cột 2 — Chuyến đang gom**: trips status `collecting/ready`
- **Cột 3 — Tài xế rảnh**: drivers status `available`

API thường dùng:

- `GET /api/admin/dispatch` → `{ unassignedBookings, collectingTrips, availableDrivers }`

## 2) Rule gán booking vào trip (core)

API:

- `POST /api/admin/trips/:id/add-bookings`

Body:

```json
{ "bookingIds": [1, 2, 3] }
```

Quy tắc bắt buộc:

- **Chống gán trùng**: booking đã ở trong trip thì **skip**, tuyệt đối **không** cộng trùng ghế/tiền/công nợ.
- **Không vượt ghế**: tổng ghế cần thêm \(= \sum passengerCount\) phải **≤ availableSeats**, nếu không trả lỗi.
- **Không ghế âm**: mọi cập nhật phải đảm bảo `availableSeats >= 0`.
- **Không gán** booking `cancelled/no_show`.
- **Không gán** booking đang thuộc trip active khác (nếu chưa tách).

Khi gán thành công:

- Tạo `trip_bookings`
- Update booking: `assignedTripId = trip.id`, `status = assigned`
- Update trip rollup:
  - `bookedSeats += seatsToAdd`
  - `availableSeats -= seatsToAdd`
  - `totalCustomerAmount += sum(finalTotal/estimatedTotal)`
  - `adminCommission += sum(commissionAmount)`
  - `driverNetAmount += sum(driverAmount)`
  - Cập nhật công nợ theo `paymentReceiver`
- Tạo `trip_passenger_financials` cho các booking mới
- Trả `{ added, skipped, trip }`

## 3) Tạo chuyến mới từ các booking đã chọn (dispatch)

Flow tối thiểu:

1) Admin chọn booking
2) Chọn tài xế (hoặc tạo chuyến trống)
3) System đề xuất:
   - `routeId` theo booking đầu tiên
   - `departureAt` theo `scheduledAt` booking đầu tiên
   - `totalSeats` theo xe `sellableSeats`
4) Tạo trip → gọi `add-bookings`

## 4) seat_count / gán ghế từng phần (nếu hệ thống đang dùng)

Trong một số triển khai, `trip_bookings` có thể có `seat_count` để gán từng phần (1 booking nhiều ghế có thể phân bổ).

Rule cốt lõi vẫn không đổi:

- Không vượt tổng ghế
- Không cộng trùng phần đã gán
- Không ghế âm

## 5) Settlement (công nợ) — nguyên tắc

### Snapshot tài chính

- Giá/hoa hồng tại thời điểm tạo booking/trip phải lưu snapshot (không bị thay đổi khi bảng giá đổi).

### Công nợ theo người thu tiền (ý nghĩa)

- **Khách trả tài xế** → tài xế “nợ admin” phần hoa hồng (admin commission)
- **Khách trả admin** → admin “nợ tài xế” phần tài xế được hưởng
- Split/đặt cọc → tính theo phần thực thu

### Khi trip hoàn thành

- Trip `COMPLETED` → tạo `trip_financial_snapshots` (chốt số)
- Driver cập nhật trạng thái rảnh/bận đúng quy trình

## 6) Acceptance tối thiểu cho Dispatch

- Vào `/admin/dispatch` thấy đủ 3 cột dữ liệu
- Gán 1 booking vào trip thành công
- Gán lại booking đó lần 2 → **skipped**, số ghế/tiền/công nợ không đổi
- Gán vượt ghế → báo lỗi
- Driver login thấy chuyến được gán

