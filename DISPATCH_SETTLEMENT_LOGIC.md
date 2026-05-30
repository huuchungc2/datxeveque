# Logic điều phối & chốt hoa hồng (tóm tắt nghiệp vụ)

## Khách đặt vé
- Đơn: khách, SĐT, **số ghế**, **tuyến** (bắt buộc mới auto), **ngày/giờ**, điểm đón/trả.
- Đầu tuyến: **Sài Gòn (HCM)** hoặc **Đức Linh / Tánh Linh** (theo điểm khách chọn).
- Lưu `pricing_snapshot_json` lúc đặt (giá + HH + ai thu tiền).

## Gợi phối tự động (admin xác nhận / sửa)
1. **Bắt buộc có tuyến** — không tuyến thì không gợi ý.
2. Gom **cùng loại đơn** (`SHARED_RIDE`, `PRIVATE_RIDE`, `CARGO`, `MARKET` — không trộn).
3. Gom **cùng đầu đi** theo điểm khách chọn: **Sài Gòn (HCM)** hoặc **Đức Linh/Tánh Linh**.
4. **Cùng giờ** nếu ≥2 đơn cùng khung; **ít đơn** thì gom **cả ngày**.
5. **Không vượt ghế chuyến** — đơn lớn hơn 1 chuyến: **gán từng phần** nhiều lần (`trip_bookings.seat_count`). Chi tiết: `DISPATCH_GHI_CHU_LOGIC.md` §2.
6. Tài xế **Rảnh**, `seatsFree > 0`, **không** có chuyến COLLECTING/READY/IN_PROGRESS khi tạo chuyến mới; **Bận/Nghỉ** loại.
7. TX khớp **vị trí + chiều** (SG → chọn TX ở SG, chiều SG→tỉnh).

## Gán ghế & tiền trên chuyến (2026-05-29)
- Mỗi dòng `trip_bookings`: `seat_count` = số ghế đơn chiếm trên chuyến đó.
- Khi gán: `bookedSeats`/`availableSeats` trip ± `seat_count`; tiền/HH trip += `rollupBookingFinancialsPortion(booking, seat_count, passengerCount)`.
- Đơn chưa gán hết ghế: `status` = `WAITING_DISPATCH`, vẫn hiện màn điều phối.
- Chốt chuyến: snapshot tiền theo từng link `seat_count`, không full `final_total` đơn nếu chỉ gán một phần.

## Hoàn thành chuyến (admin hoặc tài xế)
- Ghi `trip_financial_snapshots` — lịch sử chốt HH / doanh thu / công nợ.
- Chuyến + đơn → `COMPLETED`.
- Tài xế → **Rảnh**, **location** = nơi vừa tới, **direction** = chiều ngược (sẵn sàng chiều về).

## Tiền & HH (chưa đổi rule)
- HH theo booking (`commission_amount`, `payment_receiver`).
- Khách trả tài xế → `driver_debt_amount`; khách trả admin → `admin_owes_driver_amount`.
- Báo cáo: theo ngày / chuyến / tài xế — từ chuyến đã chốt + snapshot.

## Database (chuẩn restore)
File **`database/dat_xe_ve_que_react_express_full_restore.sql`** đã có:
- `bookings.pricing_snapshot_json`
- `trips.completed_at`, `trips.admin_owes_driver_amount`
- `trip_financial_snapshots`

DB cũ chưa restore lại: `restore-db.bat` hoặc `node backend/scripts/migrate.mjs`.

Migration bổ sung (không có trong dump cũ): `trip_bookings.seat_count` — step `trip_bookings_seat_count` trong `migrate.mjs`.
