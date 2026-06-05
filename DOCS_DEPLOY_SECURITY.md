# DOCS — Deploy VPS + Security (cookie/CORS/upload)

## 1) Deploy VPS (mô hình khuyến nghị)

- Nginx serve `frontend/dist`
- Proxy `/api` → backend `127.0.0.1:4002`
- Proxy `/sitemap.xml` và (tuỳ chọn) `/robots.txt` → backend `127.0.0.1:4002` (sitemap động từ DB)
- Static `/uploads` (nơi lưu ảnh upload)

Ví dụ Nginx:

```nginx
location = /sitemap.xml {
  proxy_pass http://127.0.0.1:4002;
}

location = /robots.txt {
  proxy_pass http://127.0.0.1:4002;
}
```
- Backend chạy bằng PM2
- MySQL utf8mb4

## 2) Restore DB / import dump (VPS)

- Tạo DB `dat_xe_ve_que` (utf8mb4)
- Import SQL phù hợp schema Prisma
- Sau khi import dump local: **bắt buộc** reset admin bằng endpoint setup để đảm bảo bcrypt hash đúng.

Ví dụ (tên endpoint theo triển khai):

- `POST /api/setup/reset-admin` (yêu cầu `SETUP_SECRET`)

## 3) ENV quan trọng

### Backend (cốt lõi)

- `PORT=4002`
- `DATABASE_URL=...` (utf8mb4)
- `JWT_SECRET=...`
- `FRONTEND_URL=https://<domain>`
- `PUBLIC_SITE_URL=https://<domain>`
- `UPLOAD_DIR=../uploads` (tùy cấu trúc deploy)
- `SETUP_SECRET=...` (chỉ dùng cho endpoint setup)

### Frontend

- `VITE_SITE_URL=https://<domain>`
- `VITE_API_URL=` ưu tiên cùng domain (tránh hard-code `http://localhost:4002` khi build production)

## 4) Cookie/JWT/CORS (production)

Yêu cầu chung:

- JWT lưu trong **HttpOnly cookie**
- Client gọi API phải bật `credentials`

Thiết lập cookie:

- Nếu FE/BE cùng domain (proxy `/api`): thường `sameSite=lax`, production `secure=true`
- Nếu khác domain/subdomain: `sameSite=none`, `secure=true`

CORS:

- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin` phải đúng **FRONTEND_URL** (không dùng `*` khi credentials)

## 5) Upload security

- Chỉ cho phép mime type hợp lệ
- Lưu file dưới `/uploads` (không cho path traversal)
- Dùng sharp để resize/convert WebP
- Tránh render HTML “raw” từ nội dung post nếu chưa sanitize

## 6) Rule security bắt buộc trong app

- Public reset password: `forgot-password` và `reset-password` phải **403**
- Auth middleware query DB; user `locked` → **401**
- Không hard-code hotline/giá/tuyến/tài xế trong UI

## 7) Checklist go-live (tối thiểu)

- `/` load được settings/tuyến
- Guest booking tạo đơn OK
- `/admin/dispatch` chạy đủ 3 cột
- Driver accept/reject OK
- Upload ảnh OK (nếu dùng)
- Cookie hoạt động: F5 không logout, mobile dùng domain không lỗi CORS
- `/sitemap.xml` trả XML hợp lệ, có bài `PUBLISHED` từ bảng `posts`

---

## 8) Phần 7 — Deploy SEO release (UPDATE, **không restore DB**)

### Nguyên tắc bắt buộc

| Được | Cấm |
|------|-----|
| `git pull` + build + `pm2 restart` | `restore-db.bat` / import dump SQL cũ |
| `npx prisma generate` | `prisma migrate reset` |
| `npm run db:seed-experience` (upsert bài SEO) | `prisma db push` trên production |
| Backup DB trước khi deploy | Xóa/sửa booking, trip, user, driver, công nợ |

### Prisma / schema (đợt SEO này)

- Repo **không có** thư mục `prisma/migrations/`.
- Đợt SEO **không thêm** bảng/cột mới — dùng bảng có sẵn: `posts`, `post_categories`, `media_files` (đã có trong dump `database/dump-dat_xe_ve_que-202605301017.sql`).
- **Không cần** `npx prisma migrate deploy`.
- **Chỉ cần** `npx prisma generate` (hoặc `npm run build` — script build đã gọi `prisma generate`).
- **Không chạy** `npm start` lại từ đầu trên VPS nếu `NODE_ENV=production` (prestart `prisma-startup.mjs` sẽ fail vì không có migrations). Dùng **`pm2 restart dat-xe-ve-que-api`**.

**Pre-flight DB** (trên VPS, trước seed):

```bash
mysql -u ... -p dat_xe_ve_que -e "SHOW TABLES LIKE 'posts'; SHOW TABLES LIKE 'post_categories';"
```

Nếu thiếu bảng → liên hệ dev (ALTER/CREATE có chọn lọc), **không** restore full dump.

### Seed bài kinh nghiệm

```bash
cd backend
npm run db:seed-experience
```

- Script: `backend/scripts/seed-experience-posts.mjs`
- **Upsert** theo `slug`: có rồi → `update`, chưa có → `create` — **không tạo trùng**.
- Chỉ ghi `post_categories` (slug `kinh-nghiem`) + `posts` (10 slug trong `scripts/data/experience-posts.mjs`).
- **Không** đụng `bookings`, `trips`, `users`, `drivers`, công nợ, pricing, routes.

### ENV production

**Backend** (`backend/.env`):

```env
NODE_ENV=production
PORT=4002
DATABASE_URL=mysql://...:...@127.0.0.1:3306/dat_xe_ve_que?charset=utf8mb4
JWT_SECRET=<giữ nguyên secret đang chạy>
FRONTEND_URL=https://datxeveque.vn
PUBLIC_SITE_URL=https://datxeveque.vn
UPLOAD_DIR=../uploads
COOKIE_SAMESITE=lax
```

**Frontend** (`frontend/.env.production` hoặc export trước `npm run build`):

```env
VITE_SITE_URL=https://datxeveque.vn
VITE_API_URL=
```

`VITE_API_URL` để **trống** (hoặc `same-origin`) → frontend gọi `/api` qua Nginx cùng domain.

### Nginx (bổ sung so với mục 1)

```nginx
server {
    server_name datxeveque.vn www.datxeveque.vn;
    root /var/www/dat-xe-ve-que/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:4002;
        proxy_set_header Host $host;
    }

    location = /robots.txt {
        proxy_pass http://127.0.0.1:4002;
        proxy_set_header Host $host;
    }

    location /uploads/ {
        alias /var/www/dat-xe-ve-que/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Điều chỉnh `root` / `alias` theo path thật trên VPS. Khi `PUBLIC_SITE_URL=https://datxeveque.vn`, sitemap/robots động trả đúng domain.

### Checklist lệnh VPS (tự chạy)

Giả sử project tại `/var/www/dat-xe-ve-que`, PM2 app `dat-xe-ve-que-api`.

```bash
# 0) Backup DB (BẮT BUỘC)
mysqldump -u USER -p dat_xe_ve_que \
  | gzip > ~/backup/dat_xe_ve_que_$(date +%Y%m%d_%H%M).sql.gz

# 1) Code mới
cd /var/www/dat-xe-ve-que
git pull

# 2) Backend
cd backend
npm install
npx prisma generate
# KHÔNG chạy: npx prisma migrate deploy  (không có migrations)
# KHÔNG chạy: npm run db:migrate         (không liên quan SEO; chỉ khi vps-check báo thiếu cột)
npm run db:seed-experience
npm run build
pm2 restart dat-xe-ve-que-api
pm2 logs dat-xe-ve-que-api --lines 30

# 3) Frontend
cd ../frontend
npm install
# Đảm bảo VITE_SITE_URL=https://datxeveque.vn, VITE_API_URL= trống
npm run build

# 4) Nginx
sudo nginx -t
sudo systemctl reload nginx

# 5) Smoke curl (domain thật)
curl -sI https://datxeveque.vn/ | head -1
curl -sI https://datxeveque.vn/kinh-nghiem | head -1
curl -s https://datxeveque.vn/sitemap.xml | head -5
curl -s https://datxeveque.vn/robots.txt
curl -s https://datxeveque.vn/api/posts | head -c 200
```

### Smoke test production (browser)

- https://datxeveque.vn/
- https://datxeveque.vn/dat-xe
- https://datxeveque.vn/xe-sai-gon-di-duc-linh
- https://datxeveque.vn/xe-sai-gon-di-tanh-linh
- https://datxeveque.vn/kinh-nghiem
- https://datxeveque.vn/kinh-nghiem/nen-di-xe-ghep-hay-xe-rieng
- https://datxeveque.vn/sitemap.xml
- https://datxeveque.vn/robots.txt
- https://datxeveque.vn/api/posts

### Checklist sau deploy

```bash
# Đếm URL sitemap (kỳ vọng ~17)
curl -s https://datxeveque.vn/sitemap.xml | grep -c "<url>"

# Robots có Sitemap đúng domain
curl -s https://datxeveque.vn/robots.txt | grep Sitemap
# Kỳ vọng: Sitemap: https://datxeveque.vn/sitemap.xml

# API 10 bài PUBLISHED (JSON bọc { success, data })
curl -s https://datxeveque.vn/api/posts | node -e \
  "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);const p=j.data||j;console.log('count',p.length);});"

# Sitemap không chứa admin/tài xế/khách
curl -s https://datxeveque.vn/sitemap.xml | grep -E 'admin|tai-xe|khach|dang-nhap' && echo FAIL || echo OK_no_private_paths
```

- Kiểm tra meta SEO bằng DevTools (SPA inject client-side).
- Submit sitemap trong **Google Search Console** sau khi smoke test OK.

