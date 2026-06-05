# DOCS — Core flows (Guest → Admin → Driver)

## 1) Chuẩn response API

Success:

```json
{ "success": true, "data": {}, "message": "..." }
```

Error:

```json
{ "success": false, "message": "Lỗi tiếng Việt", "errors": [] }
```

## 2) Auth (cookie/JWT)

- `POST /api/auth/login` → set JWT **HttpOnly cookie**
- `GET /api/auth/me` → giữ phiên (F5 không logout)
- `POST /api/auth/logout` → clear cookie
- `POST /api/auth/forgot-password` → **403**
- `POST /api/auth/reset-password` → **403**

Rule bắt buộc:

- Auth middleware **query DB**; user `locked` → **401**
- Không lưu token localStorage

## 3) Data public bắt buộc (không hard-code)

- `GET /api/routes` → tuyến (active)
- `GET /api/services` → dịch vụ (active)
- `GET /api/site-settings` → hotline/zalo/logo/footer...

## 4) Pricing estimate (giá tạm tính)

`POST /api/pricing/estimate`

Body (ví dụ):

```json
{
  "serviceType": "shared_ride",
  "routeId": 1,
  "vehicleType": null,
  "passengerCount": 2,
  "weightKg": null
}
```

Rule:

- Có `routeId` → ưu tiên rule theo tuyến, fallback global
- Không có `routeId` → **chỉ** global (không lấy nhầm giá tuyến khác)

## 5) Guest booking (khách vãng lai không login)

### 5.1 Tạo đơn

`POST /api/bookings` (public)

Body (rút gọn):

```json
{
  "serviceType": "shared_ride",
  "customerName": "Nguyễn Văn A",
  "customerPhone": "0911111111",
  "customerZalo": "0911111111",
  "routeId": 1,
  "direction": "Sài Gòn -> Đức Linh",
  "pickupAddress": "Bình Tân",
  "dropoffAddress": "Võ Xu",
  "scheduledAt": "2026-05-25T17:00:00",
  "passengerCount": 2,
  "note": "Có 2 vali"
}
```

Response phải trả được:

- `booking.code` (mã tra cứu)
- `booking.status` (ban đầu `new`)
- message tiếng Việt

### 5.2 Tra cứu đơn public

`GET /api/bookings/track?code=&phone=`

Rule:

- Bắt buộc **code + phone** khớp (không lộ đơn người khác)

## 6) Admin/Driver endpoints (minimum cần cho vận hành)

### Admin

- `GET /api/admin/dispatch` (board 3 cột)
- `POST /api/admin/trips` (tạo chuyến)
- `POST /api/admin/trips/:id/add-bookings` (gán booking)
- `POST /api/admin/trips/:id/assign-driver` (đổi/gán tài xế)
- `GET /api/admin/bookings` + `PATCH /api/admin/bookings/:id`

### Driver

- `GET /api/driver/trips`
- `POST /api/driver/trips/:id/accept`
- `POST /api/driver/trips/:id/reject`
- `POST /api/driver/availability` (rảnh/bận/vị trí/ghế trống)
- `GET /api/driver/debts`

