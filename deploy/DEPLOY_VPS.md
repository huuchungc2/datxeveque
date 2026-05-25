# Deploy lên VPS — Đặt Xe Về Quê

Kiến trúc khuyến nghị: **một domain**, Nginx phục vụ web tĩnh + proxy `/api` → Node (PM2) + MySQL.

```txt
https://tenmien.vn/          → frontend/dist (React build)
https://tenmien.vn/api/        → http://127.0.0.1:4002/api/ (Express)
https://tenmien.vn/uploads/   → thư mục uploads trên VPS
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

Hoặc trên Windows dev: chạy `restore-db.bat` rồi export/import dump lên VPS.

---

## 4. Backend `.env`

```bash
cd /var/www/dat-xe-ve-que/backend
cp .env.example .env
nano .env
```

Ví dụ production (thay `tenmien.vn`):

```env
NODE_ENV=production
PORT=4002
HOST=0.0.0.0
DATABASE_URL="mysql://dxvq:MAT_KHAU_MANH@127.0.0.1:3306/dat_xe_ve_que?charset=utf8mb4"
JWT_SECRET="chuoi-ngau-nhien-dai-it-nhat-32-ky-tu"
FRONTEND_URL=https://tenmien.vn
PUBLIC_SITE_URL=https://tenmien.vn
UPLOAD_DIR="../uploads"
COOKIE_SAMESITE=lax
```

Sau khi có HTTPS, bật cookie secure (nếu code hỗ trợ env — hoặc để middleware đọc `NODE_ENV=production`).

```bash
npm install
npx prisma generate
npm run build
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
VITE_SITE_URL=https://tenmien.vn
```

Hoặc:

```env
VITE_API_URL=https://tenmien.vn
```

(Cả hai đều ra API `https://tenmien.vn/api` — khớp Nginx.)

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
sudo certbot --nginx -d tenmien.vn -d www.tenmien.vn
```

---

## 7. Kiểm tra sau deploy

| URL | Kỳ vọng |
|-----|---------|
| `https://tenmien.vn/` | Trang chủ |
| `https://tenmien.vn/api/health` | JSON `ok` |
| `https://tenmien.vn/dat-xe` | Form đặt xe, **có danh sách tuyến** |
| `https://tenmien.vn/admin` | Đăng nhập admin |

Tài khoản demo (đổi mật khẩu sau khi lên production):

- Admin `0900000000` / `admin123`
- Tài xế `0900000001` / `taixe123`

---

## 8. Cập nhật phiên bản mới

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

## 9. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| «Không tải được danh sách tuyến» trên mobile | Build còn `VITE_API_URL=http://localhost:4002` | Build lại với `same-origin` hoặc `https://tenmien.vn` |
| 502 Bad Gateway `/api` | PM2/API chưa chạy | `pm2 logs`, `curl 127.0.0.1:4002/api/health` |
| Đăng nhập không giữ session | `FRONTEND_URL` sai hoặc HTTP/HTTPS lẫn | Khớp domain thật, dùng HTTPS |
| Chữ Việt lỗi trong DB | Import SQL sai encoding | Import UTF-8, `charset=utf8mb4` trong `DATABASE_URL` |
| Ảnh/upload 404 | Thiếu thư mục hoặc Nginx `uploads` | `mkdir uploads`, kiểm tra `location /uploads/` |

---

## 10. Không dùng Nginx (chỉ IP:port) — không khuyến nghị

Có thể mở `4002` và `5173` ra internet nhưng phải set `VITE_API_URL=http://IP:4002` khi build, cấu hình CORS, cookie — dễ lỗi trên mobile. **Nên dùng domain + Nginx như trên.**
