# 08 - PRICING, DEBT, REPORT SPEC

# 1. Giá

Admin set giá theo:

- Loại dịch vụ.
- Tuyến.
- Loại xe.
- Theo người.
- Theo chuyến.
- Theo kg.
- Báo giá thủ công.

# 2. Logic tính giá

## Xe ghép

```txt
total = pricePerPerson * passengerCount + phụ phí
commission = commissionPerPerson * passengerCount hoặc percent
driverAmount = total - commission
```

## Bao xe

```txt
total = basePrice
commission = fixed hoặc percent
driverAmount = total - commission
```

## Gửi hàng

```txt
total = basePrice + pricePerKg * weightKg
commission = fixed hoặc percent
```

## Đi chợ quê

```txt
total = phí dịch vụ tạm tính
finalTotal = admin cập nhật sau
```

# 3. Rule chống sai giá

Nếu có routeId:

- Ưu tiên price_rules routeId đó.
- Nếu không có thì fallback global routeId null.

Nếu không có routeId:

- Chỉ lấy rule global.
- Không lấy rule của tuyến khác.

# 4. Snapshot

Booking phải lưu:

```txt
estimatedTotal
finalTotal
commissionAmount
driverAmount
pricingSnapshotJson
```

Trip phải lưu tổng từ các booking snapshot.

# 5. Công nợ

Có 3 kiểu thanh toán:

```txt
customer_pays_driver
customer_pays_admin
split
```

## Khách trả tài xế

```txt
driverOwesAdmin = commission
adminOwesDriver = 0
```

## Khách trả admin

```txt
driverOwesAdmin = 0
adminOwesDriver = driverAmount
```

## Cọc admin, còn lại tài xế

Phải tính theo số admin đã thu.

# 6. Settlement status

```txt
pending
partial
paid
reconciled
waived
disputed
```

# 7. Admin đối soát

Admin ghi nhận:

- Tài xế nộp admin.
- Admin trả tài xế.
- Thanh toán một phần.
- Miễn công nợ.
- Đánh dấu đối soát.

# 8. Tài xế xem công nợ

Tài xế thấy:

- Tổng phải nộp admin.
- Tổng đã nộp.
- Còn nợ.
- Admin cần trả tôi.
- Lịch sử thanh toán.

# 9. Báo cáo

## Filter

```txt
Từ ngày
Đến ngày
Tháng
Năm
Tài xế
Tất cả tài xế
Tuyến
Loại dịch vụ
Trạng thái công nợ
Trạng thái chuyến
```

## Chỉ số

```txt
Tổng doanh thu khách
Tổng hoa hồng admin
Tài xế được hưởng
Tài xế còn nợ admin
Admin còn phải trả tài xế
Số chuyến
Số đơn
Số đơn hủy
```

## Tab

```txt
Tổng quan
Theo tài xế
Theo tuyến
Theo dịch vụ
Theo ngày/tháng
Công nợ
Chi tiết chuyến
```

# 10. Acceptance

```txt
[ ] Xe ghép 2 khách tính đúng tổng tiền.
[ ] Hoa hồng theo người đúng.
[ ] Gán booking vào trip cộng đúng tài chính.
[ ] Gán lại booking không cộng trùng.
[ ] Khách trả tài xế tạo driverOwesAdmin.
[ ] Khách trả admin tạo adminOwesDriver.
[ ] Báo cáo theo tài xế đúng số.
[ ] Báo cáo theo tuyến đúng số.
```
