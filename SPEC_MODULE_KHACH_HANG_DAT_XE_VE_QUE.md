# SPEC MODULE KHÁCH HÀNG - ĐẶT XE VỀ QUÊ

## 1. Mục tiêu

Hoàn thiện module khách hàng để khách có thể:

1. Đặt xe nhanh mà không bắt buộc đăng nhập.
2. Gửi hàng qua website.
3. Đặt xe kèm gửi hàng/mang hàng theo.
4. Nhận mã đơn sau khi đặt.
5. Tra cứu đơn bằng mã đơn + số điện thoại.
6. Nếu có tài khoản thì xem lịch sử đơn của mình.
7. Gửi yêu cầu sửa/hủy đơn theo đúng trạng thái nghiệp vụ.
8. Xem thông tin tài xế/chuyến nếu đơn đã được điều phối.

---

## 2. Nguyên tắc nghiệp vụ đã chốt

### 2.1 Không bắt buộc khách đăng nhập

Khách có thể đặt xe/gửi hàng bằng:

```txt
Họ tên
Số điện thoại
Thông tin tuyến/ngày/giờ/điểm đón/trả
```

Sau khi đặt thành công, hệ thống trả về mã đơn.

Khách dùng mã đơn + số điện thoại để tra cứu.

### 2.2 Có thể có tài khoản khách

Nếu khách đăng nhập, khách xem được:

```txt
Danh sách đơn của tôi
Chi tiết đơn
Lịch sử trạng thái
Thông tin chuyến/tài xế nếu đã có
```

Nhưng tài khoản khách không bắt buộc ở bản đầu.

### 2.3 Khách được tra cứu đơn

Cần có trang:

```txt
/tra-cuu-don
```

Khách nhập:

```txt
Mã đơn
Số điện thoại
```

Hệ thống trả về thông tin đơn nếu đúng mã + số điện thoại.

Không được để khách tra cứu được đơn của người khác.

### 2.4 Sau khi đặt xong

Màn đặt thành công cần hiển thị:

```txt
Đặt xe/gửi hàng thành công
Mã đơn: DX...
Trạng thái: Chờ xác nhận
Nhân viên sẽ liên hệ xác nhận qua điện thoại/Zalo
Hotline/Zalo: 0962100600
```

Có nút:

```txt
Gọi hotline
Nhắn Zalo
Tra cứu đơn
```

### 2.5 Khách sửa/hủy đơn

Trước khi admin xác nhận:

```txt
Khách được gửi yêu cầu sửa/hủy
```

Sau khi đã điều phối tài xế:

```txt
Khách không tự sửa/hủy trực tiếp
Chỉ hiện nút gọi hotline/Zalo hoặc gửi yêu cầu
Admin xử lý
```

Không cho khách tự sửa lung tung sau khi tài xế đã nhận chuyến.

### 2.6 Khách thấy thông tin tài xế/chuyến

Khi booking đã được điều phối, khách có thể thấy:

```txt
Đã có tài xế
Tên tài xế
Loại xe
Biển số xe nếu có
Nút gọi tài xế
Nút gọi hotline
```

Không cần hiển thị số điện thoại đầy đủ nếu muốn bảo mật.

Có thể dùng nút gọi qua app.

### 2.7 Chưa cần theo dõi vị trí xe/GPS

Bản đầu chưa cần bản đồ hoặc GPS.

Không cần hiển thị vị trí xe real-time.

### 2.8 Khách có thể gửi hàng

Form gửi hàng đã có/hoặc cần đảm bảo đủ các field:

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
```

Gửi hàng không tính ghế.

Giá gửi hàng/thu tiền trao đổi giữa khách và tài xế/admin, không cần thanh toán online.

### 2.9 Khách có thể đặt xe kèm gửi hàng/mang hàng theo

Trong form đặt xe cần có option:

```txt
Tôi có gửi hàng/mang hàng theo
```

Nếu chọn, hiển thị thêm phần mô tả hàng:

```txt
Mô tả hàng
Ghi chú hàng
Điểm giao hàng nếu khác điểm trả
Người nhận nếu cần
SĐT người nhận nếu cần
```

Hàng đi kèm không tính thêm ghế.

Số ghế chỉ tính theo số khách.

### 2.10 Trạng thái chi tiết cho khách để sau

Khách không cần xem quá nhiều trạng thái chi tiết ở bản đầu.

Không cần hiển thị toàn bộ luồng kỹ thuật như:

```txt
Đang đón
Đã đón
Đang trả
Đã trả
Đang lấy hàng
Đã giao hàng
```

Bản đầu chỉ cần trạng thái đơn giản:

```txt
Chờ xác nhận
Đã xác nhận
Đã có tài xế
Đang xử lý
Hoàn thành
Đã hủy
```

### 2.11 Không cần thanh toán online

Bản đầu không cần cổng thanh toán.

Tiền xe/tiền hàng trao đổi giữa khách và tài xế/admin.

Khách chỉ cần thấy:

```txt
Tổng tiền dự kiến nếu có
Hoặc thông báo: Giá sẽ được xác nhận khi nhân viên liên hệ
```

---

## 3. Màn hình khách hàng cần có

# Màn 1: Form đặt xe

## Mục tiêu

Khách đặt xe nhanh, không bắt buộc đăng nhập.

## Field bắt buộc

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
```

## Field thêm

```txt
Tôi có gửi hàng/mang hàng theo
```

Nếu bật option này, hiện thêm:

```txt
Mô tả hàng
Ghi chú hàng
Người nhận nếu khác khách
SĐT người nhận nếu cần
Điểm giao hàng nếu khác điểm trả
```

## Logic

- Số ghế chỉ tính theo khách.
- Hàng đi kèm không tính ghế.
- Sau khi submit tạo booking loại `PASSENGER` hoặc `PASSENGER_WITH_PARCEL`.
- Trạng thái ban đầu: `PENDING_CONFIRMATION`.
- Trả về mã đơn.

## Kết quả sau submit

Hiển thị màn đặt thành công:

```txt
Đặt xe thành công
Mã đơn: DX...
Nhân viên sẽ liên hệ xác nhận.
```

---

# Màn 2: Form gửi hàng

## Mục tiêu

Khách tạo đơn gửi hàng riêng.

## Field

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
```

## Logic

- Tạo booking loại `PARCEL`.
- Không tính ghế.
- Không trừ ghế.
- Trạng thái ban đầu: `PENDING_CONFIRMATION`.
- Admin xác nhận và điều phối sau.

## Kết quả sau submit

```txt
Gửi hàng thành công
Mã đơn: DX...
Nhân viên sẽ liên hệ xác nhận.
```

---

# Màn 3: Đặt thành công

## Nội dung

Hiển thị:

```txt
Đặt thành công
Mã đơn
Loại đơn: Chở khách / Gửi hàng / Khách + hàng
Trạng thái: Chờ xác nhận
Tuyến
Ngày giờ
Điểm đón/lấy hàng
Điểm trả/giao hàng
Hotline/Zalo: 0962100600
```

## Nút hành động

```txt
Gọi hotline
Nhắn Zalo
Tra cứu đơn
Về trang chủ
```

---

# Màn 4: Tra cứu đơn

## URL đề xuất

```txt
/tra-cuu-don
```

## Form

```txt
Mã đơn
Số điện thoại
```

## Logic bảo mật

Chỉ trả đơn khi:

```txt
Mã đơn đúng
Số điện thoại khớp với đơn
```

Không cho tra cứu chỉ bằng mã đơn.

## Kết quả hiển thị

```txt
Mã đơn
Loại đơn
Trạng thái đơn giản
Tuyến
Ngày giờ
Điểm đón/lấy hàng
Điểm trả/giao hàng
Số ghế nếu có
Tổng tiền dự kiến nếu có
Thông tin tài xế/chuyến nếu đã điều phối
Nút gọi hotline/Zalo
```

Nếu không tìm thấy:

```txt
Không tìm thấy đơn hoặc số điện thoại không đúng.
```

---

# Màn 5: Chi tiết đơn khách hàng

## Áp dụng cho

- Khách tra cứu đơn.
- Khách đăng nhập xem đơn của mình.

## Nội dung

```txt
Mã đơn
Loại đơn
Trạng thái
Tuyến
Ngày giờ
Thông tin khách/người gửi/người nhận
Điểm đón/lấy hàng
Điểm trả/giao hàng
Số ghế nếu là chở khách
Mô tả hàng nếu có
Ghi chú
Tổng tiền dự kiến nếu có
Thông tin tài xế nếu đã có
Thông tin xe nếu đã có
```

## Thông tin tài xế nếu đã điều phối

Hiển thị:

```txt
Tên tài xế
Loại xe
Biển số xe nếu có
Nút gọi tài xế
Nút gọi hotline
```

Không cần bản đồ/GPS.

## Yêu cầu sửa/hủy

Nếu đơn chưa xác nhận:

```txt
Hiện nút Yêu cầu sửa
Hiện nút Yêu cầu hủy
```

Nếu đơn đã điều phối:

```txt
Ẩn nút sửa/hủy trực tiếp
Hiện hướng dẫn: Vui lòng gọi hotline/Zalo để được hỗ trợ.
```

---

# Màn 6: Tài khoản khách / Đơn của tôi

## Mục tiêu

Nếu khách có tài khoản, khách xem được lịch sử đơn.

## Nội dung

Danh sách đơn:

```txt
Mã đơn
Loại đơn
Tuyến
Ngày giờ
Trạng thái
Tổng tiền dự kiến
Nút xem chi tiết
```

## Bảo mật

Khách chỉ được xem đơn của chính mình.

Không được thấy đơn khách khác.

---

## 4. API backend cần có

Tên API có thể điều chỉnh theo source hiện tại.

### 4.1 Tạo booking công khai

```txt
POST /api/bookings
```

Hỗ trợ type:

```txt
PASSENGER
PARCEL
PASSENGER_WITH_PARCEL
```

### 4.2 Tra cứu đơn công khai

```txt
POST /api/bookings/lookup
```

Body:

```ts
{
  code: string;
  phone: string;
}
```

Rule:

```txt
code + phone phải khớp
Không trả dữ liệu nhạy cảm quá mức
```

### 4.3 Khách đăng nhập xem đơn của tôi

```txt
GET /api/customer/bookings?page=1&limit=20
```

Chỉ trả booking của user đang đăng nhập.

### 4.4 Chi tiết đơn của khách

```txt
GET /api/customer/bookings/:id
```

Hoặc với khách không đăng nhập, dùng lookup:

```txt
POST /api/bookings/lookup
```

### 4.5 Yêu cầu sửa/hủy đơn

```txt
POST /api/bookings/:id/request-change
POST /api/bookings/:id/request-cancel
```

Chỉ cho gửi request nếu trạng thái hợp lệ.

Nếu đã điều phối tài xế, trả về thông báo gọi hotline/Zalo.

---

## 5. Mapping trạng thái cho khách

Không hiển thị enum kỹ thuật.

Mapping đề xuất:

```txt
PENDING_CONFIRMATION → Chờ xác nhận
CONFIRMED → Đã xác nhận
WAITING_DISPATCH → Đang xử lý
ASSIGNED → Đã có tài xế
IN_PROGRESS / ON_TRIP → Đang xử lý
COMPLETED → Hoàn thành
CANCELLED / CANCELLED_BY_ADMIN → Đã hủy
WAITING_ADMIN_REVIEW → Đang xử lý
WAITING_REDISPATCH → Đang xử lý
```

Với gửi hàng cũng dùng trạng thái đơn giản tương tự.

---

## 6. Checklist test khách hàng

### Test 1: Đặt xe không đăng nhập

Kỳ vọng:

```txt
Tạo booking thành công
Có mã đơn
Trạng thái chờ xác nhận
Không bắt đăng nhập
```

### Test 2: Đặt xe kèm hàng

Kỳ vọng:

```txt
Có option Tôi có gửi hàng/mang hàng theo
Hàng không tính ghế
Booking tạo đúng type PASSENGER_WITH_PARCEL
```

### Test 3: Gửi hàng

Kỳ vọng:

```txt
Tạo booking type PARCEL
Không tính ghế
Có đầy đủ người gửi/người nhận/điểm lấy/giao/mô tả hàng
```

### Test 4: Màn đặt thành công

Kỳ vọng:

```txt
Hiện mã đơn
Hiện hotline/Zalo
Có nút gọi hotline/nhắn Zalo/tra cứu đơn
```

### Test 5: Tra cứu đơn

Kỳ vọng:

```txt
Nhập đúng mã đơn + số điện thoại thì thấy đơn
Nhập sai số điện thoại thì không thấy
Không lộ đơn người khác
```

### Test 6: Khách đăng nhập xem đơn

Kỳ vọng:

```txt
Khách thấy đơn của mình
Không thấy đơn khách khác
Có phân trang nếu nhiều đơn
```

### Test 7: Thông tin tài xế sau điều phối

Kỳ vọng:

```txt
Nếu đã có tài xế thì khách thấy tên tài xế, loại xe, biển số nếu có, nút gọi
Không cần bản đồ/GPS
```

### Test 8: Yêu cầu sửa/hủy

Kỳ vọng:

```txt
Trước xác nhận: khách gửi yêu cầu sửa/hủy được
Sau khi đã điều phối: không cho tự sửa/hủy trực tiếp, hiện hotline/Zalo
```

### Test 9: Không thanh toán online

Kỳ vọng:

```txt
Không có cổng thanh toán online
Chỉ hiển thị tiền dự kiến nếu có
Tiền trao đổi giữa khách và tài xế/admin
```

---

## 7. Kết quả mong muốn

Sau khi hoàn thiện module khách hàng:

```txt
1. Khách đặt xe nhanh được, không cần đăng nhập.
2. Khách gửi hàng được.
3. Khách đặt xe kèm hàng được.
4. Khách nhận mã đơn sau khi đặt.
5. Khách tra cứu đơn bằng mã đơn + số điện thoại.
6. Khách có tài khoản xem được đơn của mình.
7. Khách thấy thông tin tài xế/chuyến nếu đã điều phối.
8. Khách gửi yêu cầu sửa/hủy đúng trạng thái.
9. Không cần GPS.
10. Không cần thanh toán online.
```

Module khách hàng phải đơn giản, dễ dùng, ưu tiên đặt nhanh và liên hệ hotline/Zalo.
