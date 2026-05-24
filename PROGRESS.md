# PROGRESS — Đặt Xe Về Quê

Cập nhật: 2026-05-24 (sau test tự động)

**Chạy test:** `cd backend && npm run test:acceptance` → **32/32 pass**

**Migration DB:** `cd backend && npm run db:migrate` (cột `admin_owes_driver_amount`)

---

## Kết quả test tự động (32 mục)

| Nhóm | Pass |
|------|------|
| Health, routes, auth (login/logout/403) | ✓ |
| Guest booking + tra cứu + WAITING_DISPATCH | ✓ |
| Giá ghép / bao xe / gửi hàng / global | ✓ |
| Dispatch 3 cột, tạo trip, gán đơn, không trùng | ✓ |
| ADMIN pay → adminOwesDriver, settlement | ✓ |
| Báo cáo + công nợ + filter dịch vụ | ✓ |
| Tài xế / khách login, jobs, công nợ | ✓ |
| Settings, sitemap, robots, posts | ✓ |

---

## Còn lại (test tay UI hoặc optional)

| Mục | Ghi chú |
|-----|---------|
| F5 `/admin`, `/tai-xe` trên browser | API `/auth/me` đã pass |
| User LOCKED → 401 | Cần khóa user test tay |
| Admin reset password UI | API có, chưa auto-test |
| Gán vượt ghế báo lỗi | Thêm case vào script nếu cần |
| Upload ảnh WebP qua UI admin | API có, test tay `/admin/media` |
| Tạo bài viết qua UI | API có, test tay `/admin/bai-viet` |
| Admin CRUD xe/khách | Optional spec |
| Deploy VPS | `deploy/DEPLOY_VPS.md` |

---

## Nhóm acceptance 1–11

| Nhóm | Trạng thái |
|------|------------|
| 1. Cài đặt/chạy | Done (build OK) |
| 2. Auth | Done (API) |
| 3. Public booking | Done |
| 4. Admin booking | Done (API) |
| 5. Dispatch | Done |
| 6. Trip | Done |
| 7. Driver | Done |
| 8. Finance | Done (tested ADMIN/DRIVER pay) |
| 9. Reports | Done |
| 10. Settings/CMS | Partial (API; UI test tay) |
| 11. Data restore | Done (+ `npm run db:migrate`) |
