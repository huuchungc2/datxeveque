# 01 - SPEC SẢN PHẨM ĐẦY ĐỦ

# 1. Định nghĩa sản phẩm

Đặt Xe Về Quê là hệ thống đặt xe và điều phối vận chuyển địa phương cho tuyến quê, không phải chỉ là website form đặt xe.

Luồng lõi:

```txt
Khách đặt đơn không cần đăng nhập
→ Admin thấy đơn chưa gán theo ngày/tuyến/giờ/loại đơn
→ Admin gom đơn thành chuyến
→ Admin biết tài xế nào rảnh, đang ở đâu, nhận chiều nào, còn mấy ghế
→ Admin gán tài xế/chuyến
→ Tài xế nhận/từ chối chuyến
→ Hệ thống tính giá, hoa hồng, công nợ
→ Admin/tài xế đối soát
→ Báo cáo doanh thu/hoa hồng theo tài xế/ngày/tháng/tuyến
```

# 2. Nhóm người dùng

## 2.1 Khách vãng lai

- Không cần đăng nhập vẫn đặt được.
- Nhập tên, số điện thoại/Zalo, tuyến, thời gian, loại dịch vụ.
- Có thể tra cứu đơn bằng mã đơn + số điện thoại.

## 2.2 Khách có tài khoản

- Đăng nhập xem lịch sử đơn.
- Đặt lại đơn cũ.
- Theo dõi trạng thái đơn.

## 2.3 Tài xế

- Đăng nhập.
- Cập nhật rảnh/bận, vị trí, chiều nhận, số ghế.
- Xem chuyến được giao.
- Nhận/từ chối chuyến.
- Xem công nợ của mình.

## 2.4 Admin

- Quản lý toàn bộ.
- Tiếp nhận đơn.
- Điều phối chuyến.
- Quản lý tài xế/xe.
- Cài giá/hoa hồng.
- Đối soát công nợ.
- Xem báo cáo.
- Cài đặt website/SEO.

## 2.5 Điều phối viên

- Tập trung quản lý đơn/chuyến/tài xế.
- Không nhất thiết được xem toàn bộ báo cáo tài chính nếu admin giới hạn.

## 2.6 Kế toán

- Xem báo cáo.
- Xem công nợ.
- Xác nhận thanh toán.

# 3. Dịch vụ

Các loại đơn/dịch vụ bắt buộc:

```txt
shared_ride    = Xe ghép
private_ride   = Bao xe
cargo          = Gửi hàng
market         = Đi chợ quê
contract       = Xe hợp đồng
wedding        = Xe đám cưới
tour           = Xe tham quan
hospital       = Xe đi bệnh viện
airport        = Xe sân bay
```

# 4. Tuyến ban đầu

Bắt buộc seed sẵn:

```txt
Sài Gòn -> Đức Linh
Đức Linh -> Sài Gòn
Sài Gòn -> Tánh Linh
Tánh Linh -> Sài Gòn
Sài Gòn -> Võ Xu
Sài Gòn -> Mê Pu
Sài Gòn -> Đức Tài
Sài Gòn -> Lạc Tánh
Sài Gòn -> Bắc Ruộng
Sài Gòn -> Đồng Kho
```

# 5. Website public

Chức năng:

- Trang chủ.
- Trang tuyến.
- Trang dịch vụ.
- Trang đặt xe.
- Trang gửi hàng.
- Trang đi chợ quê.
- Trang thuê xe hợp đồng.
- Trang liên hệ.
- Trang bài viết/kinh nghiệm.
- Tra cứu đơn.
- Đăng ký/đăng nhập.

# 6. Admin

Chức năng chính:

- Dashboard.
- Đơn hàng.
- Điều phối.
- Chuyến xe.
- Tài xế.
- Xe.
- Khách hàng.
- User/phân quyền.
- Tuyến.
- Dịch vụ.
- Giá.
- Hoa hồng.
- Công nợ/đối soát.
- Báo cáo.
- Website settings.
- Media upload.
- Bài viết SEO.
- Nhật ký hệ thống.

# 7. Tài xế

Chức năng:

- Chuyến của tôi.
- Nhận/từ chối chuyến.
- Cập nhật trạng thái.
- Cập nhật vị trí.
- Cập nhật chiều nhận.
- Cập nhật số ghế trống.
- Xem khách/hàng trong chuyến.
- Xem công nợ.
- Xem lịch sử chuyến.
- Gọi/Zalo admin.

# 8. Nguyên tắc vận hành

## 8.1 Booking và Trip

- Booking = đơn của khách.
- Trip = chuyến xe thực tế.
- Một trip có nhiều booking.
- Một booking chỉ được thuộc tối đa một trip active tại một thời điểm.

## 8.2 Điều phối là lõi

Màn điều phối đúng phải có:

```txt
Cột 1: Đơn chưa gán
Cột 2: Chuyến đang gom khách
Cột 3: Tài xế rảnh/phù hợp
```

Không được làm màn điều phối chỉ là danh sách chuyến.

## 8.3 Tài chính là snapshot

Giá/hoa hồng tại thời điểm tạo đơn/chuyến phải lưu snapshot. Sau này đổi bảng giá không được làm thay đổi đơn cũ.

## 8.4 Logic dùng tiếng Anh, UI dịch tiếng Việt

DB/code dùng status tiếng Anh:

```txt
active, inactive, new, assigned, completed...
```

UI hiển thị tiếng Việt:

```txt
Đang chạy, Tạm tắt, Mới tạo, Đã gán, Hoàn thành...
```

# 9. Không được làm

- Không hard-code tuyến trong UI.
- Không hard-code giá trong UI.
- Không hard-code hotline trong UI.
- Không dùng status tiếng Việt làm logic DB.
- Không dùng `count + 1` tạo mã đơn/chuyến.
- Không cho public reset mật khẩu chỉ bằng số điện thoại.
- Không gán trùng booking vào chuyến.
- Không cho ghế còn lại âm.
- Không trả API mỗi chỗ một format.
