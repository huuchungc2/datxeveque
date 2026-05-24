# 12 - ACCEPTANCE TEST FULL

Không được báo xong nếu chưa pass checklist này.

**Auto-test API:** `cd backend && npm run test:acceptance` (32 case, cập nhật 2026-05-24)

Legend: `[x]` = pass (API auto hoặc build) · `[ ]` = cần test tay UI

# 1. Cài đặt/chạy

```txt
[x] backend npm install OK
[x] frontend npm install OK
[x] prisma generate OK
[ ] restore SQL OK (mysql CLI — chạy restore-db.bat trên máy có MySQL)
[x] backend /api/health OK
[x] GET /api/routes có dữ liệu
[x] frontend localhost OK (npm run build)
```

# 2. Auth

```txt
[x] Login admin OK
[x] Login tài xế OK
[x] Login khách OK
[x] Login sai hiện lỗi tiếng Việt
[ ] F5 /admin không bị đá login (API /auth/me OK)
[ ] F5 /tai-xe không bị đá login
[ ] User bị khóa gọi API bị 401
[x] Public reset password bị chặn
[ ] Admin reset password user OK
```

# 3. Public booking

```txt
[x] Khách không login đặt xe được
[ ] Tuyến load trong form (UI)
[x] Chọn tuyến thấy giá tạm tính
[x] Tạo booking trả mã đơn
[x] Booking lưu tên/SĐT khách
[x] Booking status new/waiting_dispatch
[x] Tra cứu đơn bằng mã + SĐT OK
```

# 4. Admin booking

```txt
[x] Admin thấy đơn mới
[ ] Filter theo loại đơn OK (UI)
[ ] Filter theo tuyến OK (UI)
[ ] Filter theo ngày OK (UI)
[ ] Filter theo SĐT OK (UI)
[ ] Xem chi tiết đơn OK (UI)
[ ] Sửa trạng thái OK (UI)
```

# 5. Dispatch

```txt
[x] /admin/dispatch có 3 cột (API)
[x] Cột đơn chưa gán có booking
[x] Cột chuyến đang gom có trip
[x] Cột tài xế rảnh có driver
[ ] Chọn booking được (UI)
[x] Gán booking vào trip được
[x] Gán lại booking cũ không cộng trùng
[ ] Gán vượt ghế báo lỗi
[x] Tạo chuyến mới từ booking được
[ ] Tạo chuyến với tài xế được (UI — API tạo trip+driver OK)
```

# 6. Trip

```txt
[x] Tạo trip không trùng code
[x] Trip có route/driver/vehicle/departure
[x] Ghế booked/available đúng (gán đơn)
[x] Doanh thu/hoa hồng/công nợ đúng
[ ] Đổi trạng thái trip OK (UI)
```

# 7. Driver

```txt
[ ] Tài xế login vào /tai-xe (UI)
[x] Thấy chuyến được giao
[ ] Nhận chuyến OK (UI)
[ ] Từ chối chuyến OK (UI)
[ ] Cập nhật rảnh/bận OK (UI)
[ ] Cập nhật vị trí OK (UI)
[ ] Cập nhật ghế trống OK (UI)
[x] Xem công nợ của tôi OK
```

# 8. Finance

```txt
[x] Xe ghép tính giá đúng
[x] Bao xe tính giá đúng
[x] Gửi hàng tính giá đúng
[x] Không chọn tuyến không lấy nhầm giá tuyến
[x] Có tuyến ưu tiên giá tuyến
[x] Không có giá tuyến fallback global (CONTRACT global)
[x] Khách trả tài xế tạo driver_owes_admin
[x] Khách trả admin tạo admin_owes_driver
[x] Admin xác nhận thanh toán công nợ OK
```

# 9. Reports

```txt
[x] Báo cáo tổng quan có số
[ ] Filter theo tài xế OK (UI)
[ ] Filter theo tuyến OK (UI)
[ ] Filter theo ngày OK (UI)
[x] Filter theo dịch vụ OK
[x] Báo cáo công nợ OK
```

# 10. Settings/media/content

```txt
[x] Admin sửa hotline/Zalo OK (API settings)
[ ] Header/footer dùng settings (UI — footer mobile còn hard-code)
[ ] Upload ảnh WebP OK (UI)
[x] Alt text bắt buộc (API)
[ ] Tạo bài viết OK (UI)
[ ] Render bài viết không chạy script
[x] Sitemap có tuyến/bài viết
[x] Robots OK
```

# 11. Data restore

```txt
[x] Restore DB một lần có đủ user demo (DB hiện tại)
[x] Có đủ tuyến
[x] Có đủ dịch vụ
[x] Có bảng giá mẫu
[x] Có booking mẫu
[x] Có trip mẫu
[x] Có driver mẫu
```
