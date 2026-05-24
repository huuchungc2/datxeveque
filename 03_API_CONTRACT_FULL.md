# 03 - API CONTRACT FULL

Tất cả API trả format thống nhất:

```json
{
  "success": true,
  "data": {},
  "message": "..."
}
```

Lỗi:

```json
{
  "success": false,
  "message": "Lỗi tiếng Việt",
  "errors": []
}
```

# 1. Auth

## POST /api/auth/login

Body:

```json
{
  "phone": "0900000000",
  "password": "admin123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Admin",
      "phone": "0900000000",
      "role": "admin",
      "status": "active"
    }
  }
}
```

Set JWT HttpOnly cookie.

## GET /api/auth/me

Yêu cầu cookie.

Response user hiện tại.

## POST /api/auth/logout

Clear cookie.

## POST /api/auth/register

Public.

Body customer:

```json
{
  "role": "customer",
  "name": "Nguyễn Văn A",
  "phone": "0911111111",
  "password": "123456"
}
```

Body driver:

```json
{
  "role": "driver",
  "name": "Anh Tài",
  "phone": "0922222222",
  "password": "123456",
  "vehicleType": "Xe 7 chỗ",
  "licensePlate": "86A-12345",
  "seats": 7,
  "serviceArea": "Sài Gòn - Đức Linh"
}
```

## POST /api/auth/forgot-password

Tạm thời trả 403.

## POST /api/auth/reset-password

Tạm thời trả 403.

# 2. Public routes/services/settings

## GET /api/routes

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Sài Gòn đi Đức Linh",
      "slug": "xe-sai-gon-di-duc-linh",
      "fromName": "Sài Gòn",
      "toName": "Đức Linh",
      "direction": "Sài Gòn -> Đức Linh",
      "status": "active"
    }
  ]
}
```

## GET /api/routes/:slug

Lấy chi tiết tuyến.

## GET /api/services

Dịch vụ active.

## GET /api/site-settings

Thông tin hotline/Zalo/logo/footer.

# 3. Pricing

## POST /api/pricing/estimate

Body:

```json
{
  "serviceType": "shared_ride",
  "routeId": 1,
  "vehicleType": null,
  "passengerCount": 2,
  "weightKg": null
}
```

Response:

```json
{
  "success": true,
  "data": {
    "estimatedTotal": 500000,
    "commissionAmount": 60000,
    "driverAmount": 440000,
    "pricingNote": "Giá tạm tính, nhân viên sẽ xác nhận lại."
  }
}
```

Rule:

- Có routeId: ưu tiên giá tuyến, fallback global.
- Không có routeId: chỉ lấy global, không lấy giá tuyến khác.

# 4. Public booking

## POST /api/bookings

Không cần login.

Body:

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

Response:

```json
{
  "success": true,
  "data": {
    "booking": {
      "id": 1,
      "code": "DXMABC123",
      "status": "new"
    }
  },
  "message": "Đặt xe thành công. Nhân viên sẽ liên hệ xác nhận."
}
```

## GET /api/bookings/track?code=&phone=

Tra cứu đơn public.

# 5. Admin dispatch

## GET /api/admin/dispatch

Query:

```txt
date
fromTime
toTime
routeId
serviceType
status
keyword
```

Response:

```json
{
  "success": true,
  "data": {
    "unassignedBookings": [],
    "collectingTrips": [],
    "availableDrivers": []
  }
}
```

# 6. Admin bookings

## GET /api/admin/bookings

Filter:

```txt
serviceType
routeId
status
fromDate
toDate
keyword
assignedState
driverId
```

## GET /api/admin/bookings/:id

Detail.

## PATCH /api/admin/bookings/:id

Update status/note/final price.

# 7. Admin trips

## GET /api/admin/trips

List.

## POST /api/admin/trips

Body:

```json
{
  "routeId": 1,
  "driverId": 1,
  "vehicleId": 1,
  "departureAt": "2026-05-25T17:30:00",
  "totalSeats": 5,
  "note": "Chuyến chiều"
}
```

Response có trip code CX...

## POST /api/admin/trips/:id/add-bookings

Body:

```json
{
  "bookingIds": [1, 2, 3]
}
```

Rule:

- Skip booking đã có trong trip.
- Không cộng trùng ghế/tiền/công nợ.
- Không vượt ghế.

Response:

```json
{
  "success": true,
  "data": {
    "added": 2,
    "skipped": 1,
    "trip": {}
  }
}
```

## POST /api/admin/trips/:id/assign-driver

Body:

```json
{
  "driverId": 1,
  "vehicleId": 1
}
```

# 8. Driver

## GET /api/driver/me

Thông tin tài xế.

## GET /api/driver/trips

Chuyến của tài xế login.

## POST /api/driver/trips/:id/accept

Nhận chuyến.

## POST /api/driver/trips/:id/reject

Từ chối chuyến.

## POST /api/driver/availability

Body:

```json
{
  "status": "available",
  "currentLocation": "Bình Tân",
  "directionPreference": "Sài Gòn -> Đức Linh",
  "routePreference": "Sài Gòn - Đức Linh",
  "seatsFree": 4,
  "acceptCargo": true
}
```

## GET /api/driver/debts

Công nợ của tài xế.

# 9. Admin users

## GET /api/admin/users

Filter role/status/keyword.

## POST /api/admin/users

Tạo user nội bộ.

## PATCH /api/admin/users/:id

Sửa/khóa/mở.

## POST /api/admin/users/:id/reset-password

Admin reset password.

# 10. Admin pricing

## GET /api/admin/price-rules

## POST /api/admin/price-rules

## PATCH /api/admin/price-rules/:id

# 11. Admin settlements

## GET /api/admin/driver-debts

## POST /api/admin/settlement-payments

Xác nhận tài xế nộp/admin trả.

# 12. Reports

## GET /api/admin/reports/overview

## GET /api/admin/reports/by-driver

## GET /api/admin/reports/by-route

## GET /api/admin/reports/by-service

## GET /api/admin/reports/debts

# 13. Media

## POST /api/admin/media/upload

multipart/form-data.

Fields:

```txt
file
title
altText
seoKeyword
usageType
relatedType
relatedId
```

# 14. Posts

## GET /api/posts

Public published.

## GET /api/posts/:slug

Public detail.

## GET /api/admin/posts

Admin list.

## POST /api/admin/posts

Create.

## PATCH /api/admin/posts/:id

Update.

# 15. SEO

## GET /sitemap.xml

## GET /robots.txt

Có thể nằm ở backend route ngoài `/api`.
