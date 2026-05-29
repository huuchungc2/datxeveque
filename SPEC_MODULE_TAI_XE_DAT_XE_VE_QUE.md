# SPEC CHI TIẾT MODULE TÀI XẾ - ĐẶT XE VỀ QUÊ

## 1. Mục tiêu

Xây dựng đầy đủ module tài xế để tài xế có thể vận hành chuyến xe thật ngoài đời sau khi admin điều phối.

Tài xế phải làm được các việc chính:

1. Nhận thông báo khi được admin điều phối chuyến/khách/hàng.
2. Xem danh sách chuyến được giao.
3. Xem chi tiết chuyến.
4. Xem danh sách khách trong chuyến để gom khách.
5. Xem danh sách đơn gửi hàng trong chuyến.
6. Gọi khách/người gửi/người nhận qua app, không cần hiển thị số điện thoại đầy đủ.
7. Cập nhật trạng thái từng khách.
8. Cập nhật trạng thái từng đơn gửi hàng.
9. Xác nhận đã thu tiền khách/hàng.
10. Cập nhật ghế trống của xe.
11. Từ chối chuyến.
12. Hoàn thành chuyến khi tất cả khách/hàng đã xử lý xong.
13. Sau khi hoàn thành, tài xế chuyển sang trạng thái rảnh tại điểm cuối tuyến và chọn chiều nhận tiếp theo.

---

## 2. Nguyên tắc nghiệp vụ quan trọng

### 2.1 Tài xế là người thu tiền chính

Tài xế được xem:

- Tiền từng khách cần thu.
- Tiền từng đơn gửi hàng cần thu.
- Tổng tiền chuyến.
- Tổng đã thu.
- Tổng chưa thu.
- Công nợ/tiền phải nộp admin.

Tài xế được bấm xác nhận đã thu tiền.

Tài xế KHÔNG được sửa số tiền.

Nếu phát sinh sai tiền, đổi giá, phụ thu, giảm giá:

- Tài xế báo admin.
- Admin là người chỉnh tiền.

### 2.2 Tài xế không được xem lộ số điện thoại đầy đủ

Tài xế cần gọi khách để gom khách, nhưng không cần hiển thị số điện thoại đầy đủ.

UI nên có nút:

- Gọi khách.
- Gọi người gửi.
- Gọi người nhận.

Có thể hiển thị số dạng mask:

```txt
09******00
```

Backend/API vẫn có thể xử lý call action hoặc trả phone khi cần cho app gọi, nhưng UI không show full phone nếu không cần.

### 2.3 Gửi hàng không tính ghế

Đơn gửi hàng nằm trong chuyến nhưng không làm giảm ghế.

Khi tài xế xử lý đơn gửi hàng:

- Không tăng bookedSeats.
- Không giảm availableSeats.
- Có tiền thu hàng nếu có.
- Có trạng thái xử lý giống đơn khách.

### 2.4 Tài xế được cập nhật ghế trống

Tài xế được cập nhật ghế trống trực tiếp.

Khi tài xế cập nhật:

- Hệ thống áp dụng ngay.
- Không cần admin duyệt.
- Phải ghi log để admin kiểm tra.

Ví dụ:

```txt
Tài xế cập nhật ghế trống từ 3 xuống 2.
Điều phối sau đó phải dùng số ghế mới là 2.
```

### 2.5 Từ chối chuyến

Tài xế có quyền từ chối chuyến.

Khi tài xế từ chối:

- Chuyến/booking quay lại hàng chờ điều phối.
- Hệ thống/admin gợi ý lại cho tài xế/chuyến khác.
- Nên yêu cầu tài xế nhập lý do từ chối.
- Admin nhìn thấy lý do từ chối.

### 2.6 Khách hủy, không nghe máy, no-show

Nếu khách báo hủy với tài xế:

- Tài xế bấm `Khách hủy`.
- Booking bung ra danh sách chờ xử lý/điều phối lại.
- Admin quyết định điều phối lại hoặc hủy hẳn.
- Nếu admin hủy hẳn thì booking không điều phối nữa.

Nếu tài xế bấm:

- Không nghe máy.
- No-show.

Thì booking KHÔNG tự hủy, KHÔNG tự điều phối lại ngay.

Booking chuyển sang trạng thái chờ admin xử lý.

Admin quyết định:

- Gọi lại khách.
- Giữ khách trong chuyến.
- Hủy booking.
- Điều phối lại chuyến khác.

### 2.7 Hoàn thành chuyến

Không cho hoàn thành chuyến nếu còn khách/hàng chưa xử lý.

Chuyến chỉ được hoàn thành khi:

- Tất cả khách đã trả / đã hủy hợp lệ / admin xử lý xong.
- Tất cả hàng đã giao / đã hủy hợp lệ / admin xử lý xong.
- Không còn booking ở trạng thái đang đón, đã đón, đang trả, chờ lấy hàng, đang giao hàng.

Sau khi chuyến hoàn thành:

- Tài xế chuyển sang trạng thái rảnh.
- Vị trí hiện tại = điểm cuối tuyến.
- Tài xế được chọn chiều nhận tiếp theo.

Ví dụ:

```txt
Chuyến: Sài Gòn → Sùng Nhơn
Hoàn thành chuyến
=> Tài xế rảnh tại Sùng Nhơn
=> Tài xế chọn chiều nhận tiếp theo: Sùng Nhơn → Sài Gòn
```

---

## 3. Trạng thái đề xuất

### 3.1 Trạng thái tài xế

```txt
AVAILABLE      = Đang rảnh
COLLECTING     = Đang gom khách
ON_TRIP        = Đang chạy chuyến
BUSY           = Bận
OFFLINE        = Nghỉ / không nhận chuyến
```

Thông tin tài xế cần có:

```ts
driverStatus: "AVAILABLE" | "COLLECTING" | "ON_TRIP" | "BUSY" | "OFFLINE";
currentLocationName: string; // ví dụ: Sài Gòn, Đức Linh, Sùng Nhơn
currentRouteDirection?: string; // ví dụ: Sùng Nhơn → Sài Gòn
availableSeats?: number;
updatedAt: Date;
```

### 3.2 Trạng thái chuyến

```txt
OPEN              = Đang gom khách/hàng
DRIVER_ACCEPTED   = Tài xế đã nhận chuyến
DRIVER_REJECTED   = Tài xế từ chối chuyến
PICKING_UP        = Đang đón khách/lấy hàng
ON_TRIP           = Đang chạy
DROPPING_OFF      = Đang trả khách/giao hàng
COMPLETED         = Hoàn thành
CANCELLED         = Hủy chuyến
```

### 3.3 Trạng thái khách trong chuyến

```txt
WAITING_PICKUP           = Chờ đón
PICKING_UP               = Đang đón
PICKED_UP                = Đã đón
DROPPING_OFF             = Đang trả
DROPPED_OFF              = Đã trả
CUSTOMER_CANCELLED       = Khách hủy
UNREACHABLE              = Không nghe máy
NO_SHOW                  = No-show
WAITING_ADMIN_REVIEW     = Chờ admin xử lý
WAITING_REDISPATCH       = Chờ điều phối lại
CANCELLED_BY_ADMIN       = Admin đã hủy
```

Luồng bình thường:

```txt
WAITING_PICKUP
→ PICKING_UP
→ PICKED_UP
→ DROPPING_OFF
→ DROPPED_OFF
```

### 3.4 Trạng thái đơn gửi hàng

```txt
WAITING_PICKUP        = Chờ lấy hàng
PICKING_UP            = Đang lấy hàng
PICKED_UP             = Đã lấy hàng
DELIVERING            = Đang giao hàng
DELIVERED             = Đã giao hàng
FAILED_PICKUP         = Không lấy được
FAILED_DELIVERY       = Không giao được
PARCEL_CANCELLED      = Hàng hủy
WAITING_ADMIN_REVIEW  = Chờ admin xử lý
```

Luồng bình thường:

```txt
WAITING_PICKUP
→ PICKING_UP
→ PICKED_UP
→ DELIVERING
→ DELIVERED
```

### 3.5 Trạng thái thanh toán

```txt
UNPAID             = Chưa thu
CASH_COLLECTED     = Đã thu tiền mặt
TRANSFERRED        = Khách chuyển khoản
ADMIN_COLLECTED    = Admin đã thu
WAIVED             = Miễn/điều chỉnh
```

Tài xế được đổi từ `UNPAID` sang:

- `CASH_COLLECTED`
- `TRANSFERRED`

Tài xế không được sửa số tiền.

---

## 4. Màn hình tài xế cần code

## Màn 1: Dashboard tài xế

### Mục tiêu

Cho tài xế nhìn nhanh hôm nay có gì, trạng thái của mình là gì, có chuyến mới không.

### Nội dung hiển thị

1. Trạng thái hiện tại của tài xế:
   - Đang rảnh.
   - Đang gom khách.
   - Đang chạy chuyến.
   - Bận.
   - Nghỉ.

2. Vị trí hiện tại:
   - Ví dụ: Sài Gòn, Đức Linh, Sùng Nhơn.

3. Chiều nhận hiện tại:
   - Ví dụ: Sài Gòn → Đức Linh.
   - Sau khi hoàn thành chuyến, tài xế chọn chiều nhận tiếp theo.

4. Ghế trống hiện tại:
   - Tài xế được cập nhật ghế trống.
   - Cập nhật xong áp dụng ngay.

5. Thống kê nhanh:
   - Số chuyến hôm nay.
   - Số khách cần đón.
   - Số hàng cần lấy/giao.
   - Tổng tiền cần thu.
   - Tổng tiền đã thu.
   - Công nợ dự kiến.

6. Thông báo mới:
   - Admin vừa gán thêm khách.
   - Admin vừa gán đơn hàng.
   - Chuyến mới được giao.
   - Booking đang chờ xử lý do khách hủy/no-show.

### Hành động

- Cập nhật trạng thái tài xế.
- Cập nhật vị trí hiện tại.
- Cập nhật chiều nhận.
- Cập nhật ghế trống.
- Vào danh sách chuyến.
- Vào công nợ.

---

## Màn 2: Chuyến của tôi

### Mục tiêu

Tài xế xem toàn bộ chuyến được giao.

### Danh sách chuyến hiển thị

Mỗi item chuyến cần có:

- Mã chuyến.
- Tuyến.
- Ngày giờ chạy.
- Trạng thái chuyến.
- Xe.
- Số khách.
- Số ghế đã nhận.
- Số ghế còn trống.
- Số đơn gửi hàng.
- Tổng tiền cần thu.
- Tổng đã thu.
- Công nợ phải nộp admin.
- Có khách/hàng mới hay không.

Ví dụ item:

```txt
CX-260527-M8QA
Sài Gòn → Đức Linh
Tài xế đã nhận / Đang gom khách
Xe 7 chỗ
Khách: 4
Hàng: 1
Còn ghế: 3
Cần thu: 1.200.000đ
Đã thu: 500.000đ
```

### Bộ lọc

- Hôm nay.
- Sắp tới.
- Đang chạy.
- Hoàn thành.
- Bị từ chối / chờ điều phối lại.

### Hành động

- Xem chi tiết.
- Nhận chuyến.
- Từ chối chuyến.
- Bắt đầu đón.
- Hoàn thành chuyến nếu đủ điều kiện.

---

## Màn 3: Chi tiết chuyến

### Mục tiêu

Đây là màn quan trọng nhất để tài xế gom khách/chở khách/giao hàng.

### Thông tin tổng quan chuyến

Hiển thị:

- Mã chuyến.
- Tuyến.
- Ngày giờ chạy.
- Trạng thái chuyến.
- Xe.
- Tổng số khách.
- Tổng số ghế khách.
- Ghế còn trống.
- Tổng đơn hàng.
- Tổng tiền cần thu.
- Tổng đã thu.
- Tổng chưa thu.
- Công nợ phải nộp admin.
- Ghi chú admin.
- Vị trí xuất phát.
- Vị trí kết thúc.

### Hành động chuyến

- Nhận chuyến.
- Từ chối chuyến.
- Bắt đầu đón khách.
- Bắt đầu chạy.
- Hoàn thành chuyến.
- Cập nhật ghế trống.
- Cập nhật trạng thái tài xế.
- Chọn chiều nhận tiếp theo sau khi hoàn thành.

### Điều kiện hoàn thành chuyến

Nút hoàn thành chỉ được bật nếu:

- Mọi khách đã `DROPPED_OFF`, `CANCELLED_BY_ADMIN`, hoặc trạng thái kết thúc hợp lệ.
- Mọi hàng đã `DELIVERED`, `PARCEL_CANCELLED`, hoặc trạng thái kết thúc hợp lệ.
- Không còn khách/hàng chờ admin xử lý.

Nếu chưa đủ điều kiện thì hiển thị lý do:

```txt
Chưa thể hoàn thành chuyến vì còn 2 khách chưa trả và 1 đơn hàng chưa giao.
```

---

## Màn 4: Danh sách khách trong chuyến

### Mục tiêu

Tài xế xem từng khách để gọi, đón, trả, xác nhận thu tiền.

### Card khách cần hiển thị

Mỗi khách hiển thị:

- Mã đơn.
- Tên khách.
- Số điện thoại dạng ẩn/mask.
- Nút gọi khách.
- Số ghế.
- Điểm đón.
- Điểm trả.
- Giờ đi mong muốn.
- Ghi chú khách.
- Trạng thái khách.
- Tiền cần thu.
- Trạng thái thanh toán.
- Nguồn thanh toán: tài xế thu / admin thu / chuyển khoản.

Ví dụ:

```txt
DX001 - Nguyễn Văn A
SĐT: 09******00 [Gọi]
Số ghế: 2
Đón: Quận 1, TP.HCM
Trả: Đức Linh, Bình Thuận
Tiền cần thu: 500.000đ
Trạng thái: Chờ đón
Thanh toán: Chưa thu
```

### Hành động từng khách

- Gọi khách.
- Đang đón.
- Đã đón.
- Đang trả.
- Đã trả.
- Khách hủy.
- Không nghe máy.
- No-show.
- Xác nhận đã thu tiền.

### Logic khi bấm trạng thái khách

#### Đang đón

```txt
WAITING_PICKUP → PICKING_UP
```

#### Đã đón

```txt
PICKING_UP → PICKED_UP
```

#### Đang trả

```txt
PICKED_UP → DROPPING_OFF
```

#### Đã trả

```txt
DROPPING_OFF → DROPPED_OFF
```

#### Khách hủy

```txt
ANY_ACTIVE_STATUS → CUSTOMER_CANCELLED / WAITING_REDISPATCH
```

Khi tài xế bấm khách hủy:

- Booking bung ra chờ xử lý/điều phối lại.
- Admin nhận cảnh báo.
- Nếu admin hủy hẳn thì chuyển `CANCELLED_BY_ADMIN`.

#### Không nghe máy / No-show

```txt
ANY_ACTIVE_STATUS → UNREACHABLE hoặc NO_SHOW → WAITING_ADMIN_REVIEW
```

Không tự hủy, không tự điều phối lại ngay.

Admin xử lý sau.

### Logic thanh toán khách

Tài xế được bấm:

- Đã thu tiền mặt.
- Khách chuyển khoản.

Không được sửa tiền.

Nếu cần sửa tiền:

- Hiển thị hướng dẫn: “Liên hệ admin để điều chỉnh tiền.”

---

## Màn 5: Danh sách gửi hàng trong chuyến

### Mục tiêu

Tài xế xử lý các đơn gửi hàng trong chuyến.

### Card đơn hàng cần hiển thị

Mỗi đơn gửi hàng hiển thị:

- Mã đơn hàng/booking.
- Tên người gửi.
- Số điện thoại người gửi dạng ẩn/mask.
- Nút gọi người gửi.
- Tên người nhận.
- Số điện thoại người nhận dạng ẩn/mask.
- Nút gọi người nhận.
- Điểm lấy hàng.
- Điểm giao hàng.
- Mô tả hàng.
- Ghi chú.
- Tiền cần thu.
- Trạng thái thanh toán.
- Trạng thái đơn hàng.

Ví dụ:

```txt
GH001 - Gửi hàng
Người gửi: Anh Nam [Gọi]
Người nhận: Chị Hoa [Gọi]
Lấy hàng: Quận 1, TP.HCM
Giao hàng: Đức Linh, Bình Thuận
Hàng: 1 thùng đồ
Tiền cần thu: 100.000đ
Trạng thái: Chờ lấy hàng
Thanh toán: Chưa thu
```

### Hành động từng đơn hàng

- Gọi người gửi.
- Gọi người nhận.
- Đang lấy hàng.
- Đã lấy hàng.
- Đang giao hàng.
- Đã giao hàng.
- Không lấy được.
- Không giao được.
- Hàng hủy.
- Xác nhận đã thu tiền.

### Logic trạng thái gửi hàng

```txt
WAITING_PICKUP → PICKING_UP → PICKED_UP → DELIVERING → DELIVERED
```

Nếu không lấy/giao được:

```txt
FAILED_PICKUP / FAILED_DELIVERY → WAITING_ADMIN_REVIEW
```

Nếu hàng hủy:

```txt
PARCEL_CANCELLED → WAITING_ADMIN_REVIEW hoặc kết thúc theo admin
```

Gửi hàng không làm thay đổi ghế.

---

## Màn 6: Cập nhật ghế trống

### Mục tiêu

Tài xế có thể chỉnh số ghế trống thực tế.

### UI

Có form:

- Số ghế trống hiện tại.
- Nhập số ghế trống mới.
- Ghi chú lý do nếu muốn.
- Nút cập nhật.

### Rule

- Không được nhập số âm.
- Không được vượt quá số ghế xe.
- Cập nhật xong áp dụng ngay.
- Ghi log.

Log nên có:

```ts
{
  driverId: string;
  tripId?: string;
  oldAvailableSeats: number;
  newAvailableSeats: number;
  reason?: string;
  createdAt: Date;
}
```

Điều phối admin phải dùng số ghế mới nhất.

---

## Màn 7: Công nợ của tôi

### Mục tiêu

Tài xế xem tiền thu và tiền phải nộp admin.

### Thông tin hiển thị

- Tổng tiền đã thu.
- Tổng tiền chưa thu.
- Tổng doanh thu khách.
- Tổng doanh thu gửi hàng.
- Tổng công nợ phải nộp admin.
- Tổng đã nộp admin nếu có.
- Còn phải nộp.

### Theo từng chuyến

Mỗi chuyến hiển thị:

- Mã chuyến.
- Tuyến.
- Ngày chạy.
- Tổng tiền chuyến.
- Tiền khách.
- Tiền gửi hàng.
- Đã thu.
- Chưa thu.
- Công nợ phải nộp.
- Trạng thái đối soát.

Tài xế chỉ xem và xác nhận thu tiền từng booking, không chỉnh công nợ.

---

## Màn 8: Thông báo tài xế

### Mục tiêu

Tài xế nhận thông báo khi có thay đổi.

### Các sự kiện cần thông báo

- Admin gán chuyến mới.
- Admin gán thêm khách vào chuyến đang gom.
- Admin gán thêm đơn gửi hàng.
- Admin điều chỉnh chuyến.
- Admin hủy booking/chuyến.
- Booking bị đưa vào chờ xử lý.
- Có thay đổi công nợ/thanh toán.

### UI thông báo

Mỗi thông báo có:

- Tiêu đề.
- Nội dung.
- Thời gian.
- Trạng thái đã đọc/chưa đọc.
- Link mở chi tiết chuyến/booking.

Ví dụ:

```txt
Bạn có khách mới trong chuyến CX001
Khách Nguyễn Văn A - 2 ghế - Đón tại Quận 1
```

---

## 5. API/backend cần có

Tên API có thể điều chỉnh theo code hiện tại, nhưng cần đủ chức năng.

### 5.1 Lấy dashboard tài xế

```txt
GET /api/driver/dashboard
```

Trả về:

- driverStatus
- currentLocation
- currentDirection
- availableSeats
- todayTripsCount
- activeTripsCount
- pendingNotificationsCount
- totalNeedCollect
- totalCollected
- debtAmount

### 5.2 Lấy chuyến của tôi

```txt
GET /api/driver/trips
```

Chỉ trả về chuyến của tài xế đang đăng nhập.

Không được trả chuyến của tài xế khác.

### 5.3 Lấy chi tiết chuyến

```txt
GET /api/driver/trips/:tripId
```

Phải trả:

- trip detail
- passengers/bookings
- parcels
- payment summary
- debt summary
- status history nếu có

Chỉ tài xế của chuyến đó mới được xem.

### 5.4 Tài xế nhận chuyến

```txt
POST /api/driver/trips/:tripId/accept
```

Cập nhật:

- trip.status = DRIVER_ACCEPTED hoặc OPEN/COLLECTING tùy schema
- driver.status = COLLECTING

### 5.5 Tài xế từ chối chuyến

```txt
POST /api/driver/trips/:tripId/reject
```

Body:

```ts
{
  reason: string;
}
```

Kết quả:

- trip.status = DRIVER_REJECTED hoặc booking quay lại queue điều phối.
- booking/trip đưa về WAITING_REDISPATCH.
- admin nhận notification.
- tài xế không còn giữ chuyến đó.

### 5.6 Cập nhật trạng thái khách

```txt
POST /api/driver/trips/:tripId/bookings/:bookingId/status
```

Body:

```ts
{
  status: "PICKING_UP" | "PICKED_UP" | "DROPPING_OFF" | "DROPPED_OFF" | "CUSTOMER_CANCELLED" | "UNREACHABLE" | "NO_SHOW";
}
```

Rule:

- Không cho tài xế cập nhật booking không thuộc chuyến của mình.
- Không cho cập nhật booking đã bị admin hủy.
- Nếu `CUSTOMER_CANCELLED` thì chuyển về queue xử lý/điều phối lại.
- Nếu `UNREACHABLE` hoặc `NO_SHOW` thì chờ admin xử lý.

### 5.7 Cập nhật trạng thái đơn gửi hàng

```txt
POST /api/driver/trips/:tripId/parcels/:bookingId/status
```

Body:

```ts
{
  status: "PICKING_UP" | "PICKED_UP" | "DELIVERING" | "DELIVERED" | "FAILED_PICKUP" | "FAILED_DELIVERY" | "PARCEL_CANCELLED";
}
```

### 5.8 Xác nhận thu tiền

```txt
POST /api/driver/bookings/:bookingId/collect-payment
```

Body:

```ts
{
  method: "CASH_COLLECTED" | "TRANSFERRED";
}
```

Rule:

- Tài xế không được sửa amount.
- Hệ thống dùng amount của booking.
- Ghi nhận thời gian thu tiền.
- Cập nhật công nợ.

### 5.9 Cập nhật ghế trống

```txt
POST /api/driver/trips/:tripId/available-seats
```

Body:

```ts
{
  availableSeats: number;
  reason?: string;
}
```

Rule:

- Apply ngay.
- Log lại.
- availableSeats >= 0.
- availableSeats <= vehicle.seatCount.

### 5.10 Hoàn thành chuyến

```txt
POST /api/driver/trips/:tripId/complete
```

Rule:

- Chỉ cho complete nếu tất cả passenger/parcel đã ở trạng thái kết thúc hợp lệ.
- Nếu chưa đủ điều kiện, trả lỗi chi tiết còn bao nhiêu khách/hàng chưa xử lý.
- Khi complete:
  - trip.status = COMPLETED
  - driver.status = AVAILABLE
  - driver.currentLocation = trip.destination
  - yêu cầu/cho phép tài xế chọn nextDirection.

### 5.11 Cập nhật trạng thái tài xế

```txt
POST /api/driver/status
```

Body:

```ts
{
  status: "AVAILABLE" | "COLLECTING" | "ON_TRIP" | "BUSY" | "OFFLINE";
  currentLocationName?: string;
  currentRouteDirection?: string;
  availableSeats?: number;
}
```

### 5.12 Lấy thông báo

```txt
GET /api/driver/notifications
POST /api/driver/notifications/:id/read
```

---

## 6. Quy tắc bảo mật/phân quyền

1. Tất cả API tài xế phải yêu cầu đăng nhập role DRIVER.
2. Tài xế chỉ được xem chuyến của chính mình.
3. Tài xế chỉ được cập nhật booking thuộc chuyến của mình.
4. Tài xế không được sửa giá tiền.
5. Tài xế không được xem đầy đủ số điện thoại nếu UI yêu cầu ẩn.
6. Tài xế không được truy cập công nợ của tài xế khác.
7. Nếu tài khoản tài xế bị khóa, tất cả API phải trả 401/403.

---

## 7. Checklist test bắt buộc

### Test 1: Tài xế nhận chuyến mới

Kỳ vọng:

- Admin điều phối chuyến cho tài xế.
- Tài xế nhận thông báo.
- Chuyến xuất hiện trong “Chuyến của tôi”.

### Test 2: Xem chi tiết chuyến

Kỳ vọng:

- Tài xế xem được tuyến, giờ, xe, ghế, tiền.
- Tài xế xem được danh sách khách.
- Tài xế xem được danh sách gửi hàng.

### Test 3: Gọi khách qua app

Kỳ vọng:

- UI có nút gọi khách.
- Số điện thoại không cần hiển thị đầy đủ.

### Test 4: Cập nhật trạng thái khách

Kỳ vọng:

- Chờ đón → Đang đón → Đã đón → Đang trả → Đã trả.
- Trạng thái lưu đúng backend.

### Test 5: Khách hủy

Kỳ vọng:

- Tài xế bấm khách hủy.
- Booking chuyển sang chờ xử lý/điều phối lại.
- Admin thấy booking cần xử lý.

### Test 6: Không nghe máy/no-show

Kỳ vọng:

- Booking chuyển chờ admin xử lý.
- Không tự hủy.
- Không tự điều phối lại ngay.

### Test 7: Xử lý gửi hàng

Kỳ vọng:

- Tài xế cập nhật: chờ lấy → đang lấy → đã lấy → đang giao → đã giao.
- Gửi hàng không trừ ghế.
- Tài xế thấy tiền thu hàng.

### Test 8: Xác nhận thu tiền

Kỳ vọng:

- Tài xế xác nhận đã thu.
- Không sửa được số tiền.
- Tổng đã thu/công nợ cập nhật đúng.

### Test 9: Cập nhật ghế trống

Kỳ vọng:

- Tài xế sửa ghế trống.
- Hệ thống cập nhật ngay.
- Admin/điều phối thấy số ghế mới.
- Có log.

### Test 10: Hoàn thành chuyến

Kỳ vọng:

- Nếu còn khách/hàng chưa xử lý thì không cho hoàn thành.
- Khi tất cả đã xử lý, tài xế hoàn thành chuyến được.
- Tài xế chuyển rảnh tại điểm cuối tuyến.
- Tài xế chọn chiều nhận tiếp theo.

### Test 11: Từ chối chuyến

Kỳ vọng:

- Tài xế từ chối chuyến.
- Chuyến/booking quay lại chờ điều phối.
- Admin thấy để điều phối lại.

### Test 12: Admin gán thêm khách

Kỳ vọng:

- Tài xế nhận thông báo.
- Chi tiết chuyến cập nhật khách mới.
- Ghế, tiền, công nợ cập nhật đúng.

---

## 8. Kết quả mong muốn sau khi code

Sau khi hoàn thiện module tài xế, tài xế có thể dùng app để chạy xe thật:

```txt
1. Nhận chuyến.
2. Xem khách/hàng trong chuyến.
3. Gọi khách/người gửi/người nhận.
4. Cập nhật trạng thái đón/trả khách.
5. Cập nhật trạng thái lấy/giao hàng.
6. Xác nhận thu tiền.
7. Cập nhật ghế trống.
8. Từ chối chuyến nếu không nhận.
9. Hoàn thành chuyến.
10. Sau khi hoàn thành, rảnh tại điểm cuối tuyến và chọn chiều nhận tiếp theo.
```

Không được chỉ hiển thị mã chuyến tổng quát. Tài xế phải có đủ thông tin để gom khách, chạy chuyến, thu tiền và báo trạng thái thực tế.
