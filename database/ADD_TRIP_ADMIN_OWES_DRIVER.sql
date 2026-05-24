-- Chạy một lần nếu DB đã tạo trước khi có cột admin_owes_driver_amount
USE dat_xe_ve_que;

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS admin_owes_driver_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER driver_debt_amount;
