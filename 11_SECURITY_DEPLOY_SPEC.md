# 11 - SECURITY & DEPLOY SPEC

# 1. Auth

- JWT lưu HttpOnly cookie.
- Không lưu token trong localStorage.
- bcrypt password.
- Auth middleware query lại DB.
- User locked thì 401.
- Role middleware rõ ràng.

# 2. Reset password

- Không public reset bằng số điện thoại.
- Admin reset password user.
- Sau này có thể tích hợp OTP/Zalo/SMS.

# 3. CORS/Cookie

Nếu cùng domain:

```txt
datxeveque.vn/api
sameSite=lax
secure=true production
```

Nếu khác subdomain:

```txt
sameSite=none
secure=true
cors credentials true
origin FRONTEND_URL
```

# 4. Upload security

- Chỉ nhận jpg/jpeg/png/webp.
- Không nhận html/js/svg không sanitize.
- Max 10MB.
- Tên file slug.
- Không dùng original filename trực tiếp.

# 5. SQL/Prisma

- Không dùng raw SQL nếu không cần.
- Validate input.
- Pagination cho list API.

# 6. Deploy VPS

PM2:

```txt
dat-xe-ve-que-api
```

Nginx:

```nginx
server {
  server_name datxeveque.vn www.datxeveque.vn;

  root /var/www/dat-xe-ve-que/frontend/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:4002/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /uploads/ {
    alias /var/www/dat-xe-ve-que/uploads/;
  }
}
```

# 7. PM2

```bash
pm2 start backend/dist/server.js --name dat-xe-ve-que-api
pm2 save
```

# 8. MySQL

Database riêng:

```txt
dat_xe_ve_que
```

Không đụng database ERP.

# 9. Backup

- Backup DB hằng ngày.
- Backup uploads.
- Không lưu file upload trong repo git.
