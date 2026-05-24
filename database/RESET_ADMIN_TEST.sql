USE dat_xe_ve_que;
INSERT INTO users (name, phone, email, password_hash, role, status)
VALUES ('Admin Đặt Xe', '0900000000', 'admin@datxeveque.vn', 'admin123', 'ADMIN', 'ACTIVE')
ON DUPLICATE KEY UPDATE
  name='Admin Đặt Xe',
  email='admin@datxeveque.vn',
  password_hash='admin123',
  role='ADMIN',
  status='ACTIVE';
