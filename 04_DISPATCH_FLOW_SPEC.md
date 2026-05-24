# 04 - DISPATCH FLOW SPEC

Đây là file quan trọng nhất. Không code đúng file này thì app không vận hành được.

# 1. Mục tiêu màn điều phối

Admin phải điều phối được từ đơn khách thành chuyến xe thực tế.

Không được làm `/admin/dispatch` chỉ là danh sách chuyến.

Màn điều phối đúng gồm 3 vùng:

```txt
Cột 1: Đơn chưa gán
Cột 2: Chuyến đang gom khách
Cột 3: Tài xế rảnh/phù hợp
```

# 2. Cột 1: Đơn chưa gán

Nguồn dữ liệu:

```txt
bookings
where assignedTripId is null
and status in new/contacted/quoted/deposited/waiting_dispatch
```

Hiển thị mỗi đơn:

```txt
Checkbox
Mã đơn
Giờ đi
Tuyến
Chiều đi
Điểm đón
Điểm trả
Loại đơn
Số khách / cân nặng
Giá tạm tính/final
Hoa hồng dự kiến
Trạng thái
Ghi chú
```

Ví dụ UI:

```txt
□ DXM123
17:00 | Sài Gòn -> Đức Linh
Bình Tân -> Võ Xu
2 khách | 500.000 | HH 60.000
Chờ điều phối
```

Thao tác:

- Chọn 1 đơn.
- Chọn nhiều đơn.
- Xem chi tiết đơn.
- Gọi/Zalo khách.
- Tạo chuyến từ đơn đã chọn.

# 3. Cột 2: Chuyến đang gom khách

Nguồn dữ liệu:

```txt
trips
where status in collecting/ready
```

Hiển thị:

```txt
Mã chuyến
Tuyến
Giờ xuất phát
Tài xế
Xe
Ghế đã đặt/tổng/còn trống
Doanh thu
Hoa hồng admin
Công nợ tài xế
Trạng thái
```

Ví dụ:

```txt
CX001
Sài Gòn -> Đức Linh
17:30 hôm nay
Anh A | Xe 7 chỗ
Ghế 2/5, còn 3
DT 500.000 | HH 60.000 | Nợ 60.000
[Gán đơn đã chọn]
```

Thao tác:

- Gán đơn đã chọn vào chuyến.
- Xem chi tiết chuyến.
- Tách booking khỏi chuyến.
- Đổi tài xế.
- Đổi giờ.
- Cập nhật trạng thái chuyến.

# 4. Cột 3: Tài xế rảnh/phù hợp

Nguồn dữ liệu:

```txt
drivers
where status = available
```

Hiển thị:

```txt
Tên tài xế
SĐT
Vị trí hiện tại
Chiều nhận
Tuyến nhận
Xe
Số ghế trống
Có nhận hàng không
```

Ví dụ:

```txt
Anh A
Đang ở: Bình Tân
Nhận chiều: Sài Gòn -> Đức Linh
Xe 7 chỗ | còn 4 ghế
[Tạo chuyến với tài xế này]
```

Thao tác:

- Tạo chuyến với tài xế này từ booking đã chọn.
- Gọi/Zalo tài xế.
- Xem lịch sử/công nợ tài xế.

# 5. Filter điều phối

Filter trên đầu màn:

```txt
Ngày đi
Từ giờ
Đến giờ
Tuyến
Chiều
Loại đơn
Trạng thái
Khu vực đón
Khu vực trả
Keyword SĐT/mã đơn
```

# 6. Gán đơn vào chuyến

## API

```txt
POST /api/admin/trips/:id/add-bookings
```

Body:

```json
{
  "bookingIds": [1, 2]
}
```

## Rule

1. Lấy trip hiện tại.
2. Lấy existing tripBookings với tripId + bookingIds.
3. Tạo newBookingIds = bookingIds chưa có.
4. Nếu newBookingIds rỗng:
   - added = 0
   - skipped = bookingIds.length
   - không cộng gì
5. Lấy bookings mới.
6. Tính totalSeatsToAdd = tổng passengerCount.
7. Nếu totalSeatsToAdd > availableSeats: trả lỗi.
8. Tạo trip_bookings.
9. Update bookings:
   - assignedTripId = trip.id
   - status = assigned
10. Update trip:
   - bookedSeats += totalSeatsToAdd
   - availableSeats -= totalSeatsToAdd
   - totalCustomerAmount += tổng booking final/estimated
   - adminCommission += tổng commission
   - driverNetAmount += tổng driver amount
   - driverDebtAmount/adminOwesDriverAmount theo paymentReceiver
11. Tạo trip_passenger_financials cho booking mới.
12. Trả added/skipped.

## Không được

- Không dùng upsert rồi vẫn cộng tiền.
- Không để availableSeats âm.
- Không cho booking cancelled/no_show vào trip.
- Không gán booking đã thuộc trip khác active nếu chưa tách.

# 7. Tạo chuyến mới từ đơn đã chọn

Thao tác:

1. Admin chọn booking.
2. Admin chọn tài xế hoặc tạo chuyến trống.
3. Hệ thống tự đề xuất:
   - routeId theo booking đầu tiên.
   - departureAt theo scheduledAt booking đầu tiên.
   - totalSeats theo xe.sellableSeats.
4. Admin xác nhận tạo chuyến.
5. Sau khi tạo, tự gọi add-bookings.

# 8. Tài xế phù hợp

Gợi ý tài xế theo điểm:

```txt
+ đúng status available
+ cùng chiều
+ cùng tuyến
+ vị trí gần điểm đón
+ đủ ghế
+ có nhận hàng nếu booking có cargo
+ xe phù hợp
```

Giai đoạn đầu chỉ cần filter đơn giản:

```txt
status available
seatsFree >= số khách đã chọn
directionPreference chứa direction
```

# 9. Acceptance test điều phối

```txt
[ ] Admin vào /admin/dispatch thấy đơn chưa gán.
[ ] Admin thấy chuyến đang gom.
[ ] Admin thấy tài xế rảnh.
[ ] Chọn 1 booking gán vào trip thành công.
[ ] Chọn lại booking đó gán lần 2 -> skipped, không cộng trùng.
[ ] Gán booking vượt ghế -> báo lỗi.
[ ] Tạo chuyến mới từ booking đã chọn thành công.
[ ] Tạo chuyến với tài xế rảnh thành công.
[ ] Tài xế login thấy chuyến được gán.
[ ] Doanh thu/hoa hồng/công nợ cập nhật đúng.
```
