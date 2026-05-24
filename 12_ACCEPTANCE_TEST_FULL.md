# 12 - ACCEPTANCE TEST FULL

Không được báo xong nếu chưa pass checklist này.

# 1. Cài đặt/chạy

```txt
[ ] backend npm install OK
[ ] frontend npm install OK
[ ] prisma generate OK
[ ] restore SQL OK
[ ] backend /api/health OK
[ ] GET /api/routes có dữ liệu
[ ] frontend localhost OK
```

# 2. Auth

```txt
[ ] Login admin OK
[ ] Login tài xế OK
[ ] Login khách OK
[ ] Login sai hiện lỗi tiếng Việt
[ ] F5 /admin không bị đá login
[ ] F5 /tai-xe không bị đá login
[ ] User bị khóa gọi API bị 401
[ ] Public reset password bị chặn
[ ] Admin reset password user OK
```

# 3. Public booking

```txt
[ ] Khách không login đặt xe được
[ ] Tuyến load trong form
[ ] Chọn tuyến thấy giá tạm tính
[ ] Tạo booking trả mã đơn
[ ] Booking lưu tên/SĐT khách
[ ] Booking status new/waiting_dispatch
[ ] Tra cứu đơn bằng mã + SĐT OK
```

# 4. Admin booking

```txt
[ ] Admin thấy đơn mới
[ ] Filter theo loại đơn OK
[ ] Filter theo tuyến OK
[ ] Filter theo ngày OK
[ ] Filter theo SĐT OK
[ ] Xem chi tiết đơn OK
[ ] Sửa trạng thái OK
```

# 5. Dispatch

```txt
[ ] /admin/dispatch có 3 cột
[ ] Cột đơn chưa gán có booking
[ ] Cột chuyến đang gom có trip
[ ] Cột tài xế rảnh có driver
[ ] Chọn booking được
[ ] Gán booking vào trip được
[ ] Gán lại booking cũ không cộng trùng
[ ] Gán vượt ghế báo lỗi
[ ] Tạo chuyến mới từ booking được
[ ] Tạo chuyến với tài xế được
```

# 6. Trip

```txt
[ ] Tạo trip không trùng code
[ ] Trip có route/driver/vehicle/departure
[ ] Ghế booked/available đúng
[ ] Doanh thu/hoa hồng/công nợ đúng
[ ] Đổi trạng thái trip OK
```

# 7. Driver

```txt
[ ] Tài xế login vào /tai-xe
[ ] Thấy chuyến được giao
[ ] Nhận chuyến OK
[ ] Từ chối chuyến OK
[ ] Cập nhật rảnh/bận OK
[ ] Cập nhật vị trí OK
[ ] Cập nhật ghế trống OK
[ ] Xem công nợ của tôi OK
```

# 8. Finance

```txt
[ ] Xe ghép tính giá đúng
[ ] Bao xe tính giá đúng
[ ] Gửi hàng tính giá đúng
[ ] Không chọn tuyến không lấy nhầm giá tuyến
[ ] Có tuyến ưu tiên giá tuyến
[ ] Không có giá tuyến fallback global
[ ] Khách trả tài xế tạo driver_owes_admin
[ ] Khách trả admin tạo admin_owes_driver
[ ] Admin xác nhận thanh toán công nợ OK
```

# 9. Reports

```txt
[ ] Báo cáo tổng quan có số
[ ] Filter theo tài xế OK
[ ] Filter theo tuyến OK
[ ] Filter theo ngày OK
[ ] Filter theo dịch vụ OK
[ ] Báo cáo công nợ OK
```

# 10. Settings/media/content

```txt
[ ] Admin sửa hotline/Zalo OK
[ ] Header/footer dùng settings
[ ] Upload ảnh WebP OK
[ ] Alt text bắt buộc
[ ] Tạo bài viết OK
[ ] Render bài viết không chạy script
[ ] Sitemap có tuyến/bài viết
[ ] Robots OK
```

# 11. Data restore

```txt
[ ] Restore DB một lần có đủ user demo
[ ] Có đủ tuyến
[ ] Có đủ dịch vụ
[ ] Có bảng giá mẫu
[ ] Có booking mẫu
[ ] Có trip mẫu
[ ] Có driver mẫu
```
