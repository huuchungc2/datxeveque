-- Snapshot hoa hồng khi hoàn thành chuyến + cột completed_at
-- DB mới: đã gộp trong dat_xe_ve_que_react_express_full_restore.sql
-- Chạy file này MỘT LẦN nếu DB cũ chưa có các cột/bảng dưới đây

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pricing_snapshot_json LONGTEXT NULL AFTER commission_amount;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS admin_owes_driver_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER driver_debt_amount;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL AFTER settlement_status;

CREATE TABLE IF NOT EXISTS trip_financial_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id INT NOT NULL,
  event_type VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
  snapshot_json LONGTEXT NOT NULL,
  completed_by VARCHAR(20) NULL,
  user_id INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id)
);
