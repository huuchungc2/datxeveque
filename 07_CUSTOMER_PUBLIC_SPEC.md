# 07 - CUSTOMER & PUBLIC SPEC

# 1. Trang public

- Trang chủ.
- Trang đặt xe.
- Trang tuyến.
- Trang dịch vụ.
- Trang gửi hàng.
- Trang đi chợ quê.
- Trang thuê xe.
- Trang liên hệ.
- Trang kinh nghiệm/bài viết.
- Tra cứu đơn.
- Đăng ký.
- Đăng nhập.

# 2. Khách vãng lai đặt đơn

Không cần đăng nhập.

Form chung:

```txt
Loại đơn
Họ tên
Số điện thoại/Zalo
Tuyến
Chiều đi
Ngày giờ
Điểm đón
Điểm trả
Ghi chú
```

# 3. Form theo loại đơn

## Xe ghép

```txt
Số khách
Hành lý
```

## Bao xe

```txt
Loại xe
Số khách
Có cần đi 2 chiều không
```

## Gửi hàng

```txt
Người gửi
SĐT người gửi
Người nhận
SĐT người nhận
Mô tả hàng
Cân nặng
Điểm lấy hàng
Điểm giao hàng
```

## Đi chợ quê

```txt
Danh sách món cần mua
Ngân sách dự kiến
Ngày cần giao
Điểm giao
```

## Hợp đồng/đám cưới/tham quan/bệnh viện/sân bay

```txt
Lịch trình
Ngày giờ
Số khách
Loại xe
Điểm đón
Điểm trả
Ghi chú
```

# 4. Giá tạm tính

Khi có đủ loại dịch vụ + tuyến + số lượng, gọi:

```txt
POST /api/pricing/estimate
```

Hiển thị:

```txt
Giá tạm tính
Hoa hồng không hiển thị cho khách
Ghi chú: Nhân viên sẽ xác nhận lại trước khi chốt chuyến
```

# 5. Sau khi đặt

Hiển thị:

```txt
Đặt xe thành công
Mã đơn: DX...
Nhân viên sẽ liên hệ xác nhận qua điện thoại/Zalo
```

Có nút:

```txt
Gọi hotline
Chat Zalo
Tra cứu đơn
```

# 6. Khách đăng nhập

URL:

```txt
/khach
```

Hiển thị:

- Lịch sử đơn.
- Mã đơn.
- Tuyến.
- Ngày đi.
- Trạng thái.
- Tổng tiền.
- Xem chi tiết.

Khách chỉ thấy đơn của mình.

# 7. Tra cứu đơn

URL:

```txt
/tra-cuu-don
```

Input:

```txt
Mã đơn
Số điện thoại
```

Output:

- Thông tin đơn.
- Trạng thái.
- Tuyến.
- Ngày giờ.
- Ghi chú xác nhận.
