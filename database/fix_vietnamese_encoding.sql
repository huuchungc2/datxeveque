-- Sửa chữ Việt bị lỗi (UTF-8 import qua `more` trên Windows). Chạy một lần sau restore cũ.
SET NAMES utf8mb4;

UPDATE routes SET
  name = 'Xe Sài Gòn đi Đức Linh',
  from_name = 'Sài Gòn',
  to_name = 'Đức Linh',
  direction = 'Sài Gòn → Đức Linh',
  seo_title = 'Xe Sài Gòn đi Đức Linh | Xe ghép, bao xe, gửi hàng',
  seo_description = 'Đặt xe Sài Gòn đi Đức Linh, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đi chợ quê.',
  content = 'Tuyến Sài Gòn đi Đức Linh hỗ trợ xe ghép, bao xe, gửi hàng và đi chợ quê.'
WHERE id = 1;

UPDATE routes SET
  name = 'Xe Đức Linh đi Sài Gòn',
  from_name = 'Đức Linh',
  to_name = 'Sài Gòn',
  direction = 'Đức Linh → Sài Gòn',
  seo_title = 'Xe Đức Linh đi Sài Gòn | Đón trả tận nơi',
  seo_description = 'Đặt xe Đức Linh đi Sài Gòn, hỗ trợ khách về lại thành phố.',
  content = 'Tuyến Đức Linh đi Sài Gòn hỗ trợ nhiều khung giờ.'
WHERE id = 2;

UPDATE routes SET
  name = 'Xe Sài Gòn đi Tánh Linh',
  from_name = 'Sài Gòn',
  to_name = 'Tánh Linh',
  direction = 'Sài Gòn → Tánh Linh',
  seo_title = 'Xe Sài Gòn đi Tánh Linh | Xe ghép, bao xe',
  seo_description = 'Đặt xe Sài Gòn đi Tánh Linh, xe ghép, bao xe, gửi hàng.',
  content = 'Tuyến Sài Gòn đi Tánh Linh hỗ trợ Lạc Tánh, Bắc Ruộng, Đồng Kho.'
WHERE id = 3;

UPDATE routes SET
  name = 'Xe Tánh Linh đi Sài Gòn',
  from_name = 'Tánh Linh',
  to_name = 'Sài Gòn',
  direction = 'Tánh Linh → Sài Gòn',
  seo_title = 'Xe Tánh Linh đi Sài Gòn | Đặt xe nhanh',
  seo_description = 'Đặt xe Tánh Linh đi Sài Gòn, hỗ trợ đón trả tận nơi.',
  content = 'Tuyến Tánh Linh đi Sài Gòn hỗ trợ khách, hàng hóa và xe riêng.'
WHERE id = 4;

UPDATE drivers SET
  status = 'Rảnh',
  current_location = 'Bình Tân',
  direction_preference = 'Sài Gòn → Đức Linh/Tánh Linh'
WHERE id = 1;

UPDATE bookings SET direction = 'Sài Gòn → Đức Linh' WHERE id = 1;

UPDATE site_settings SET value = 'Sài Gòn, Đức Linh, Tánh Linh' WHERE `key` = 'service_area';
