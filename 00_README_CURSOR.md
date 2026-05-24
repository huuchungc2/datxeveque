# BỘ SPEC ĐẦY ĐỦ CHO CURSOR - ĐẶT XE VỀ QUÊ

Mục tiêu của bộ tài liệu này: đưa cho Cursor/dev đọc để review và code đủ chức năng, không làm kiểu có tên module nhưng không vận hành được.

## Cách Cursor phải làm

1. Đọc toàn bộ file trong thư mục này.
2. Không tự ý đổi stack.
3. Không code theo kiểu demo placeholder.
4. Không hard-code tuyến/giá/hotline/tài xế trong UI.
5. Mỗi module phải có API thật, DB thật, UI thao tác thật.
6. Phải chạy acceptance test trước khi báo xong.

## Stack chốt

- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript + Prisma
- Database: MySQL
- Auth: JWT HttpOnly cookie + bcrypt
- Upload: lưu VPS `/uploads`, xử lý ảnh bằng sharp
- Deploy: Nginx + PM2 + MySQL
- UI: tiếng Việt 100%, Corporate Transport xanh dương + CTA cam

## Các file spec

1. `01_PRODUCT_SPEC_FULL.md` — spec sản phẩm tổng thể
2. `02_DATABASE_SCHEMA_SPEC.md` — schema DB chi tiết
3. `03_API_CONTRACT_FULL.md` — API contract chi tiết
4. `04_DISPATCH_FLOW_SPEC.md` — luồng điều phối cốt lõi
5. `05_ADMIN_FEATURES_SPEC.md` — chức năng admin
6. `06_DRIVER_FEATURES_SPEC.md` — chức năng tài xế
7. `07_CUSTOMER_PUBLIC_SPEC.md` — khách/public
8. `08_PRICING_DEBT_REPORT_SPEC.md` — giá/hoa hồng/công nợ/báo cáo
9. `09_SEO_MEDIA_CONTENT_SPEC.md` — SEO/upload ảnh/bài viết
10. `10_UI_UX_DESIGN_SYSTEM.md` — UI/UX rule
11. `11_SECURITY_DEPLOY_SPEC.md` — bảo mật/deploy
12. `12_ACCEPTANCE_TEST_FULL.md` — checklist nghiệm thu đầy đủ
13. `13_CURSOR_IMPLEMENTATION_PROMPT.md` — prompt đưa Cursor code

## Định nghĩa "xong"

Source chỉ được coi là xong khi pass các nhóm test sau:

- Khách vãng lai đặt đơn không cần login.
- Tuyến load được trong form đặt xe.
- Admin login được, F5 không logout.
- Admin thấy đơn chưa gán.
- Admin tạo chuyến.
- Admin gán đơn vào chuyến, không cộng trùng ghế/tiền.
- Tài xế thấy chuyến được gán.
- Tài xế cập nhật rảnh/bận/vị trí/ghế trống.
- Giá tạm tính đúng tuyến.
- Hoa hồng/công nợ đúng.
- Báo cáo filter được.
- Upload ảnh SEO chạy.
- Bài viết/SEO có sitemap/robots/schema.
- Restore DB chạy một phát có đủ dữ liệu.
