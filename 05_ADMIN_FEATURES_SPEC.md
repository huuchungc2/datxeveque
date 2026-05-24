# 05 - ADMIN FEATURES SPEC

# 1. Dashboard tổng quan

Hiển thị:

- Tổng đơn hôm nay
- Đơn chưa xử lý
- Đơn chờ điều phối
- Chuyến đang gom khách
- Chuyến đang chạy
- Tài xế rảnh
- Doanh thu hôm nay
- Hoa hồng hôm nay
- Công nợ tài xế chưa thu
- Cảnh báo chuyến thiếu tài xế

# 2. Quản lý đơn hàng

URL:

```txt
/admin/bookings
```

Chức năng:

- Xem danh sách đơn.
- Xem chi tiết đơn.
- Tạo đơn thủ công.
- Sửa đơn.
- Hủy đơn.
- Cập nhật trạng thái.
- Ghi chú nội bộ.
- Gọi/Zalo khách.
- Filter theo:
  - ngày đi
  - tuyến
  - khung giờ
  - loại đơn
  - trạng thái
  - tài xế
  - đã gán/chưa gán
  - số điện thoại khách

# 3. Điều phối

URL:

```txt
/admin/dispatch
```

Phải theo `04_DISPATCH_FLOW_SPEC.md`.

# 4. Quản lý chuyến xe

URL:

```txt
/admin/trips
```

Chức năng:

- Danh sách chuyến.
- Tạo chuyến.
- Sửa chuyến.
- Hủy chuyến.
- Xem khách trong chuyến.
- Xem hàng trong chuyến.
- Xem tài xế/xe.
- Xem số ghế đã đặt/còn trống.
- Xem doanh thu/hoa hồng/công nợ.
- Cập nhật trạng thái:
  - collecting
  - ready
  - in_progress
  - completed
  - cancelled

# 5. Quản lý tài xế

URL:

```txt
/admin/drivers
```

Chức năng:

- Danh sách tài xế.
- Thêm tài xế.
- Sửa tài xế.
- Khóa/mở tài khoản.
- Xem vị trí hiện tại.
- Xem rảnh/bận.
- Xem chiều nhận.
- Xem ghế trống.
- Xem xe.
- Xem lịch sử chuyến.
- Xem công nợ.
- Reset mật khẩu.

# 6. Quản lý xe

URL:

```txt
/admin/vehicles
```

Chức năng:

- Thêm xe.
- Sửa xe.
- Gán xe cho tài xế.
- Loại xe.
- Biển số.
- Số ghế.
- Số ghế bán thực tế.
- Trạng thái xe.

# 7. Quản lý khách hàng

URL:

```txt
/admin/customers
```

Chức năng:

- Danh sách khách.
- Xem lịch sử đặt xe.
- Xem SĐT/Zalo.
- Ghi chú khách quen.
- Tạo đơn nhanh.
- Khóa/mở tài khoản nếu có login.

# 8. Quản lý user/phân quyền

URL:

```txt
/admin/users
```

Chức năng:

- Danh sách user.
- Filter role:
  - admin
  - dispatcher
  - accountant
  - driver
  - customer
- Filter trạng thái.
- Reset mật khẩu.
- Khóa/mở user.
- Tạo user nội bộ.
- Phân quyền.

# 9. Quản lý tuyến

URL:

```txt
/admin/routes
```

Chức năng:

- Thêm tuyến.
- Sửa tuyến.
- Bật/tắt tuyến.
- Chiều đi.
- Điểm đầu/cuối.
- Khoảng cách.
- Thời gian dự kiến.
- Nội dung SEO tuyến.

# 10. Quản lý dịch vụ

URL:

```txt
/admin/services
```

Dịch vụ:

- Xe ghép.
- Bao xe.
- Gửi hàng.
- Đi chợ quê.
- Xe hợp đồng.
- Xe đám cưới.
- Xe tham quan.
- Xe bệnh viện.
- Xe sân bay.

# 11. Cài đặt giá

URL:

```txt
/admin/pricing
```

Chức năng:

- Giá theo tuyến.
- Giá theo loại dịch vụ.
- Giá theo loại xe.
- Giá theo người.
- Giá theo chuyến.
- Giá theo kg.
- Giá báo tay.
- Phụ phí.
- Bật/tắt bảng giá.

# 12. Cài đặt hoa hồng

URL:

```txt
/admin/commissions
```

Chức năng:

- Hoa hồng theo người.
- Hoa hồng theo chuyến.
- Hoa hồng theo %.
- Hoa hồng nhập tay.
- Hoa hồng theo tuyến.
- Hoa hồng theo dịch vụ.
- Hoa hồng theo loại xe.

# 13. Công nợ / đối soát

URL:

```txt
/admin/driver-debts
/admin/reconciliation
```

Chức năng:

- Xem công nợ theo tài xế.
- Xem công nợ theo chuyến.
- Tài xế nợ admin.
- Admin nợ tài xế.
- Thanh toán một phần.
- Đã thanh toán đủ.
- Đã đối soát.
- Miễn công nợ.
- Xác nhận tài xế nộp.
- Xác nhận admin trả tài xế.
- Lịch sử thanh toán.

# 14. Báo cáo

URL:

```txt
/admin/reports
```

Chức năng:

- Tổng quan.
- Doanh thu.
- Hoa hồng.
- Công nợ.
- Theo tài xế.
- Theo tuyến.
- Theo dịch vụ.
- Theo ngày/tháng/năm.
- Đơn hủy.
- Xuất Excel.

# 15. Cài đặt website

URL:

```txt
/admin/settings
```

Fields:

- Tên thương hiệu.
- Slogan.
- Hotline.
- Zalo.
- Fanpage.
- Messenger.
- Email.
- Địa chỉ.
- Giờ làm việc.
- Khu vực phục vụ.
- Logo.
- Favicon.
- Banner.

# 16. Media

URL:

```txt
/admin/media
```

Chức năng:

- Upload ảnh.
- Convert WebP.
- Tạo large/medium/thumb.
- Alt text.
- Gắn ảnh với tuyến/dịch vụ/bài viết.

# 17. Bài viết SEO

URL:

```txt
/admin/posts
```

Chức năng:

- CRUD bài viết.
- Danh mục bài viết.
- Ảnh đại diện.
- SEO title.
- SEO description.
- Slug.
- Trạng thái nháp/xuất bản.

# 18. Audit log

URL:

```txt
/admin/audit-logs
```

Ghi lại:

- Ai tạo đơn.
- Ai sửa đơn.
- Ai gán chuyến.
- Ai đổi tài xế.
- Ai xác nhận công nợ.
- Ai reset mật khẩu.
