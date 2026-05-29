# CẬP NHẬT LOGIC GỬI HÀNG - ĐẶT XE VỀ QUÊ

## 1. Chốt nghiệp vụ gửi hàng

Đơn gửi hàng KHÔNG tính là 1 ghế.

Gửi hàng là một loại đơn riêng, có thể được điều phối chung với chuyến xe chở khách nếu phù hợp tuyến/ngày/giờ, nhưng không làm giảm số ghế còn trống của xe.

Ví dụ:

- Chuyến CX001 xe 7 chỗ.
- Đã có 4 khách.
- Còn 3 ghế.
- Gán thêm 1 đơn gửi hàng.
- Kết quả đúng: vẫn còn 3 ghế, không trừ ghế.

## 2. Loại đơn trong hệ thống

Hệ thống nên có loại đơn:

```txt
PASSENGER = Chở khách
PARCEL    = Gửi hàng
PASSENGER_WITH_PARCEL = Khách đi kèm hàng
```

Trong đó:

- `PASSENGER`: tính theo số ghế khách đặt.
- `PARCEL`: không tính ghế.
- `PASSENGER_WITH_PARCEL`: tính ghế theo số khách, hàng đi kèm không tính thêm ghế.

## 3. Logic tạo đơn gửi hàng

Khi khách tạo đơn gửi hàng, cần nhập:

- Tên người gửi.
- Số điện thoại người gửi.
- Tên người nhận.
- Số điện thoại người nhận.
- Tuyến gửi.
- Ngày gửi mong muốn.
- Giờ gửi mong muốn nếu có.
- Điểm lấy hàng.
- Điểm giao hàng.
- Loại hàng.
- Kích thước/cân nặng ước lượng.
- Ghi chú.
- Phí gửi hàng nếu có.

Trạng thái ban đầu của đơn gửi hàng:

```txt
PENDING_CONFIRMATION
```

Nghĩa là chờ admin xác nhận.

## 4. Gửi hàng không tự động gán chuyến

Đơn gửi hàng chỉ được hệ thống gợi ý điều phối.

Hệ thống KHÔNG tự động gán đơn gửi hàng vào chuyến nếu admin chưa xác nhận.

Admin có 2 cách xử lý:

```txt
1. Xác nhận theo gợi ý của hệ thống.
2. Tự điều phối thủ công vào chuyến khác.
```

## 5. Logic gợi ý điều phối cho đơn gửi hàng

Khi có đơn gửi hàng, hệ thống gợi ý các chuyến phù hợp theo điều kiện:

```txt
1. Cùng tuyến hoặc tuyến phù hợp.
2. Cùng ngày gửi/ngày chạy.
3. Giờ chạy phù hợp với giờ gửi mong muốn.
4. Chuyến chưa chạy.
5. Chuyến chưa hoàn thành.
6. Chuyến chưa hủy.
7. Tài xế còn hoạt động.
8. Xe còn hoạt động.
```

Không bắt buộc kiểm tra số ghế còn trống, vì gửi hàng không tính ghế.

Tuy nhiên, nếu sau này có quản lý khoang chứa/cốp xe thì có thể thêm điều kiện:

```txt
Chuyến còn khả năng nhận hàng.
```

## 6. Trạng thái chuyến được phép gợi ý gửi hàng

Được phép gợi ý nếu chuyến ở trạng thái:

```txt
OPEN
SCHEDULED
```

Không được gợi ý nếu chuyến ở trạng thái:

```txt
IN_PROGRESS
COMPLETED
CANCELLED
```

Với trạng thái `FULL`, tùy nghiệp vụ:

```txt
Nếu FULL chỉ nghĩa là hết ghế nhưng vẫn còn nhận hàng thì vẫn có thể gợi ý gửi hàng.
Nếu FULL nghĩa là xe đã chốt không nhận thêm gì nữa thì không gợi ý.
```

Khuyến nghị:

```txt
FULL = hết ghế khách nhưng vẫn có thể nhận hàng nếu admin cho phép.
LOCKED = đã khóa chuyến, không nhận thêm khách/hàng.
```

## 7. Logic khi admin gán đơn gửi hàng vào chuyến

Khi admin gán đơn gửi hàng vào chuyến:

```txt
Không tăng bookedSeats.
Không giảm availableSeats.
Không làm availableSeats âm.
Không tính đơn hàng là 1 ghế.
Có thể cộng phí gửi hàng vào doanh thu chuyến.
Có thể cộng công nợ/hoa hồng theo cấu hình gửi hàng.
Booking gửi hàng chuyển sang ASSIGNED.
```

Ví dụ đúng:

```txt
Trước khi gán:
CX001 có 7 ghế.
Đã đặt 4 ghế.
Còn 3 ghế.

Gán đơn gửi hàng GH001 vào CX001.

Sau khi gán:
Đã đặt vẫn là 4 ghế.
Còn trống vẫn là 3 ghế.
Doanh thu tăng thêm phí gửi hàng.
Đơn GH001 được gán vào CX001.
```

## 8. Logic admin tự điều phối bằng tay

Admin có quyền bỏ qua gợi ý của hệ thống và tự chọn chuyến khác để gán đơn gửi hàng.

Khi admin tự chọn chuyến, hệ thống vẫn phải kiểm tra:

```txt
1. Chuyến chưa bị hủy.
2. Chuyến chưa hoàn thành.
3. Chuyến chưa đang chạy nếu không cho nhận thêm hàng khi đang chạy.
4. Tài xế/xe còn hoạt động.
5. Đơn gửi hàng chưa bị hủy.
6. Đơn gửi hàng chưa được gán trùng vào cùng chuyến.
```

## 9. Logic chống gán trùng đơn gửi hàng

Nếu admin gán cùng một đơn gửi hàng vào cùng một chuyến lần 2:

```txt
Không tạo record trùng.
Không cộng trùng doanh thu.
Không cộng trùng công nợ.
Không thay đổi số ghế.
API trả về đã bỏ qua/đã tồn tại.
```

## 10. Logic doanh thu và công nợ gửi hàng

Gửi hàng không tính ghế nhưng vẫn có thể tính tiền.

Khi gán đơn gửi hàng vào chuyến:

```txt
totalParcelAmount tăng theo phí gửi hàng.
totalTripAmount có thể tăng nếu tổng doanh thu bao gồm cả khách + hàng.
driverDebtAmount tăng theo cấu hình nếu tài xế phải nộp lại tiền hàng/hoa hồng.
adminCommission tăng theo cấu hình nếu có hoa hồng gửi hàng.
```

Nên tách rõ:

```txt
passengerRevenue = doanh thu chở khách
parcelRevenue    = doanh thu gửi hàng
totalRevenue     = passengerRevenue + parcelRevenue
```

## 11. Checklist test gửi hàng

### Test 1: Tạo đơn gửi hàng

Kỳ vọng:

```txt
Tạo được đơn gửi hàng.
Đơn ở trạng thái PENDING_CONFIRMATION.
Không tạo chuyến tự động.
Không tính ghế.
```

### Test 2: Gợi ý chuyến cho đơn gửi hàng

Kỳ vọng:

```txt
Hệ thống gợi ý chuyến cùng tuyến/cùng ngày/giờ phù hợp.
Không yêu cầu chuyến phải còn ghế.
```

### Test 3: Admin xác nhận gán theo gợi ý

Kỳ vọng:

```txt
Đơn gửi hàng được gán vào chuyến.
Số ghế đã đặt không đổi.
Số ghế còn trống không đổi.
Doanh thu gửi hàng tăng đúng nếu có phí.
```

### Test 4: Admin tự điều phối bằng tay

Kỳ vọng:

```txt
Admin chọn chuyến khác để gán đơn gửi hàng.
Hệ thống cho gán nếu chuyến hợp lệ.
Không trừ ghế.
```

### Test 5: Gán trùng đơn gửi hàng

Kỳ vọng:

```txt
Không tạo record trùng.
Không cộng trùng doanh thu.
Không cộng trùng công nợ.
Không thay đổi ghế.
```

### Test 6: Chuyến đã FULL ghế khách

Kỳ vọng tùy cấu hình:

```txt
Nếu FULL vẫn cho nhận hàng: hệ thống vẫn có thể gợi ý đơn gửi hàng.
Nếu chuyến đã LOCKED: không gợi ý và không cho gán thêm hàng.
```

## 12. Chốt logic cho Cursor/dev

```txt
Đơn gửi hàng là PARCEL booking.
PARCEL booking không tính seat.
Khi gán PARCEL booking vào trip, không tăng bookedSeats và không giảm availableSeats.
Hệ thống chỉ gợi ý chuyến phù hợp cho đơn gửi hàng.
Admin là người xác nhận gán theo gợi ý hoặc tự điều phối bằng tay.
Không tự động gán đơn gửi hàng vào chuyến.
Không được xem gửi hàng là 1 ghế.
Doanh thu/công nợ gửi hàng phải tách rõ với doanh thu/công nợ chở khách.
Phải chống gán trùng đơn gửi hàng như booking khách.
```
