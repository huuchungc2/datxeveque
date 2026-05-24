# Deploy VPS

## 1. Upload source

Đặt source tại:

```bash
/var/www/dat-xe-ve-que
```

## 2. Backend

```bash
cd /var/www/dat-xe-ve-que/backend
cp .env.example .env
nano .env
npm install
npx prisma generate
npm run build
pm2 start /var/www/dat-xe-ve-que/deploy/ecosystem.config.cjs
pm2 save
```

Backend chạy port `4002`.

## 3. Frontend

```bash
cd /var/www/dat-xe-ve-que/frontend
cp .env.example .env
# production nên để VITE_API_URL=https://datxeveque.vn
npm install
npm run build
```

## 4. Nginx

Copy `deploy/nginx-datxeveque.conf` vào `/etc/nginx/sites-available/datxeveque.vn`, enable và reload.

```bash
nginx -t
systemctl reload nginx
```

## 5. Database

Import file:

```bash
mysql -uroot -p < database/dat_xe_ve_que_react_express_full_restore.sql
```

Tài khoản test:
- Admin: 0900000000 / admin123
- Tài xế: 0900000001 / taixe123
- Khách: 0900000002 / khach123
