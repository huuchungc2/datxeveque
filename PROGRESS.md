# PROGRESS — Đặt Xe Về Quê

Cập nhật khi merge feature hoặc sau acceptance test. Trạng thái: **Done** | **Partial** | **Todo**

**Tổng quan (ước lượng):** ~58 Done · ~12 Partial · ~13 Todo (trên 83 mục)

*Cột "Ghi chú" = lý do Partial/Todo. Tick chính thức tại `12_ACCEPTANCE_TEST_FULL.md`.*

---

## 1. Cài đặt / chạy

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| backend npm install OK | Done | |
| frontend npm install OK | Done | |
| prisma generate OK | Done | |
| restore SQL OK | Partial | Cần chạy `restore-db.bat` trên máy dev |
| backend /api/health OK | Done | |
| GET /api/routes có dữ liệu | Done | |
| frontend localhost OK | Done | `npm run build` OK |

## 2. Auth

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Login admin OK | Done | |
| Login tài xế OK | Done | |
| Login khách OK | Done | |
| Login sai hiện lỗi tiếng Việt | Partial | Cần verify message UI |
| F5 /admin không bị đá login | Done | `/auth/me` |
| F5 /tai-xe không bị đá login | Done | |
| User bị khóa → API 401 | Done | |
| Public reset password bị chặn | Done | 403 |
| Admin reset password user OK | Done | |

## 3. Public booking

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Khách không login đặt xe được | Done | |
| Tuyến load trong form | Done | |
| Chọn tuyến thấy giá tạm tính | Done | |
| Tạo booking trả mã đơn | Done | |
| Booking lưu tên/SĐT khách | Done | |
| Booking status new/waiting_dispatch | Partial | Status `NEW`; spec có `waiting_dispatch` |
| Tra cứu đơn mã + SĐT OK | Done | `/tra-cuu-don` |

## 4. Admin booking

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Admin thấy đơn mới | Done | |
| Filter loại đơn | Done | |
| Filter tuyến | Partial | API có `routeId`; UI chưa dropdown tuyến |
| Filter ngày | Done | |
| Filter SĐT | Done | `q` search |
| Xem chi tiết đơn | Done | Panel phải |
| Sửa trạng thái | Done | |

## 5. Dispatch

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| /admin/dispatch 3 cột | Done | |
| Cột đơn chưa gán | Done | |
| Cột chuyến đang gom | Done | |
| Cột tài xế rảnh | Done | |
| Chọn booking | Done | |
| Gán booking vào trip | Done | |
| Gán lại không cộng trùng | Done | Backend |
| Gán vượt ghế báo lỗi | Done | |
| Tạo chuyến từ booking | Done | |
| Tạo chuyến với tài xế | Done | |

## 6. Trip

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Tạo trip không trùng code | Done | |
| Trip có route/driver/vehicle/departure | Done | |
| Ghế booked/available đúng | Done | |
| Doanh thu/hoa hồng/công nợ đúng | Partial | Cần test E2E + payment_receiver |
| Đổi trạng thái trip | Partial | API PATCH; admin UI chưa đủ |

## 7. Driver

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Login /tai-xe | Done | |
| Thấy chuyến được giao | Done | |
| Nhận chuyến | Done | |
| Từ chối chuyến | Done | |
| Cập nhật rảnh/bận | Done | |
| Cập nhật vị trí | Done | |
| Cập nhật ghế trống | Done | |
| Xem công nợ | Done | |

## 8. Finance

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Xe ghép giá đúng | Partial | Cần test số |
| Bao xe giá đúng | Partial | |
| Gửi hàng giá đúng | Partial | |
| Không route → không lấy giá tuyến khác | Partial | `pricing.ts` |
| Có route → ưu tiên giá tuyến | Done | |
| Không route → fallback global | Done | |
| Khách trả TX → driver_owes_admin | Todo | Chưa đủ logic settlement |
| Khách trả admin → admin_owes_driver | Todo | |
| Admin xác nhận thanh toán công nợ | Todo | Chưa UI/API đối soát |

## 9. Reports

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Báo cáo tổng quan có số | Done | |
| Filter tài xế | Done | |
| Filter tuyến | Done | |
| Filter ngày | Done | |
| Filter dịch vụ | Todo | |
| Báo cáo công nợ admin | Todo | |

## 10. Settings / media / content

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| Admin sửa hotline/Zalo | Done | |
| Header/footer dùng settings | Done | |
| Upload ảnh WebP | Partial | API có; chưa admin UI |
| Alt text bắt buộc | Partial | API; cần form UI |
| Tạo bài viết admin | Todo | Chỉ đọc public |
| Render bài không chạy script | Partial | Sanitize cơ bản |
| Sitemap tuyến/bài viết | Done | |
| Robots OK | Done | |

## 11. Data restore

| Mục | Trạng thái | Ghi chú |
|-----|------------|---------|
| User demo | Done | |
| Đủ tuyến (10) | Done | Thêm Đức Tài, Đồng Kho |
| Đủ dịch vụ | Done | 9 services |
| Bảng giá mẫu | Done | |
| Booking mẫu | Done | |
| Trip mẫu | Done | |
| Driver mẫu | Done | |

---

## Task dev còn lại (gom nhóm)

1. Finance + settlement (`08_PRICING_DEBT_REPORT_SPEC.md`)
2. Báo cáo: filter dịch vụ + trang công nợ admin
3. CMS: admin posts + media library UI
4. Admin CRUD tuyến/giá/xe/khách (UI)
5. Form đặt xe theo loại dịch vụ + trang dịch vụ riêng
6. Chuẩn hóa API response `{ success, data, message }`
7. Chạy full acceptance → tick `12_ACCEPTANCE_TEST_FULL.md`

*Sửa file này khi xong từng nhóm.*
