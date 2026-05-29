# SPEC MODULE ADMIN - ĐẶT XE VỀ QUÊ

## 1. Mục tiêu

Hoàn thiện module admin để vận hành thật hệ thống Đặt Xe Về Quê.

Admin là toàn quyền, không cần chia role ở bản đầu.

Admin phải xử lý được toàn bộ luồng:

```txt
Đơn mới
→ Xác nhận đơn
→ Điều phối
→ Theo dõi chuyến
→ Theo dõi tài xế
→ Xử lý khách/hàng phát sinh
→ Theo dõi tiền thu/công nợ
→ Báo cáo/xuất Excel
```

---

## 2. Nguyên tắc nghiệp vụ đã chốt

### 2.1 Admin toàn quyền

Bản đầu chỉ cần 1 loại admin toàn quyền.

Không cần phân quyền:

- Super Admin
- Điều phối viên
- Kế toán
- CSKH

Có thể nâng cấp sau.

---

### 2.2 Admin được xác nhận đơn trước khi điều phối

Khi có đơn mới, admin cần gọi/zalo xác nhận khách.

Admin có các trạng thái xử lý đơn mới:

```txt
Đã xác nhận
Không liên hệ được
Khách hủy
Sai thông tin
```

Sau khi đơn đã xác nhận, admin mới điều phối.

Tuy nhiên UI có thể cho admin xác nhận và điều phối ngay trong cùng màn để thao tác nhanh.

---

### 2.3 Admin có thể tạo đơn hộ khách

Admin cần có chức năng tạo đơn hộ khách khi khách gọi hotline/Zalo.

Admin có thể tạo:

```txt
Đơn chở khách
Đơn gửi hàng
Đơn khách + hàng
```

Tạo xong đơn đi vào luồng xử lý giống đơn khách tự đặt.

---

### 2.4 Admin được sửa thông tin đơn

Trước khi điều phối hoặc khi cần xử lý, admin được sửa:

```txt
Số ghế
Điểm đón
Điểm trả
Ngày giờ
Giá tiền
Ghi chú
Thông tin khách
Thông tin gửi hàng
```

Mọi chỉnh sửa phải có lịch sử/audit log:

```txt
Ai sửa
Sửa lúc nào
Sửa field nào
Giá trị cũ
Giá trị mới
Lý do nếu có
```

---

### 2.5 Giá tính theo bảng giá, admin được nhập/chỉnh tay

Hiện tại hệ thống đã có bảng giá.

Admin được:

```txt
Định nghĩa bảng giá
Nhập giá bằng tay
Điều chỉnh giá booking trước khi xác nhận/điều phối nếu cần
```

Khi tách booking, tiền vẫn dựa theo bảng giá hoặc giá booking tương ứng, không cần logic chia tiền phức tạp ngoài bảng giá.

---

### 2.6 Gửi hàng không tính ghế

Đơn gửi hàng không làm giảm ghế.

Khi điều phối gửi hàng vào chuyến:

```txt
Không tăng bookedSeats
Không giảm availableSeats
Không làm âm ghế
Có thể cộng tiền gửi hàng vào doanh thu chuyến
Tài xế thấy tiền cần thu hàng
```

---

### 2.7 Admin điều phối bằng dropdown/list phương án

Admin không cần quan tâm chuyến đã tạo hay chưa.

Khi mở một booking cần điều phối, hệ thống phải gợi ý tất cả phương án:

```txt
Chuyến đang gom đã có
Tài xế đang rảnh/chưa có chuyến
Phương án không đủ điều kiện thì disabled ở cuối
```

Admin chọn một phương án rồi bấm xác nhận.

Backend tự xử lý:

```txt
Nếu chọn chuyến đang gom → gán booking vào chuyến đó
Nếu chọn tài xế rảnh → tạo chuyến mới rồi gán booking vào chuyến mới
```

---

### 2.8 Admin được chuyển khách giữa các chuyến

Admin được chuyển nguyên booking từ chuyến A sang chuyến B.

Điều kiện:

```txt
Chuyến B đủ ghế nếu là đơn khách
Khách đồng ý nếu có thay đổi lớn
```

Khi chuyển:

```txt
Chuyến A trả lại ghế
Chuyến B trừ ghế
Booking cập nhật trip mới
Thông báo tài xế cũ và tài xế mới
Ghi lịch sử chuyển chuyến
```

---

### 2.9 Admin được tách booking nếu khách đồng ý

Ví dụ booking 2 ghế, khách đồng ý tách đi 2 chuyến khác nhau.

Admin được tách booking.

Rule:

```txt
Không tự động tách
Chỉ admin được tách
Chỉ tách khi khách đồng ý
Phải ghi log
Phải liên kết booking con với booking gốc
Phải thông báo tài xế liên quan
```

Khuyến nghị code theo thứ tự:

```txt
Bản đầu: chuyển nguyên booking giữa chuyến
Bản sau: tách booking nâng cao
```

---

### 2.10 Chuyến FULL

`FULL` nghĩa là chuyến không nhận thêm khách.

Hiện tại không cần trạng thái `LOCKED` riêng.

Trạng thái cơ bản:

```txt
OPEN
FULL
ON_TRIP
COMPLETED
CANCELLED
```

---

### 2.11 Công nợ/tiền thu không cần công thức phức tạp

Tài xế là người thu tiền chính.

Bản đầu không cần công thức hoa hồng/công nợ phức tạp kiểu phần trăm nhiều tầng.

Admin cần theo dõi:

```txt
Tổng tiền booking
Tài xế đã thu
Chưa thu
Khoản cần đối soát
Công nợ tổng quan
```

Tài xế xác nhận đã thu thì hệ thống ghi nhận luôn, admin không cần duyệt từng khoản.

Admin không cần sửa khoản tiền sau khi tài xế đã thu ở bản đầu.

---

### 2.12 Chưa cần GPS/bản đồ tài xế

Không cần chức năng GPS/bản đồ vì chưa rõ kinh phí.

Trước mắt chỉ cần:

```txt
Tài xế cập nhật vị trí dạng chữ
Admin xem vị trí dạng chữ
```

Ví dụ:

```txt
Sài Gòn
Đức Linh
Sùng Nhơn
```

---

### 2.13 Admin không cần sửa trạng thái tài xế

Tài xế tự cập nhật trạng thái của mình.

Admin chỉ xem.

Admin không cần chuyển tài xế từ bận sang rảnh.

---

### 2.14 Admin cần xem log ghế trống

Vì tài xế được tự cập nhật ghế trống, admin phải xem được lịch sử:

```txt
Tài xế nào cập nhật
Chuyến nào
Từ mấy ghế sang mấy ghế
Thời gian cập nhật
Lý do nếu có
```

---

### 2.15 Admin nhận thông báo

Admin nhận thông báo trong hệ thống qua icon chuông.

Sau này có thể nâng cấp gửi qua Zalo/Telegram.

Sự kiện cần thông báo:

```txt
Có đơn mới
Tài xế từ chối chuyến
Tài xế báo khách hủy
Tài xế báo không nghe máy/no-show
Tài xế cập nhật ghế trống
Tài xế hoàn thành chuyến
Admin/tài xế thay đổi trạng thái khách/hàng
```

---

## 3. Màn hình admin cần có

# Màn 1: Admin Dashboard

## Mục tiêu

Admin mở lên biết ngay tình hình vận hành hôm nay.

## Nội dung hiển thị

### Thống kê vận hành

```txt
Đơn mới chờ xác nhận
Đơn đã xác nhận chờ điều phối
Đơn chờ admin xử lý
Chuyến đang gom
Chuyến đang chạy
Chuyến hoàn thành hôm nay
Tài xế đang rảnh
Tài xế đang chạy
Tài xế từ chối chuyến
Khách hủy/no-show/không nghe máy chờ xử lý
```

### Thống kê tiền

```txt
Doanh thu hôm nay
Tiền khách
Tiền gửi hàng
Tổng đã thu
Tổng chưa thu
Công nợ tài xế
```

### Việc cần xử lý

Danh sách ngắn:

```txt
Đơn mới
Đơn chờ điều phối
Booking bị tài xế báo khách hủy
Booking no-show/không nghe máy
Tài xế từ chối chuyến
```

### Hành động nhanh

```txt
Tạo đơn hộ khách
Vào điều phối
Vào đơn hàng
Vào chuyến xe
Vào thông báo
```

---

# Màn 2: Quản lý đơn hàng

## Mục tiêu

Admin quản lý toàn bộ booking: khách, gửi hàng, khách + hàng.

## Filter bắt buộc

```txt
keyword: mã đơn, tên khách, số điện thoại, điểm đón, điểm trả
status
type: PASSENGER, PARCEL, PASSENGER_WITH_PARCEL
routeId
dateFrom
dateTo
pickupTimeFrom
pickupTimeTo
seats
paymentStatus
```

## Phân trang

Không được load toàn bộ.

API phải hỗ trợ:

```txt
page
limit
total
totalPages
```

## Bảng danh sách

Cột cần có:

```txt
Mã đơn
Loại đơn
Khách/người gửi
Số điện thoại dạng mask nếu cần
Tuyến
Ngày giờ
Số ghế
Điểm đón/lấy hàng
Điểm trả/giao hàng
Trạng thái
Tổng tiền
Thanh toán
Thao tác
```

## Thao tác

```txt
Xem chi tiết
Xác nhận đơn
Không liên hệ được
Khách hủy
Sai thông tin
Sửa đơn
Điều phối
Hủy đơn
Lịch sử xử lý
```

---

# Màn 3: Tạo đơn hộ khách

## Mục tiêu

Admin tạo đơn khi khách đặt qua hotline/Zalo.

## Loại đơn

```txt
Chở khách
Gửi hàng
Khách + hàng
```

## Form chở khách

```txt
Họ tên
Số điện thoại
Tuyến
Ngày đi
Giờ đi mong muốn
Số ghế
Điểm đón
Điểm trả
Ghi chú
Giá theo bảng giá
Admin có thể điều chỉnh giá nếu cần
```

## Form gửi hàng

```txt
Người gửi
SĐT người gửi
Người nhận
SĐT người nhận
Tuyến gửi
Ngày gửi
Giờ gửi mong muốn
Điểm lấy hàng
Điểm giao hàng
Mô tả hàng
Ghi chú
Giá gửi hàng/admin nhập
```

## Sau khi tạo

Đơn tạo xong đi vào danh sách booking và có thể xác nhận/điều phối giống đơn khách tự đặt.

---

# Màn 4: Chi tiết đơn

## Nội dung

```txt
Mã đơn
Loại đơn
Trạng thái hiện tại
Thông tin khách/người gửi/người nhận
Tuyến
Ngày giờ
Số ghế nếu có
Điểm đón/lấy hàng
Điểm trả/giao hàng
Ghi chú
Tổng tiền
Trạng thái thanh toán
Chuyến hiện tại nếu đã điều phối
Tài xế hiện tại nếu đã điều phối
Lịch sử trạng thái
Lịch sử sửa đơn
Lịch sử điều phối/chuyển chuyến/tách booking
```

## Thao tác

```txt
Sửa đơn
Xác nhận
Điều phối
Chuyển chuyến
Tách booking nếu khách đồng ý
Hủy đơn
Ghi chú nội bộ
```

---

# Màn 5: Điều phối

## Mục tiêu

Đây là màn chính để admin chọn phương án chạy cho từng booking.

Admin chỉ cần:

```txt
Chọn booking
Xem danh sách phương án gợi ý
Chọn 1 phương án
Bấm xác nhận điều phối
```

## Danh sách booking cần điều phối

Phải có filter + phân trang.

Filter:

```txt
keyword
status
type
routeId
dateFrom
dateTo
seats
paymentStatus
```

## API danh sách booking chờ điều phối

```txt
GET /api/admin/dispatch/bookings?page=1&limit=20&keyword=&status=&type=&routeId=&dateFrom=&dateTo=
```

Response:

```ts
{
  items: BookingDispatchItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

## API gợi ý phương án điều phối

Chỉ gọi khi admin chọn một booking.

```txt
GET /api/admin/dispatch/bookings/:bookingId/options
```

Không tính gợi ý cho toàn bộ booking khi load danh sách.

## Dispatch options phải gồm

### 1. Existing trip options

Các chuyến đang gom/chạy phù hợp:

```txt
OPEN hoặc SCHEDULED
Cùng tuyến/ngày/giờ phù hợp
Có tài xế
Có xe
Còn đủ ghế nếu là đơn khách
```

### 2. Available driver options

Tài xế đang rảnh/chưa có chuyến:

```txt
Driver active
Vehicle active
Xe đủ ghế nếu là đơn khách
Phù hợp tuyến/vị trí/chiều nhận nếu có
```

### 3. Disabled options

Các phương án không đủ điều kiện:

```txt
Không đủ ghế
Tài xế bận
Chuyến đã completed/cancelled
```

Disabled options nằm cuối, không cho chọn.

## Sort dropdown/list điều phối

Tách nhóm trước:

```txt
Eligible options
Disabled options
```

Trong eligible options:

```txt
1. Chuyến đang gom cùng tuyến/ngày còn đủ ghế
2. Chuyến sau khi gán còn ít ghế hơn
3. Tài xế rảnh có xe đủ ghế
4. Tài xế rảnh có xe vừa đủ hơn
```

Disabled ở cuối.

## Ví dụ kết quả dropdown

Booking cần 2 ghế, tuyến Sài Gòn → Đức Linh:

```txt
1. A — đang gom — còn 3 ghế — sau gán còn 1 — phù hợp nhất
2. C — đang rảnh — xe 4 chỗ — sau gán còn 2 — sẽ tạo chuyến khi xác nhận
3. D — đang rảnh — xe 7 chỗ — sau gán còn 5 — sẽ tạo chuyến khi xác nhận
4. B — đang gom — còn 1 ghế — không đủ ghế — disabled
```

## Xác nhận điều phối

```txt
POST /api/admin/dispatch/bookings/:bookingId/confirm
```

Body:

```ts
{
  optionId: string;
  optionType: "EXISTING_TRIP" | "AVAILABLE_DRIVER";
}
```

Backend:

```txt
Nếu EXISTING_TRIP:
- Gán booking vào trip cũ
- Cập nhật ghế/doanh thu/trạng thái
- Thông báo tài xế

Nếu AVAILABLE_DRIVER:
- Tạo trip mới
- Sinh mã CX
- Gán booking vào trip mới
- Cập nhật ghế/doanh thu/trạng thái
- Thông báo tài xế
```

---

# Màn 6: Quản lý chuyến xe

## Mục tiêu

Quản lý các chuyến đã được tạo sau điều phối.

Không cần nút tạo chuyến thủ công nếu nghiệp vụ là tạo qua điều phối.

## Filter bắt buộc

```txt
keyword: mã chuyến, tên tài xế, biển số, tuyến
routeId
driverId
vehicleId
status
dateFrom
dateTo
timeFrom
timeTo
availableSeatsMin
availableSeatsMax
tripType
payment/debt status nếu có
```

## API

```txt
GET /api/admin/trips?page=1&limit=20&keyword=&routeId=&driverId=&status=&dateFrom=&dateTo=
```

Response:

```ts
{
  items: TripItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

## Bảng chuyến

Cột:

```txt
Mã chuyến
Tuyến
Ngày giờ
Tài xế
Xe
Trạng thái
Khách/Hàng
Ghế
Doanh thu
Tiền đã thu
Công nợ/đối soát
Thao tác
```

## Thao tác

```txt
Xem chi tiết
Chuyển khách
Gán thêm khách/hàng
Hủy chuyến
Xem lịch sử
```

---

# Màn 7: Chi tiết chuyến

## Nội dung

```txt
Mã chuyến
Tuyến
Ngày giờ
Tài xế
Xe
Trạng thái chuyến
Tổng khách
Tổng hàng
Ghế đã đặt
Ghế trống
Tổng tiền
Đã thu
Chưa thu
Công nợ/đối soát
Ghi chú
```

## Danh sách khách

Mỗi khách:

```txt
Mã đơn
Tên khách
Số ghế
Điểm đón
Điểm trả
Trạng thái khách
Tiền cần thu
Trạng thái thanh toán
Tài xế cập nhật lần cuối
```

## Danh sách gửi hàng

Mỗi hàng:

```txt
Mã đơn
Người gửi
Người nhận
Điểm lấy
Điểm giao
Trạng thái hàng
Tiền cần thu
Trạng thái thanh toán
```

## Thao tác

```txt
Chuyển khách sang chuyến khác
Tách booking nếu khách đồng ý
Hủy booking
Điều phối lại booking
Xem lịch sử trạng thái
```

---

# Màn 8: Chuyển khách giữa chuyến

## Mục tiêu

Admin chuyển booking từ chuyến A sang chuyến B.

## Điều kiện

```txt
Booking chưa hoàn thành
Chuyến B còn đủ ghế nếu là đơn khách
Chuyến B chưa completed/cancelled
Khách đồng ý nếu thay đổi chuyến
```

## Khi chuyển

```txt
Trip A trả ghế
Trip B trừ ghế
Booking đổi trip
Thông báo tài xế cũ
Thông báo tài xế mới
Ghi audit log
```

## API

```txt
POST /api/admin/bookings/:bookingId/move-trip
```

Body:

```ts
{
  fromTripId: string;
  toTripId: string;
  customerAgreed: boolean;
  note?: string;
}
```

---

# Màn 9: Tách booking

## Mục tiêu

Cho phép tách booking nhiều ghế thành nhiều phần nếu khách đồng ý.

## Rule

```txt
Chỉ admin được tách
Chỉ tách khi khách đồng ý
Không tự động tách
Phải ghi log
Phải liên kết booking con với booking gốc
```

## API đề xuất

```txt
POST /api/admin/bookings/:bookingId/split
```

Body ví dụ:

```ts
{
  customerAgreed: true;
  note: "Khách đồng ý tách 2 ghế sang 2 chuyến";
  parts: [
    { seats: 1, tripId: "tripA" },
    { seats: 1, tripId: "tripB" }
  ];
}
```

## Kết quả

```txt
Booking gốc được đánh dấu đã tách
Tạo booking con hoặc tripBooking split records
Cập nhật ghế từng chuyến
Ghi lịch sử
Thông báo tài xế liên quan
```

---

# Màn 10: Quản lý tài xế

## Mục tiêu

Admin xem trạng thái và năng lực tài xế.

## Filter

```txt
keyword: tên, số điện thoại
status
currentLocation
routeDirection
availableSeats
vehicleType
```

## Danh sách tài xế

Cột:

```txt
Tên tài xế
Số điện thoại
Trạng thái
Vị trí hiện tại
Chiều nhận
Ghế trống
Xe
Chuyến hiện tại
Công nợ/tổng tiền
Thao tác
```

## Thao tác

```txt
Xem chi tiết
Xem chuyến của tài xế
Xem lịch sử ghế trống
Khóa/mở tài khoản nếu đã có API
Reset mật khẩu
```

Admin không cần sửa trạng thái tài xế.

---

# Màn 11: Lịch sử cập nhật ghế

## Mục tiêu

Admin xem log tài xế tự cập nhật ghế.

## Hiển thị

```txt
Tài xế
Chuyến
Ghế cũ
Ghế mới
Thời gian
Lý do
```

## API

```txt
GET /api/admin/driver-seat-logs?page=1&limit=20&driverId=&tripId=&dateFrom=&dateTo=
```

---

# Màn 12: Công nợ / đối soát

## Mục tiêu

Theo dõi tiền tài xế thu và tình hình đối soát.

Không cần công thức hoa hồng phức tạp ở bản đầu.

## Hiển thị

```txt
Tổng tiền cần thu
Tổng tiền đã thu
Tổng tiền chưa thu
Tổng tiền khách
Tổng tiền gửi hàng
Theo tài xế
Theo chuyến
Theo ngày
```

## Filter

```txt
dateFrom
dateTo
driverId
tripId
paymentStatus
routeId
```

## Xuất Excel

Cần xuất Excel cho:

```txt
Đơn hàng
Chuyến xe
Tài xế
Công nợ
Doanh thu
```

---

# Màn 13: Bảng giá

## Mục tiêu

Admin định nghĩa bảng giá và có thể nhập tay/chỉnh giá booking.

## Cần có

```txt
Danh sách bảng giá
Tạo bảng giá
Sửa bảng giá
Bật/tắt bảng giá
Giá theo tuyến
Giá theo loại xe/dịch vụ nếu có
Giá theo số ghế nếu có
```

Gửi hàng bản đầu có thể admin nhập tay.

---

# Màn 14: Thông báo admin

## Mục tiêu

Admin nhận thông báo trong hệ thống.

## UI

Icon chuông trên header.

Click vào thấy:

```txt
Thông báo chưa đọc
Thông báo đã đọc
Bộ lọc loại thông báo
Link mở chi tiết booking/trip/driver
```

## Sự kiện thông báo

```txt
Có đơn mới
Tài xế từ chối chuyến
Tài xế báo khách hủy
Tài xế báo không nghe máy/no-show
Tài xế cập nhật ghế trống
Tài xế hoàn thành chuyến
Admin/tài xế thay đổi trạng thái khách/hàng
```

Sau này có thể nâng cấp gửi Zalo/Telegram.

---

## 4. API backend cần có

Tên API có thể đổi theo source hiện tại, nhưng cần đủ logic.

```txt
GET    /api/admin/dashboard

GET    /api/admin/bookings
POST   /api/admin/bookings
GET    /api/admin/bookings/:id
PATCH  /api/admin/bookings/:id
POST   /api/admin/bookings/:id/confirm
POST   /api/admin/bookings/:id/cancel
POST   /api/admin/bookings/:id/move-trip
POST   /api/admin/bookings/:id/split

GET    /api/admin/dispatch/bookings
GET    /api/admin/dispatch/bookings/:bookingId/options
POST   /api/admin/dispatch/bookings/:bookingId/confirm

GET    /api/admin/trips
GET    /api/admin/trips/:id
POST   /api/admin/trips/:id/add-bookings
POST   /api/admin/trips/:id/cancel

GET    /api/admin/drivers
GET    /api/admin/drivers/:id
GET    /api/admin/driver-seat-logs

GET    /api/admin/reports/revenue
GET    /api/admin/reports/debts

GET    /api/admin/pricing
POST   /api/admin/pricing
PATCH  /api/admin/pricing/:id

GET    /api/admin/notifications
POST   /api/admin/notifications/:id/read

GET    /api/admin/export/bookings
GET    /api/admin/export/trips
GET    /api/admin/export/drivers
GET    /api/admin/export/debts
GET    /api/admin/export/revenue
```

---

## 5. Checklist test admin

### Test 1: Đơn mới

```txt
Khách đặt đơn
Admin nhận thông báo
Đơn hiện ở trạng thái chờ xác nhận
```

### Test 2: Admin xác nhận đơn

```txt
Admin bấm xác nhận
Đơn chuyển sang chờ điều phối
```

### Test 3: Điều phối dropdown

```txt
Dropdown có cả chuyến đang gom và tài xế rảnh
Phương án phù hợp nhất lên đầu
Không đủ ghế disabled ở cuối
```

### Test 4: Chọn chuyến đang gom

```txt
Booking được gán vào chuyến cũ
Không tạo chuyến mới
Ghế cập nhật đúng
Tài xế nhận thông báo
```

### Test 5: Chọn tài xế rảnh

```txt
Backend tạo chuyến mới
Sinh mã CX
Gán booking vào chuyến mới
Tài xế nhận thông báo
```

### Test 6: Gửi hàng

```txt
Gửi hàng được điều phối vào chuyến
Không trừ ghế
Tài xế thấy đơn hàng và tiền thu
```

### Test 7: Chuyển booking sang chuyến khác

```txt
Chuyến cũ trả ghế
Chuyến mới trừ ghế
Booking đổi chuyến
Thông báo tài xế liên quan
Có log
```

### Test 8: Tách booking

```txt
Chỉ admin được tách
Phải có customerAgreed = true
Tạo bản ghi con/split đúng
Cập nhật ghế đúng
Có log
```

### Test 9: Tài xế cập nhật ghế

```txt
Admin thấy số ghế mới
Admin thấy log cập nhật ghế
Điều phối dùng số ghế mới
```

### Test 10: Tài xế báo khách hủy/no-show

```txt
Admin nhận thông báo
Booking vào danh sách chờ xử lý
Admin hủy hoặc điều phối lại
```

### Test 11: Filter/phân trang

```txt
Đơn hàng có filter/phân trang
Điều phối có filter/phân trang
Chuyến xe có filter/phân trang
Tài xế có filter/phân trang
```

### Test 12: Xuất Excel

```txt
Xuất được đơn hàng
Xuất được chuyến xe
Xuất được tài xế
Xuất được công nợ
Xuất được doanh thu
```

---

## 6. Kết quả mong muốn

Sau khi code xong, admin có thể vận hành thật:

```txt
1. Nhận đơn mới.
2. Xác nhận khách.
3. Tạo đơn hộ khách.
4. Sửa đơn.
5. Điều phối bằng dropdown/list gợi ý.
6. Chọn chuyến đang gom hoặc tài xế rảnh.
7. Hệ thống tự gán hoặc tạo chuyến mới.
8. Theo dõi chuyến xe.
9. Chuyển/tách booking khi khách đồng ý.
10. Xử lý khách hủy/no-show/không nghe máy.
11. Theo dõi tài xế và ghế trống.
12. Theo dõi tiền thu/công nợ.
13. Xuất Excel báo cáo.
14. Nhận thông báo qua chuông admin.
```

Admin module phải đủ để điều phối xe ghép thực tế, không chỉ là màn CRUD cơ bản.
