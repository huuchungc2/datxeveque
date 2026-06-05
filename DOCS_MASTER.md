# Đặt Xe Về Quê — DOCS MASTER (đọc 1 lần nắm toàn bộ)

Tài liệu này gom lại phần quan trọng nhất để vận hành/dev hệ thống mà không cần đọc hàng chục file rời.

## 1) Stack (không đổi)

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Database**: MySQL
- **Auth**: JWT **HttpOnly cookie** + bcrypt
- **Upload**: xử lý ảnh bằng **sharp**, lưu tại `/uploads` (VPS)
- **Deploy**: Nginx + PM2 + MySQL
- **UI**: tiếng Việt 100%, brand xanh + CTA cam

## 2) Ports & URL local

- **Web**: `http://localhost:5173`
- **API**: `http://localhost:4002`
- **Điều phối 3 cột**: `http://localhost:5173/admin/dispatch`

## 3) Chạy local nhanh

Yêu cầu: MySQL đã chạy.

```bat
cd backend && npm install && npx prisma generate
cd ..\frontend && npm install
restore-db.bat
start-local.bat
```

Hoặc chạy thủ công:

```bat
cd backend && npm run dev
cd frontend && npm run dev
```

### Tài khoản demo (sau restore SQL)

- **Admin**: `0900000000 / admin123`
- **Tài xế**: `0900000001 / taixe123`
- **Khách**: `0900000002 / khach123`

## 4) Nguyên tắc “xong”

Hệ thống chỉ coi là “xong” khi pass được các luồng lõi:

- **Guest booking**: khách vãng lai đặt xe không cần login.
- **Dispatch đúng 3 cột**: đơn chưa gán | chuyến gom | tài xế rảnh.
- **Gán booking không trùng**: gán lại phải **skip**, không cộng trùng ghế/tiền/công nợ.
- **Không ghế âm / không vượt ghế**.
- **Tài xế nhận chuyến**: driver thấy chuyến được gán, accept/reject.
- **Giá/hoa hồng/công nợ** cập nhật đúng và là **snapshot**.
- **Upload/SEO** chạy (sitemap/robots/media) nếu đang dùng production.

## 5) “Cấm kỵ” (đừng làm sai)

- Không demo placeholder (UI phải gọi API thật).
- Không hard-code trong UI: tuyến/giá/hotline/tài xế (phải load từ API/site settings).
- Không tạo mã booking/trip kiểu `count + 1`.
- Không để `availableSeats` âm.
- Không gán booking trùng mà vẫn cộng tiền/ghế/công nợ.
- Public reset password phải **403** (không mở public reset).
- Auth middleware phải query DB, user `LOCKED` → **401**.
- Status logic dùng **tiếng Anh** trong code/DB; UI map tiếng Việt.

## 6) Nơi đọc sâu theo chủ đề (trong bộ 4 file)

- **Luồng nghiệp vụ core + endpoints chính**: `DOCS_CORE_FLOWS.md`
- **Dispatch + seat_count + settlement/công nợ**: `DOCS_DISPATCH_SETTLEMENT.md`
- **Deploy + security + cookie/CORS + checklist go-live**: `DOCS_DEPLOY_SECURITY.md`

## TODO (ngắn hạn)

- [ ] **Phần 7 — Deploy SEO release** (UPDATE, không restore DB): xem checklist đầy đủ trong `DOCS_DEPLOY_SECURITY.md` mục 8
- [ ] Smoke test production `https://datxeveque.vn` + Google Search Console

## Test status

### Phần 6 — Build + seed + test local (2026-06-05)

**Auto / script**

- Backend build: **PASS**
- Frontend build: **PASS**
- Seed 10 bài kinh nghiệm: **PASS**
- Sitemap local: **PASS**, tổng **17 URL**
- Robots local: **PASS**
- `GET /api/posts`: **PASS**, trả **10 bài PUBLISHED**
- `GET /api/posts/:slug`: **PASS**
- Trang tuyến SEO: **PASS** (code + HTTP 200)
- Trang kinh nghiệm: **PASS** (code + HTTP 200)
- HTML sanitize (DOMPurify): **PASS**
- Article schema: **PASS** (code)
- FAQ schema: **PASS** (code)

**Manual test (local :5173 / :4002)**

- `/`
- `/dat-xe`
- `/gui-hang`
- `/di-cho-que`
- `/xe-sai-gon-di-duc-linh`
- `/xe-sai-gon-di-tanh-linh`
- `/kinh-nghiem`
- `/kinh-nghiem/kinh-nghiem-dat-xe-ve-que-an-toan`
- `/kinh-nghiem/nen-di-xe-ghep-hay-xe-rieng`
- `/sitemap.xml`
- `/robots.txt`

**Chưa test production**

- `PUBLIC_SITE_URL=https://datxeveque.vn` trên VPS
- Nginx proxy `/sitemap.xml` và `/robots.txt` về backend
- Seed bài trên DB production
- Smoke test domain thật
- Submit Google Search Console

**Lưu ý:** SPA — meta title/canonical/OG/JSON-LD inject client-side (react-helmet-async); kiểm tra SEO bằng DevTools sau khi JS render, không chỉ View Source thuần.

**Luồng lõi (guest booking / dispatch / driver)** — chưa cập nhật trong đợt test Phần 6 này.

### Phần 7 — Deploy SEO release (chuẩn bị, chưa chạy trên VPS)

- Schema SEO: **không đổi** → chỉ `npx prisma generate`, **không** `migrate deploy`
- Seed: `npm run db:seed-experience` (upsert an toàn)
- Checklist VPS + smoke test: `DOCS_DEPLOY_SECURITY.md` §8

## Changelog

- **2026-06-05 — Phần 7 (chuẩn bị):** Checklist deploy SEO UPDATE lên VPS (không restore DB), ENV/Nginx/seed/smoke test — `DOCS_DEPLOY_SECURITY.md` mục 8.
- **2026-06-05 — Phần 6:** Hoàn thiện SEO public gồm menu public, SEOHead, trang tuyến SEO địa phương, 10 bài kinh nghiệm, sitemap động, robots.txt. Build backend/frontend **PASS**. Sẵn sàng deploy VPS sau khi cấu hình env/Nginx/seed production.
- **2026-06-05 — Admin nội dung & users:** Tách màn hình list / thêm-sửa; filter + search + pagination (`/admin/noi-dung/bai-viet`, `/admin/users`).
- **2026-06-05 — Bài viết admin:** Preview, chèn ảnh (builtin + upload), layout detail gọn mobile/desktop.

