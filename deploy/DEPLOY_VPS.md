# Deploy lên VPS — Đặt Xe Về Quê

> **Domain production (VPS):** [https://datxeveque.vn](https://datxeveque.vn) · `www.datxeveque.vn`  
> Mọi `FRONTEND_URL`, `PUBLIC_SITE_URL`, `VITE_SITE_URL` và cookie/CORS trên VPS phải khớp domain này.

Kiến trúc khuyến nghị: **một domain**, Nginx phục vụ web tĩnh + proxy `/api` → Node (PM2) + MySQL.

```txt
https://datxeveque.vn/          → frontend/dist (React build)
https://datxeveque.vn/api/      → http://127.0.0.1:4002/api/ (Express)
https://datxeveque.vn/uploads/  → thư mục uploads trên VPS
```

Cách này **điện thoại và PC đều gọi đúng API** (không dính `localhost`).

---

## 1. Chuẩn bị VPS (Ubuntu 22+)

```bash
sudo apt update
sudo apt install -y nginx mysql-server nodejs npm git
# Node 20+ nếu bản mặc định cũ: dùng nvm hoặc NodeSource
sudo npm install -g pm2
```

Mở firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 2. Upload mã nguồn

```bash
sudo mkdir -p /var/www/dat-xe-ve-que
sudo chown -R $USER:$USER /var/www/dat-xe-ve-que
# git clone hoặc scp/rsync từ máy dev
cd /var/www/dat-xe-ve-que
```

Đảm bảo có: `backend/`, `frontend/`, `database/`, `deploy/`, `uploads/` (tạo nếu chưa có).

```bash
mkdir -p /var/www/dat-xe-ve-que/uploads
```

---

## 3. MySQL

```bash
sudo mysql
```

```sql
CREATE DATABASE dat_xe_ve_que CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dxvq'@'localhost' IDENTIFIED BY 'MAT_KHAU_MANH';
GRANT ALL ON dat_xe_ve_que.* TO 'dxvq'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Import (UTF-8):

```bash
cd /var/www/dat-xe-ve-que
mysql -u dxvq -p dat_xe_ve_que < database/dat_xe_ve_que_react_express_full_restore.sql
```

Hoặc import dump từ máy local (mật khẩu dạng chữ `admin123` trong SQL):

```bash
mysql -u dxvq -p dat_xe_ve_que < database/dump-dat_xe_ve_que-202605251220.sql
```

### Sau import — bắt buộc bcrypt admin (production)

Dump/restore từ local lưu `password_hash` **plain text**. Trên VPS (`NODE_ENV=production`) phải gọi **`/api/setup/reset-admin`** một lần — backend tự `bcrypt` mật khẩu admin. **Không** cần `hash-plain-passwords.mjs`.

1. Thêm vào `backend/.env` (mục 4 bên dưới):

   ```env
   SETUP_SECRET=chuoi-bi-mat-rieng-cua-ban
   ```

2. Khởi động API (PM2), rồi:

   ```bash
   curl -s -X POST https://datxeveque.vn/api/setup/reset-admin \
     -H "Content-Type: application/json" \
     -d '{"secret":"chuoi-bi-mat-rieng-cua-ban"}'
   ```

   Hoặc trên chính VPS (localhost, không cần secret trong body):

   ```bash
   curl -s -X POST http://127.0.0.1:4002/api/setup/reset-admin \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. Kiểm tra: `curl -s https://datxeveque.vn/api/setup/status` → `"bcrypt":true`.

4. Đăng nhập: `0900000000` / `admin123`.

Script `fix-vps-login.mjs` / `hash-plain-passwords.mjs` chỉ dùng khi khẩn cấp, không phải quy trình chuẩn.

### Chỉ giữ 1 admin + 2 tài xế demo (khuyến nghị VPS)

Sau import dump (có thể kèm 20+ tài xế từ local), trên VPS:

```bash
cd /var/www/dat-xe-ve-que/backend
npm run db:migrate
npm run db:seed-vps-demo -- --trim
curl -s -X POST http://127.0.0.1:4002/api/setup/reset-admin \
  -H "Content-Type: application/json" -d '{}'
```

| Vai trò | SĐT | Mật khẩu |
|---------|-----|----------|
| Admin | `0900000000` | `admin123` |
| Tài xế 1 (SG) | `0900000001` | `taixe123` |
| Tài xế 2 (tỉnh) | `0900000004` | `taixe123` |

`--trim` xóa đơn/chuyến và tài xế không thuộc 3 SĐT trên; giữ tuyến, giá, cài đặt site. **Đổi mật khẩu** trước khi mở production thật.

Không dùng `--trim` nếu chỉ cần bcrypt lại 3 tài khoản mà không xóa dữ liệu:

```bash
npm run db:seed-vps-demo
```

---

## 4. Backend `.env`

```bash
cd /var/www/dat-xe-ve-que/backend
cp .env.example .env
nano .env
```

Production (`backend/.env` trên VPS):

```env
NODE_ENV=production
PORT=4002
HOST=0.0.0.0
DATABASE_URL="mysql://dxvq:MAT_KHAU_MANH@127.0.0.1:3306/dat_xe_ve_que?charset=utf8mb4"
JWT_SECRET="chuoi-ngau-nhien-dai-it-nhat-32-ky-tu"
FRONTEND_URL=https://datxeveque.vn
PUBLIC_SITE_URL=https://datxeveque.vn
UPLOAD_DIR="../uploads"
COOKIE_SAMESITE=lax
SETUP_SECRET="chuoi-bi-mat-rieng-cua-ban"
```

Sau khi có HTTPS, bật cookie secure (nếu code hỗ trợ env — hoặc để middleware đọc `NODE_ENV=production`).

```bash
npm install
npm run build
# build = prisma generate + tsc — bắt buộc sau git pull (tránh lỗi DriverBookingCargoStatus)
cd ..
pm2 start /var/www/dat-xe-ve-que/deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

Kiểm tra:

```bash
curl -s http://127.0.0.1:4002/api/health
```

---

## 5. Frontend build

```bash
cd /var/www/dat-xe-ve-que/frontend
cp .env.example .env
nano .env
```

**Khuyến nghị VPS (cùng domain Nginx):**

```env
VITE_API_URL=same-origin
VITE_SITE_URL=https://datxeveque.vn
```

Hoặc:

```env
VITE_API_URL=https://datxeveque.vn
```

(Cả hai đều ra API `https://datxeveque.vn/api` — khớp Nginx.)

```bash
npm install
npm run build
# Kết quả: frontend/dist/
```

Copy icon nếu chưa có trong repo:

```bash
# File trong frontend/public/ (favicon, brand…) — xem README_ICON_PATCH.md
```

---

## 6. Nginx

Sửa `server_name` và đường dẫn trong `deploy/nginx-datxeveque.conf`, rồi:

```bash
sudo cp /var/www/dat-xe-ve-que/deploy/nginx-datxeveque.conf /etc/nginx/sites-available/datxeveque.vn
sudo ln -sf /etc/nginx/sites-available/datxeveque.vn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

HTTPS (Let's Encrypt):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d datxeveque.vn -d www.datxeveque.vn
```

---

## 7. Kiểm tra sau deploy

| URL | Kỳ vọng |
|-----|---------|
| `https://datxeveque.vn/` | Trang chủ |
| `https://datxeveque.vn/api/health` | JSON `ok` |
| `https://datxeveque.vn/dat-xe` | Form đặt xe, **có danh sách tuyến** |
| `https://datxeveque.vn/admin` | Đăng nhập admin |

Tài khoản demo (đổi mật khẩu sau khi lên production):

- Admin `0900000000` / `admin123`
- Tài xế 1 `0900000001` / `taixe123`
- Tài xế 2 `0900000004` / `taixe123` (sau `db:seed-vps-demo`)

---

## 8. Login VPS vẫn «sai mật khẩu»?

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Vừa import dump từ local | `SETUP_SECRET` trong `.env` → `POST /api/setup/reset-admin` (mục 3) — **không** dùng `hash-plain-passwords.mjs` |
| `/api/setup/status` → `bcrypt:false` | Chưa gọi `reset-admin` — gọi lại bước trên |
| `exists:false` | Import lại SQL; kiểm tra `DATABASE_URL` trong `.env` |
| `curl login` 127.0.0.1 OK, web lỗi | Build frontend `VITE_API_URL=same-origin` |
| PM2 không đọc `.env` | `pm2 delete …` rồi `pm2 start deploy/ecosystem.config.cjs` |

```bash
curl -s http://127.0.0.1:4002/api/setup/status
curl -s -X POST http://127.0.0.1:4002/api/setup/reset-admin -H "Content-Type: application/json" -d '{}'
curl -s -X POST http://127.0.0.1:4002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"0900000000","password":"admin123"}'
```

---

## 9. Cập nhật phiên bản mới

```bash
cd /var/www/dat-xe-ve-que
git pull   # hoặc upload lại

cd backend && npm install && npx prisma generate && npm run build
pm2 restart dat-xe-ve-que-api

cd ../frontend && npm install && npm run build
sudo systemctl reload nginx
```

Migration DB (nếu có):

```bash
cd backend && npm run db:migrate
```

---

## 10. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| Login VPS «sai mật khẩu», local OK | Chưa `reset-admin` sau import | `SETUP_SECRET` + `POST /api/setup/reset-admin` |
| **Admin/trang trống, «không load dữ liệu»** | DB lỗi / schema lệch / API 502 | Mục **10b** bên dưới |
| «Không tải được danh sách tuyến» trên mobile | Build còn `VITE_API_URL=http://localhost:4002` | Build lại với `same-origin` hoặc `https://datxeveque.vn` |
| 502 Bad Gateway `/api` | PM2/API chưa chạy | `pm2 logs`, `curl 127.0.0.1:4002/api/health` |
| Đăng nhập không giữ session | `FRONTEND_URL` sai hoặc HTTP/HTTPS lẫn | Khớp domain thật, dùng HTTPS |
| Chữ Việt lỗi trong DB | Import SQL sai encoding | Import UTF-8, `charset=utf8mb4` trong `DATABASE_URL` |
| Ảnh/upload 404 | Thiếu thư mục hoặc Nginx `uploads` | `mkdir uploads`, kiểm tra `location /uploads/` |

### 10b. Backend VPS không load dữ liệu

Chạy trên VPS (SSH):

```bash
cd /var/www/dat-xe-ve-que/backend
npm run vps:check
curl -s http://127.0.0.1:4002/api/health | head -c 500
curl -s http://127.0.0.1:4002/api/setup/status
pm2 logs dat-xe-ve-que-api --lines 40
```

| Kết quả | Ý nghĩa | Xử lý |
|---------|---------|--------|
| `vps:check` FAIL MySQL | `DATABASE_URL` sai / MySQL tắt | Sửa `.env`, `sudo systemctl start mysql` |
| `Prisma query` / cột không tồn tại | Schema code mới hơn dump | `npm run db:migrate` rồi `pm2 restart dat-xe-ve-que-api` |
| PM2: `DriverBookingCargoStatus not found` | Chưa `prisma generate` sau `git pull` | `cd backend && npm run build && pm2 restart dat-xe-ve-que-api` |
| `/api/health` → `routeCount: 0` | DB trống tuyến | Import lại `database/dump-*.sql` |
| `/api/health` 503 | API không vào DB | Xem `detail` trong JSON, sửa MySQL |
| `curl` localhost OK, web lỗi | Nginx hoặc frontend build sai | `curl https://datxeveque.vn/api/health`; build `VITE_API_URL=same-origin` |
| Đăng nhập OK nhưng list trống | Lọc **Từ/Đến ngày = hôm nay**, không có đơn/chuyến hôm nay | Đổi khoảng ngày hoặc tạo đơn test |

Thứ tự sửa nhanh:

```bash
cd /var/www/dat-xe-ve-que
git pull
cd backend && npm install && npx prisma generate && npm run build
npm run db:migrate
pm2 restart dat-xe-ve-que-api
curl -s -X POST http://127.0.0.1:4002/api/setup/reset-admin -H "Content-Type: application/json" -d '{}'
```

---

## 11. Không dùng Nginx (chỉ IP:port) — không khuyến nghị

Có thể mở `4002` và `5173` ra internet nhưng phải set `VITE_API_URL=http://IP:4002` khi build, cấu hình CORS, cookie — dễ lỗi trên mobile. **Nên dùng domain + Nginx như trên.**
