# Telegram — thông báo nhóm khi có sự kiện

Backend đã hỗ trợ gửi tin vào **nhóm Telegram** qua Bot API (song song thông báo trong admin).

## Bạn cần gửi / cấu hình gì

| Biến | Mô tả | Ví dụ |
|------|--------|--------|
| `TELEGRAM_BOT_TOKEN` | Token từ @BotFather | `7123456789:AAHxxxxxxxx` |
| `TELEGRAM_CHAT_ID` | ID nhóm (số âm) | `-1001234567890` |
Ghi vào `backend/.env` (local) hoặc env trên VPS. **Không commit token lên Git.**

**Quy tắc:** Mọi thông báo tạo cho chuông (admin + tài xế) đều **tự gửi thêm** vào nhóm Telegram qua `createForUsers` — không cần bật thêm cờ.

---

## Trong Telegram — làm từng bước

### 1. Bot (bạn đã có)

- Mở [@BotFather](https://t.me/BotFather) → `/mybots` → chọn bot → copy **token**.

### 2. Thêm bot vào nhóm

1. Mở nhóm nhân viên (vd. «Đặt xe về quê — điều hành»).
2. **Thêm thành viên** → tìm username bot (vd. `@DatXeVeQueBot`) → thêm.
3. Nên cho bot quyền **gửi tin** (không bắt buộc admin).

### 3. Lấy `chat_id` nhóm

**Cách A — getUpdates (khuyên dùng)**

1. Trong nhóm, gửi một tin bất kỳ (vd. `test bot`).
2. Trên trình duyệt mở (thay `TOKEN`):

   `https://api.telegram.org/botTOKEN/getUpdates`

3. Tìm đoạn `"chat":{"id":-100xxxxxxxxxx` → copy số **id** (có dấu `-`).

**Cách B — bot hỗ trợ**

- Thêm [@RawDataBot](https://t.me/RawDataBot) hoặc [@getidsbot](https://t.me/getidsbot) vào nhóm tạm → xem `chat id` → xóa bot đó nếu muốn.

**Lưu ý:** Nhóm thường có id dạng `-100...`. Chat riêng với bot là số dương — **đặt xe về quê nên dùng id nhóm.**

### 4. Privacy mode (nếu bot không nhận tin nhóm)

BotFather → bot → **Bot Settings** → **Group Privacy** → **Turn off**  
(Nếu không tắt, bot có thể không thấy tin trong nhóm; vẫn **gửi được** nếu đã có `chat_id`.)

### 5. Cấu hình server

```env
TELEGRAM_BOT_TOKEN="paste_token_here"
TELEGRAM_CHAT_ID="-1001234567890"
```

Khởi động lại API (`start-local.bat` hoặc PM2).

### 6. Test

Đăng nhập admin → gọi:

`POST /api/admin/telegram/test`  
(cần cookie đăng nhập admin)

Hoặc chạy local:

```bat
cd backend
node -e "import('dotenv/config');import('./src/lib/telegramNotify.js').then(m=>m.sendTelegramTest())"
```

Nhóm phải nhận tin «test Telegram».

---

## Sự kiện gửi Telegram (= chuông)

| Loại chuông | Khi nào |
|-------------|---------|
| Đơn mới | Khách/admin tạo đơn |
| Yêu cầu sửa / hủy | Khách gửi trên website |
| Gán điều phối | Admin gán đơn vào chuyến |
| Chuyến tài xế | Admin gán tài xế vào chuyến (hoặc gán đơn khi chuyến đã có tài xế) |
| Tài xế nhận / từ chối | Tài xế bấm nhận hoặc từ chối chuyến trên app — báo admin/điều phối |

Tin có link mở web (dùng `PUBLIC_SITE_URL` hoặc `FRONTEND_URL`).

---

## Gửi cho dev / AI cấu hình VPS

Chỉ gửi **qua kênh riêng tư**, không paste token vào group chat công khai:

1. `TELEGRAM_BOT_TOKEN` (hoặc file `.env` đã điền — không đẩy lên GitHub).
2. `TELEGRAM_CHAT_ID` nhóm.
3. URL production (vd. `https://datxeveque.vn`) để link trong tin nhắn đúng.

Không cần gửi mật khẩu admin DB.
