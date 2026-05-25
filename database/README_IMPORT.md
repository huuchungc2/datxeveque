# Import database lên VPS

## File

- `dat_xe_ve_que_react_express_full_restore.sql` — restore đầy đủ (demo)
- `dump-dat_xe_ve_que-*.sql` — dump từ máy local

## Lưu ý mật khẩu

Dump/restore từ local thường có `password_hash` dạng **chữ** (`admin123`, `taixe123`…). Local dev chấp nhận plain; **VPS production** cần bcrypt.

**Quy trình chuẩn (không cần `hash-plain-passwords.mjs`):**

1. Import SQL lên VPS.
2. Trong `backend/.env` thêm `SETUP_SECRET=...`
3. Khởi động API (PM2).
4. Gọi một lần:

   ```bash
   curl -X POST https://TEN-MIEN/api/setup/reset-admin \
     -H "Content-Type: application/json" \
     -d '{"secret":"SETUP_SECRET_CUA_BAN"}'
   ```

5. Đăng nhập admin: `0900000000` / `admin123`.

Chi tiết: `deploy/DEPLOY_VPS.md` mục 3.
