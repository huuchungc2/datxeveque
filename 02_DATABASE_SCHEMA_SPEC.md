# 02 - DATABASE SCHEMA SPEC

Nguồn chuẩn là Prisma schema. SQL restore phải bám đúng schema này.

# 1. Enum

## UserRole

```txt
admin
dispatcher
accountant
driver
customer
```

## UserStatus

```txt
active
locked
inactive
```

## ServiceType

```txt
shared_ride
private_ride
cargo
market
contract
wedding
tour
hospital
airport
```

## BookingStatus

```txt
new
contacted
quoted
waiting_deposit
deposited
waiting_dispatch
assigned
driver_accepted
in_progress
completed
cancelled
no_show
```

## TripStatus

```txt
collecting
ready
in_progress
completed
cancelled
```

## DriverStatus

```txt
available
busy
running
waiting
off
```

## SettlementDirection

```txt
driver_owes_admin
admin_owes_driver
balanced
```

## SettlementStatus

```txt
pending
partial
paid
reconciled
waived
disputed
```

# 2. Bảng users

```txt
id
name
phone unique
email unique nullable
passwordHash
role
status
createdAt
updatedAt
```

Password phải bcrypt hash.

# 3. Bảng customers

```txt
id
userId nullable unique
name
phone
zaloPhone nullable
defaultPickupAddress nullable
note nullable
createdAt
updatedAt
```

# 4. Bảng drivers

```txt
id
userId nullable unique
name
phone
zaloPhone nullable
status
currentLocation nullable
directionPreference nullable
routePreference nullable
seatsFree
acceptCargo boolean
acceptPrivateRide boolean
acceptContract boolean
note nullable
createdAt
updatedAt
```

# 5. Bảng vehicles

```txt
id
driverId
vehicleType
seats
sellableSeats
licensePlate
status
note
createdAt
updatedAt
```

# 6. Bảng routes

```txt
id
name
slug unique
fromName
toName
direction
distanceKm nullable
estimatedDurationMin nullable
status active/inactive
seoTitle nullable
seoDescription nullable
content nullable
createdAt
updatedAt
```

Seed bắt buộc có tuyến ban đầu.

# 7. Bảng services

```txt
id
name
slug unique
type unique
description
status active/inactive
createdAt
updatedAt
```

# 8. Bảng price_rules

```txt
id
serviceType
routeId nullable
vehicleType nullable
pricingType
basePrice
pricePerPerson
pricePerKg
pricePerKm
minPrice
commissionType
commissionValue
active
createdAt
updatedAt
```

pricingType:

```txt
per_person
per_trip
per_kg
manual_quote
```

commissionType:

```txt
fixed
fixed_per_person
percent
manual
```

# 9. Bảng bookings

```txt
id
code unique
customerId nullable
customerName
customerPhone
customerZalo nullable
serviceType
routeId nullable
direction nullable
pickupAddress nullable
dropoffAddress nullable
scheduledAt nullable
passengerCount default 1
vehicleType nullable
cargoSenderName nullable
cargoSenderPhone nullable
cargoReceiverName nullable
cargoReceiverPhone nullable
cargoDescription nullable
cargoWeightKg nullable
marketDescription nullable
marketBudget nullable
note nullable
status
estimatedTotal
finalTotal
commissionAmount
driverAmount
paymentReceiver driver/admin/split/unpaid
source website/admin/zalo/facebook
pricingSnapshotJson nullable
createdByUserId nullable
assignedTripId nullable
createdAt
updatedAt
```

# 10. Bảng trips

```txt
id
code unique
routeId
driverId nullable
vehicleId nullable
departureAt
totalSeats
bookedSeats
availableSeats
status
totalCustomerAmount
adminCommission
driverNetAmount
driverDebtAmount
adminOwesDriverAmount
settlementStatus
completedAt nullable
note nullable
createdAt
updatedAt
```

# 11. Bảng trip_financial_snapshots

Lịch sử chốt hoa hồng khi chuyến `COMPLETED` (admin hoặc tài xế xác nhận).

```txt
id
tripId
eventType default COMPLETED
snapshotJson
completedBy nullable ADMIN|DRIVER
userId nullable
createdAt
```

# 12. Bảng trip_bookings

```txt
id
tripId
bookingId
createdAt
unique(tripId, bookingId)
```

# 12. Bảng trip_passenger_financials

Dùng để xem chi tiết từng booking/khách trong chuyến.

```txt
id
tripId
bookingId
customerName
passengerCount
pricePerPassenger
totalCustomerPrice
commissionPerPassenger
commissionAmount
driverAmount
paymentReceiver
paymentStatus
note
createdAt
updatedAt
```

# 13. Bảng driver_settlement_payments

```txt
id
tripId nullable
driverId
amount
direction
method
transactionCode nullable
confirmedByUserId nullable
confirmedAt nullable
note
createdAt
```

# 14. Bảng site_settings

```txt
id
key unique
value
groupName
type
label
createdAt
updatedAt
```

Keys bắt buộc:

```txt
brand_name
slogan
hotline_primary
hotline_secondary
zalo_phone
zalo_url
facebook_page_url
messenger_url
email
business_address
service_area
working_hours
logo_url
favicon_url
default_banner_url
```

# 15. Bảng media_files

```txt
id
originalName
fileName
filePath
fileUrl
mimeType
sizeBytes
width nullable
height nullable
altText
title
caption nullable
seoKeyword nullable
usageType
relatedType nullable
relatedId nullable
urlLarge nullable
urlMedium nullable
urlThumb nullable
uploadedByUserId nullable
createdAt
updatedAt
```

# 16. Bảng posts

```txt
id
title
slug unique
excerpt
content
coverImageId nullable
categoryId nullable
status draft/published/hidden
publishedAt nullable
seoTitle nullable
seoDescription nullable
canonicalUrl nullable
viewCount
createdByUserId nullable
createdAt
updatedAt
```

# 17. Bảng post_categories

```txt
id
name
slug unique
description nullable
createdAt
updatedAt
```

# 18. Bảng audit_logs

```txt
id
userId nullable
action
entityType
entityId nullable
oldValueJson nullable
newValueJson nullable
ip nullable
userAgent nullable
createdAt
```

# 19. Quy tắc DB bắt buộc

- Tất cả mã tiền dùng DECIMAL, không dùng float.
- Tất cả status logic dùng tiếng Anh.
- Không dùng count + 1 tạo code.
- `trip_bookings` phải unique tripId + bookingId.
- Password seed phải bcrypt.
- Full restore phải tạo đủ dữ liệu demo.
