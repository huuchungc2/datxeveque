-- ADD DEFAULT ROUTES FOR DAT XE VE QUE - COMPATIBLE VERSION
-- Fix lỗi: Unknown column 'province' in 'field list'
-- File này chỉ dùng các cột tối thiểu thường có: id, name, slug, type, parent_id, created_at, updated_at

USE dat_xe_ve_que;

SET FOREIGN_KEY_CHECKS = 0;

-- Ensure base locations exist
INSERT INTO locations (id, name, slug, type, parent_id, created_at, updated_at)
VALUES
(1, 'Sài Gòn', 'sai-gon', 'city', NULL, NOW(), NOW()),
(2, 'Đức Linh', 'duc-linh', 'district', NULL, NOW(), NOW()),
(3, 'Tánh Linh', 'tanh-linh', 'district', NULL, NOW(), NOW()),
(4, 'Bình Tân', 'binh-tan', 'district', 1, NOW(), NOW()),
(5, 'Tân Phú', 'tan-phu', 'district', 1, NOW(), NOW()),
(6, 'Thủ Đức', 'thu-duc', 'city', 1, NOW(), NOW()),
(7, 'Võ Xu', 'vo-xu', 'town', 2, NOW(), NOW()),
(8, 'Mê Pu', 'me-pu', 'ward', 2, NOW(), NOW()),
(9, 'Đức Tài', 'duc-tai', 'ward', 2, NOW(), NOW()),
(10, 'Lạc Tánh', 'lac-tanh', 'town', 3, NOW(), NOW()),
(11, 'Bắc Ruộng', 'bac-ruong', 'ward', 3, NOW(), NOW()),
(12, 'Đồng Kho', 'dong-kho', 'ward', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  type = VALUES(type),
  parent_id = VALUES(parent_id),
  updated_at = NOW();

-- Ensure service types exist
INSERT INTO services (id, name, slug, type, description, status, created_at, updated_at)
VALUES
(1, 'Xe ghép', 'xe-ghep', 'ride_shared', 'Đặt xe ghép theo tuyến, ghép khách cùng chiều.', 'active', NOW(), NOW()),
(2, 'Bao xe', 'bao-xe', 'ride_private', 'Bao xe riêng 4 chỗ, 7 chỗ, 16 chỗ theo nhu cầu.', 'active', NOW(), NOW()),
(3, 'Gửi hàng', 'gui-hang', 'cargo', 'Gửi hàng Sài Gòn ⇄ Đức Linh, Tánh Linh.', 'active', NOW(), NOW()),
(4, 'Đi chợ quê', 'di-cho-que', 'market', 'Mua hộ đồ quê, đóng gói và gửi lên Sài Gòn.', 'active', NOW(), NOW()),
(5, 'Xe hợp đồng', 'thue-xe-hop-dong', 'contract', 'Thuê xe hợp đồng, đám cưới, tham quan, bệnh viện, sân bay.', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  type = VALUES(type),
  description = VALUES(description),
  status = VALUES(status),
  updated_at = NOW();

-- Main routes
INSERT INTO routes (
  id, name, slug, from_location_id, to_location_id,
  distance_km, estimated_duration_min, status,
  seo_title, seo_description, content,
  created_at, updated_at
)
VALUES
(1, 'Sài Gòn đi Đức Linh', 'xe-sai-gon-di-duc-linh', 1, 2, 150, 240, 'active',
 'Xe Sài Gòn đi Đức Linh | Xe ghép, bao xe, gửi hàng',
 'Đặt xe Sài Gòn đi Đức Linh, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đi chợ quê, đón trả tận nơi.',
 'Dịch vụ đặt xe Sài Gòn đi Đức Linh, hỗ trợ xe ghép, bao xe, gửi hàng, đi chợ quê và thuê xe hợp đồng.',
 NOW(), NOW()),

(2, 'Đức Linh đi Sài Gòn', 'xe-duc-linh-di-sai-gon', 2, 1, 150, 240, 'active',
 'Xe Đức Linh đi Sài Gòn | Xe ghép, bao xe, gửi hàng',
 'Đặt xe Đức Linh đi Sài Gòn, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đón trả tận nơi.',
 'Dịch vụ đặt xe Đức Linh đi Sài Gòn, hỗ trợ xe ghép, bao xe, gửi hàng và thuê xe theo yêu cầu.',
 NOW(), NOW()),

(3, 'Sài Gòn đi Tánh Linh', 'xe-sai-gon-di-tanh-linh', 1, 3, 175, 270, 'active',
 'Xe Sài Gòn đi Tánh Linh | Xe ghép, bao xe, gửi hàng',
 'Đặt xe Sài Gòn đi Tánh Linh, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đi chợ quê, đón trả tận nơi.',
 'Dịch vụ đặt xe Sài Gòn đi Tánh Linh, hỗ trợ xe ghép, bao xe, gửi hàng, đi chợ quê và thuê xe hợp đồng.',
 NOW(), NOW()),

(4, 'Tánh Linh đi Sài Gòn', 'xe-tanh-linh-di-sai-gon', 3, 1, 175, 270, 'active',
 'Xe Tánh Linh đi Sài Gòn | Xe ghép, bao xe, gửi hàng',
 'Đặt xe Tánh Linh đi Sài Gòn, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đón trả tận nơi.',
 'Dịch vụ đặt xe Tánh Linh đi Sài Gòn, hỗ trợ xe ghép, bao xe, gửi hàng và thuê xe theo yêu cầu.',
 NOW(), NOW()),

(5, 'Sài Gòn đi Võ Xu', 'xe-sai-gon-di-vo-xu', 1, 7, 145, 230, 'active',
 'Xe Sài Gòn đi Võ Xu | Xe ghép, bao xe',
 'Đặt xe Sài Gòn đi Võ Xu, Đức Linh, nhận xe ghép, bao xe, gửi hàng, đón trả tận nơi.',
 'Tuyến Sài Gòn đi Võ Xu thuộc huyện Đức Linh, hỗ trợ xe ghép, bao xe và gửi hàng.',
 NOW(), NOW()),

(6, 'Sài Gòn đi Mê Pu', 'xe-sai-gon-di-me-pu', 1, 8, 155, 250, 'active',
 'Xe Sài Gòn đi Mê Pu | Xe ghép, bao xe',
 'Đặt xe Sài Gòn đi Mê Pu, Đức Linh, nhận xe ghép, bao xe, gửi hàng, đón trả tận nơi.',
 'Tuyến Sài Gòn đi Mê Pu thuộc huyện Đức Linh, hỗ trợ xe ghép, bao xe và gửi hàng.',
 NOW(), NOW()),

(7, 'Sài Gòn đi Lạc Tánh', 'xe-sai-gon-di-lac-tanh', 1, 10, 175, 270, 'active',
 'Xe Sài Gòn đi Lạc Tánh | Xe ghép, bao xe',
 'Đặt xe Sài Gòn đi Lạc Tánh, Tánh Linh, nhận xe ghép, bao xe, gửi hàng, đón trả tận nơi.',
 'Tuyến Sài Gòn đi Lạc Tánh thuộc huyện Tánh Linh, hỗ trợ xe ghép, bao xe và gửi hàng.',
 NOW(), NOW()),

(8, 'Sài Gòn đi Bắc Ruộng', 'xe-sai-gon-di-bac-ruong', 1, 11, 185, 285, 'active',
 'Xe Sài Gòn đi Bắc Ruộng | Xe ghép, bao xe',
 'Đặt xe Sài Gòn đi Bắc Ruộng, Tánh Linh, nhận xe ghép, bao xe, gửi hàng, đón trả tận nơi.',
 'Tuyến Sài Gòn đi Bắc Ruộng thuộc huyện Tánh Linh, hỗ trợ xe ghép, bao xe và gửi hàng.',
 NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  from_location_id = VALUES(from_location_id),
  to_location_id = VALUES(to_location_id),
  distance_km = VALUES(distance_km),
  estimated_duration_min = VALUES(estimated_duration_min),
  status = VALUES(status),
  seo_title = VALUES(seo_title),
  seo_description = VALUES(seo_description),
  content = VALUES(content),
  updated_at = NOW();

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'DEFAULT ROUTES SEEDED - COMPATIBLE VERSION' AS message;
SELECT id, name, slug, status FROM routes ORDER BY id;
