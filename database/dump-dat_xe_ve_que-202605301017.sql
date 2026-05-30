-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: dat_xe_ve_que
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(191) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `customer_name` varchar(191) NOT NULL,
  `customer_phone` varchar(191) NOT NULL,
  `type` enum('SHARED_RIDE','PRIVATE_RIDE','CARGO','MARKET','CONTRACT','WEDDING','TOUR','HOSPITAL','AIRPORT') NOT NULL,
  `route_id` int(11) DEFAULT NULL,
  `direction` varchar(191) DEFAULT NULL,
  `pickup_address` varchar(191) DEFAULT NULL,
  `dropoff_address` varchar(191) DEFAULT NULL,
  `scheduled_at` datetime(3) DEFAULT NULL,
  `passenger_count` int(11) NOT NULL DEFAULT 1,
  `vehicle_type` varchar(191) DEFAULT NULL,
  `cargo_description` text DEFAULT NULL,
  `cargo_receiver_name` varchar(191) DEFAULT NULL,
  `cargo_receiver_phone` varchar(191) DEFAULT NULL,
  `parcel_dropoff_address` varchar(191) DEFAULT NULL,
  `has_accompanying_cargo` tinyint(1) NOT NULL DEFAULT 0,
  `market_description` text DEFAULT NULL,
  `note` text DEFAULT NULL,
  `status` enum('NEW','CONTACTED','QUOTED','WAITING_DEPOSIT','DEPOSITED','WAITING_DISPATCH','ASSIGNED','DRIVER_ACCEPTED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'NEW',
  `estimated_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `final_total` decimal(12,2) NOT NULL DEFAULT 0.00,
  `commission_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `pricing_snapshot_json` longtext DEFAULT NULL,
  `payment_receiver` varchar(191) NOT NULL DEFAULT 'DRIVER',
  `driver_ride_status` enum('WAITING_PICKUP','PICKING_UP','PICKED_UP','DROPPING_OFF','DROPPED_OFF','CUSTOMER_CANCELLED','UNREACHABLE','NO_SHOW','WAITING_ADMIN_REVIEW','WAITING_REDISPATCH','CANCELLED_BY_ADMIN') DEFAULT NULL,
  `driver_cargo_status` enum('WAITING_PICKUP','PICKING_UP','PICKED_UP','DELIVERING','DELIVERED','FAILED_PICKUP','FAILED_DELIVERY','PARCEL_CANCELLED','WAITING_ADMIN_REVIEW') DEFAULT NULL,
  `payment_status` enum('UNPAID','CASH_COLLECTED','TRANSFERRED','ADMIN_COLLECTED','WAIVED') NOT NULL DEFAULT 'UNPAID',
  `payment_collected_at` datetime(3) DEFAULT NULL,
  `payment_collected_by_user_id` int(11) DEFAULT NULL,
  `source` varchar(191) NOT NULL DEFAULT 'WEBSITE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bookings_code_key` (`code`),
  KEY `bookings_customer_id_fkey` (`customer_id`),
  KEY `bookings_route_id_fkey` (`route_id`),
  CONSTRAINT `bookings_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `bookings_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=302 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `zalo_phone` varchar(191) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_user_id_key` (`user_id`),
  CONSTRAINT `customers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_seat_logs`
--

DROP TABLE IF EXISTS `driver_seat_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_seat_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `driver_id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `old_available_seats` int(11) NOT NULL,
  `new_available_seats` int(11) NOT NULL,
  `reason` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `driver_seat_logs_driver_id_created_at_idx` (`driver_id`,`created_at`),
  KEY `driver_seat_logs_trip_id_created_at_idx` (`trip_id`,`created_at`),
  CONSTRAINT `driver_seat_logs_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `driver_seat_logs_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_seat_logs`
--

LOCK TABLES `driver_seat_logs` WRITE;
/*!40000 ALTER TABLE `driver_seat_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `driver_seat_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_settlement_payments`
--

DROP TABLE IF EXISTS `driver_settlement_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_settlement_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) DEFAULT NULL,
  `driver_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `direction` varchar(191) NOT NULL,
  `method` varchar(191) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_settlement_payments`
--

LOCK TABLES `driver_settlement_payments` WRITE;
/*!40000 ALTER TABLE `driver_settlement_payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `driver_settlement_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `zalo_phone` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Rảnh',
  `current_location` varchar(191) DEFAULT NULL,
  `direction_preference` varchar(191) DEFAULT NULL,
  `route_id` int(11) DEFAULT NULL,
  `run_direction` varchar(191) DEFAULT NULL,
  `seats_free` int(11) NOT NULL DEFAULT 0,
  `note` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `drivers_user_id_key` (`user_id`),
  KEY `drivers_route_id_fkey` (`route_id`),
  CONSTRAINT `drivers_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `drivers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES (1,2,'Tai xe 1 - Sai Gon','0900000001','0900000001','Rảnh','Sài Gòn (HCM)','Sài Gòn → Đức Linh/Tánh Linh',NULL,'SG_TO_PROVINCE',7,NULL,'2026-05-25 11:59:42.000','2026-05-30 02:31:19.516'),(21,23,'Tai xe 2 - Tinh','0900000004','0900000004','Rảnh','Đức Linh / Tánh Linh','Đức Linh/Tánh Linh → Sài Gòn',NULL,'PROVINCE_TO_SG',7,NULL,'2026-05-30 02:25:33.000','2026-05-30 02:31:33.470');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `locations`
--

DROP TABLE IF EXISTS `locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `locations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `type` varchar(191) NOT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `locations_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `locations`
--

LOCK TABLES `locations` WRITE;
/*!40000 ALTER TABLE `locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `media_files`
--

DROP TABLE IF EXISTS `media_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media_files` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `original_name` varchar(191) NOT NULL,
  `file_name` varchar(191) NOT NULL,
  `file_url` varchar(191) NOT NULL,
  `mime_type` varchar(191) NOT NULL,
  `size_bytes` int(11) NOT NULL,
  `alt_text` varchar(191) NOT NULL,
  `title` varchar(191) DEFAULT NULL,
  `usage_type` varchar(191) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `media_files`
--

LOCK TABLES `media_files` WRITE;
/*!40000 ALTER TABLE `media_files` DISABLE KEYS */;
/*!40000 ALTER TABLE `media_files` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('BOOKING_NEW','DISPATCH_ASSIGNED','DRIVER_TRIP_ASSIGNED') NOT NULL,
  `title` varchar(191) NOT NULL,
  `body` text NOT NULL,
  `link` varchar(191) DEFAULT NULL,
  `entity_type` varchar(191) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `read_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_read_at_created_at_idx` (`user_id`,`read_at`,`created_at`),
  CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post_categories`
--

DROP TABLE IF EXISTS `post_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `post_categories_slug_key` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_categories`
--

LOCK TABLES `post_categories` WRITE;
/*!40000 ALTER TABLE `post_categories` DISABLE KEYS */;
INSERT INTO `post_categories` VALUES (1,'Kinh nghiệm đặt xe','kinh-nghiem-dat-xe'),(2,'Gửi hàng về quê','gui-hang-ve-que');
/*!40000 ALTER TABLE `post_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `excerpt` text DEFAULT NULL,
  `content` longtext NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'DRAFT',
  `published_at` datetime(3) DEFAULT NULL,
  `seo_title` varchar(191) DEFAULT NULL,
  `seo_description` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `posts_slug_key` (`slug`),
  KEY `posts_category_id_fkey` (`category_id`),
  CONSTRAINT `posts_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `post_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts`
--

LOCK TABLES `posts` WRITE;
/*!40000 ALTER TABLE `posts` DISABLE KEYS */;
INSERT INTO `posts` VALUES (1,'Sài Gòn đi Đức Linh bao nhiêu km, mất bao lâu?','sai-gon-di-duc-linh-bao-nhieu-km','Tổng quan thời gian di chuyển, cách đặt xe và lưu ý khi về Đức Linh.','<p>Tuyến Sài Gòn đi Đức Linh phù hợp cho khách về quê cuối tuần, gửi hàng và đi bệnh viện.</p><h2>Có nên đặt xe trước?</h2><p>Nên đặt trước để hệ thống gom khách và sắp tài xế phù hợp.</p>',1,'PUBLISHED','2026-05-25 11:59:42.000','Sài Gòn đi Đức Linh bao nhiêu km?','Kinh nghiệm đặt xe Sài Gòn đi Đức Linh, thời gian di chuyển và lưu ý.','2026-05-25 11:59:42.000','2026-05-25 11:59:42.000'),(2,'Gửi hàng Sài Gòn Đức Linh cần lưu ý gì?','gui-hang-sai-gon-duc-linh-can-luu-y-gi','Lưu ý đóng gói hàng quê, đồ ăn, rau củ, giấy tờ khi gửi xe.','<p>Hàng nên đóng gói kỹ, ghi rõ người gửi/người nhận và số điện thoại.</p>',2,'PUBLISHED','2026-05-25 11:59:42.000','Gửi hàng Sài Gòn Đức Linh cần lưu ý gì?','Hướng dẫn gửi hàng từ Sài Gòn về Đức Linh và chiều ngược lại.','2026-05-25 11:59:42.000','2026-05-25 11:59:42.000');
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `price_rules`
--

DROP TABLE IF EXISTS `price_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `price_rules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `service_type` enum('SHARED_RIDE','PRIVATE_RIDE','CARGO','MARKET','CONTRACT','WEDDING','TOUR','HOSPITAL','AIRPORT') NOT NULL,
  `route_id` int(11) DEFAULT NULL,
  `vehicle_type` varchar(191) DEFAULT NULL,
  `pricing_type` varchar(191) NOT NULL,
  `base_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `price_per_person` decimal(12,2) NOT NULL DEFAULT 0.00,
  `price_per_kg` decimal(12,2) NOT NULL DEFAULT 0.00,
  `commission_type` varchar(191) NOT NULL DEFAULT 'FIXED',
  `commission_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `price_rules_route_id_fkey` (`route_id`),
  CONSTRAINT `price_rules_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `price_rules`
--

LOCK TABLES `price_rules` WRITE;
/*!40000 ALTER TABLE `price_rules` DISABLE KEYS */;
INSERT INTO `price_rules` VALUES (1,'SHARED_RIDE',1,NULL,'PER_PERSON',0.00,250000.00,0.00,'FIXED',30000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(2,'SHARED_RIDE',2,NULL,'PER_PERSON',0.00,250000.00,0.00,'FIXED',30000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(3,'SHARED_RIDE',3,NULL,'PER_PERSON',0.00,280000.00,0.00,'FIXED',35000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(4,'SHARED_RIDE',4,NULL,'PER_PERSON',0.00,280000.00,0.00,'FIXED',35000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(5,'PRIVATE_RIDE',1,NULL,'PER_TRIP',1200000.00,0.00,0.00,'FIXED',150000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(6,'PRIVATE_RIDE',2,NULL,'PER_TRIP',1200000.00,0.00,0.00,'FIXED',150000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(7,'PRIVATE_RIDE',3,NULL,'PER_TRIP',1450000.00,0.00,0.00,'FIXED',180000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(8,'PRIVATE_RIDE',4,NULL,'PER_TRIP',1450000.00,0.00,0.00,'FIXED',180000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(9,'CARGO',1,NULL,'PER_KG',30000.00,0.00,5000.00,'FIXED',20000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(10,'CARGO',2,NULL,'PER_KG',30000.00,0.00,5000.00,'FIXED',20000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(11,'CARGO',3,NULL,'PER_KG',35000.00,0.00,6000.00,'FIXED',25000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(12,'CARGO',4,NULL,'PER_KG',35000.00,0.00,6000.00,'FIXED',25000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(13,'MARKET',NULL,NULL,'PER_TRIP',80000.00,0.00,0.00,'FIXED',15000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(14,'CONTRACT',NULL,NULL,'PER_TRIP',1500000.00,0.00,0.00,'PERCENT',10.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(15,'WEDDING',NULL,NULL,'PER_TRIP',5500000.00,0.00,0.00,'FIXED',500000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(16,'TOUR',NULL,NULL,'PER_TRIP',1800000.00,0.00,0.00,'FIXED',200000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(17,'HOSPITAL',NULL,NULL,'PER_TRIP',850000.00,0.00,0.00,'FIXED',100000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(18,'AIRPORT',NULL,NULL,'PER_TRIP',650000.00,0.00,0.00,'FIXED',80000.00,1,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000');
/*!40000 ALTER TABLE `price_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `routes`
--

DROP TABLE IF EXISTS `routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `from_name` varchar(191) NOT NULL,
  `to_name` varchar(191) NOT NULL,
  `direction` varchar(191) NOT NULL,
  `distance_km` decimal(8,2) DEFAULT NULL,
  `estimated_duration_min` int(11) DEFAULT NULL,
  `seo_title` varchar(191) DEFAULT NULL,
  `seo_description` text DEFAULT NULL,
  `content` longtext DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Đang chạy',
  `locked` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `routes_slug_key` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `routes`
--

LOCK TABLES `routes` WRITE;
/*!40000 ALTER TABLE `routes` DISABLE KEYS */;
INSERT INTO `routes` VALUES (1,'Xe Sài Gòn đi Đức Linh','xe-sai-gon-di-duc-linh','Sài Gòn','Đức Linh','Sài Gòn → Đức Linh',150.00,240,'Xe Sài Gòn đi Đức Linh | Xe ghép, bao xe, gửi hàng','Đặt xe Sài Gòn đi Đức Linh, nhận xe ghép, bao xe 4-7 chỗ, gửi hàng, đi chợ quê.','Tuyến Sài Gòn đi Đức Linh hỗ trợ xe ghép, bao xe, gửi hàng và đi chợ quê.','Đang chạy',0,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(2,'Xe Đức Linh đi Sài Gòn','xe-duc-linh-di-sai-gon','Đức Linh','Sài Gòn','Đức Linh → Sài Gòn',150.00,240,'Xe Đức Linh đi Sài Gòn | Đón trả tận nơi','Đặt xe Đức Linh đi Sài Gòn, hỗ trợ khách về lại thành phố.','Tuyến Đức Linh đi Sài Gòn hỗ trợ nhiều khung giờ.','Đang chạy',0,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(3,'Xe Sài Gòn đi Tánh Linh','xe-sai-gon-di-tanh-linh','Sài Gòn','Tánh Linh','Sài Gòn → Tánh Linh',178.00,270,'Xe Sài Gòn đi Tánh Linh | Xe ghép, bao xe','Đặt xe Sài Gòn đi Tánh Linh, xe ghép, bao xe, gửi hàng.','Tuyến Sài Gòn đi Tánh Linh hỗ trợ Lạc Tánh, Bắc Ruộng, Đồng Kho.','Đang chạy',0,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(4,'Xe Tánh Linh đi Sài Gòn','xe-tanh-linh-di-sai-gon','Tánh Linh','Sài Gòn','Tánh Linh → Sài Gòn',178.00,270,'Xe Tánh Linh đi Sài Gòn | Đặt xe nhanh','Đặt xe Tánh Linh đi Sài Gòn, hỗ trợ đón trả tận nơi.','Tuyến Tánh Linh đi Sài Gòn hỗ trợ khách, hàng hóa và xe riêng.','Đang chạy',0,'2026-05-25 11:59:42.000','2026-05-30 02:25:32.000');
/*!40000 ALTER TABLE `routes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `type` enum('SHARED_RIDE','PRIVATE_RIDE','CARGO','MARKET','CONTRACT','WEDDING','TOUR','HOSPITAL','AIRPORT') NOT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Đang bật',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `services_slug_key` (`slug`),
  UNIQUE KEY `services_type_key` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Xe ghép','xe-ghep','SHARED_RIDE','Gom khách theo tuyến cố định','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(2,'Bao xe','bao-xe','PRIVATE_RIDE','Xe riêng 4-7-16 chỗ','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(3,'Gửi hàng','gui-hang','CARGO','Gửi hàng hai chiều','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(4,'Đi chợ quê','di-cho-que','MARKET','Mua hộ đồ quê','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(5,'Xe hợp đồng','xe-hop-dong','CONTRACT','Thuê xe theo lịch trình','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(6,'Xe đám cưới','xe-dam-cuoi','WEDDING','Đám cưới, đón dâu rước dâu','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(7,'Xe tham quan','xe-tham-quan','TOUR','Tour trong ngày / nhiều ngày','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(8,'Xe bệnh viện','xe-di-benh-vien','HOSPITAL','Đưa đón bệnh viện','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(9,'Xe sân bay','xe-san-bay','AIRPORT','Đón tiễn sân bay','Đang bật','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000');
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_settings`
--

DROP TABLE IF EXISTS `site_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(191) NOT NULL,
  `value` text DEFAULT NULL,
  `group_name` varchar(191) NOT NULL DEFAULT 'general',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_settings_key_key` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_settings`
--

LOCK TABLES `site_settings` WRITE;
/*!40000 ALTER TABLE `site_settings` DISABLE KEYS */;
INSERT INTO `site_settings` VALUES (1,'brand_name','Đặt Xe Về Quê','general','2026-05-25 11:59:42.000','2026-05-30 03:14:50.875'),(2,'slogan','Dịch vụ vận chuyển quê nhà chuyên nghiệp','general','2026-05-25 11:59:42.000','2026-05-30 03:14:51.108'),(3,'hotline_primary','0962100600','contact','2026-05-25 11:59:42.000','2026-05-30 03:14:51.057'),(4,'zalo_url','https://zalo.me/0962100600','contact','2026-05-25 11:59:42.000','2026-05-30 03:14:51.111'),(5,'facebook_page_url','https://facebook.com/datxeveque','contact','2026-05-25 11:59:42.000','2026-05-30 03:14:51.052'),(6,'email','hotro@datxeveque.vn','contact','2026-05-25 11:59:42.000','2026-05-30 03:14:51.027'),(7,'service_area','Sài Gòn, Đức Linh, Tánh Linh','contact','2026-05-25 11:59:42.000','2026-05-30 03:14:51.061');
/*!40000 ALTER TABLE `site_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_bookings`
--

DROP TABLE IF EXISTS `trip_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_bookings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `seat_count` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_bookings_trip_id_booking_id_key` (`trip_id`,`booking_id`),
  KEY `trip_bookings_booking_id_fkey` (`booking_id`),
  CONSTRAINT `trip_bookings_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `trip_bookings_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_bookings`
--

LOCK TABLES `trip_bookings` WRITE;
/*!40000 ALTER TABLE `trip_bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_financial_snapshots`
--

DROP TABLE IF EXISTS `trip_financial_snapshots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_financial_snapshots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `event_type` varchar(191) NOT NULL DEFAULT 'COMPLETED',
  `snapshot_json` longtext NOT NULL,
  `completed_by` varchar(191) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`),
  KEY `trip_financial_snapshots_trip_id_fkey` (`trip_id`),
  CONSTRAINT `trip_financial_snapshots_trip_id_fkey` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_financial_snapshots`
--

LOCK TABLES `trip_financial_snapshots` WRITE;
/*!40000 ALTER TABLE `trip_financial_snapshots` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_financial_snapshots` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(191) NOT NULL,
  `route_id` int(11) NOT NULL,
  `driver_id` int(11) DEFAULT NULL,
  `vehicle_id` int(11) DEFAULT NULL,
  `departure_at` datetime(3) NOT NULL,
  `total_seats` int(11) NOT NULL DEFAULT 0,
  `booked_seats` int(11) NOT NULL DEFAULT 0,
  `available_seats` int(11) NOT NULL DEFAULT 0,
  `status` enum('COLLECTING','READY','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'COLLECTING',
  `total_customer_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `admin_commission` decimal(12,2) NOT NULL DEFAULT 0.00,
  `driver_net_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `driver_debt_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `admin_owes_driver_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `settlement_status` enum('PENDING','PARTIAL','PAID','RECONCILED','WAIVED','DISPUTED') NOT NULL DEFAULT 'PENDING',
  `completed_at` datetime(3) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `driver_reject_reason` text DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trips_code_key` (`code`),
  KEY `trips_route_id_fkey` (`route_id`),
  KEY `trips_driver_id_fkey` (`driver_id`),
  KEY `trips_vehicle_id_fkey` (`vehicle_id`),
  CONSTRAINT `trips_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `trips_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `trips_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trips`
--

LOCK TABLES `trips` WRITE;
/*!40000 ALTER TABLE `trips` DISABLE KEYS */;
/*!40000 ALTER TABLE `trips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `password_hash` varchar(191) NOT NULL,
  `role` enum('ADMIN','DISPATCHER','ACCOUNTANT','DRIVER','CUSTOMER') NOT NULL,
  `status` enum('ACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_phone_key` (`phone`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Admin Đặt Xe','0900000000','admin@datxeveque.vn',NULL,'$2b$10$HGlL3dLkPeHpcQrfenCc8OKCf9SlRBP3mgV7BNDV2XfMzbnAPYOgC','ADMIN','ACTIVE','2026-05-25 11:59:42.000','2026-05-30 02:25:32.000'),(2,'Tai xe 1 - Sai Gon','0900000001','taixe1@datxeveque.vn',NULL,'$2b$10$A4OVQ/43hryQ5Y.qnN1W0eqev4PDUYOR0muUevBzvvJLjMceKh/yC','DRIVER','ACTIVE','2026-05-25 11:59:42.000','2026-05-30 02:48:20.228'),(23,'Tai xe 2 - Tinh','0900000004','taixe2@datxeveque.vn',NULL,'$2b$10$xTSS485Kmk1CDzj1Yo2fCeQUvXGZwgGoUlPkUDaUpo1E2WNq7km6u','DRIVER','ACTIVE','2026-05-30 02:25:33.000','2026-05-30 02:52:55.786'),(24,'Lâu','0962100600','0962100600@gmail.com',NULL,'$2b$10$lnmxc0QxtZQYv1.2FEMbJu..B2vYya0Fr4kcFrnwbbgJU.uqAqoty','ADMIN','ACTIVE','2026-05-30 03:15:31.249','2026-05-30 03:15:31.249');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `driver_id` int(11) NOT NULL,
  `vehicle_type` varchar(191) NOT NULL,
  `seats` int(11) NOT NULL,
  `license_plate` varchar(191) DEFAULT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'Đang hoạt động',
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicles_driver_id_fkey` (`driver_id`),
  CONSTRAINT `vehicles_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES (1,1,'Xe 7 chỗ',7,'86A-12345','Đang hoạt động','2026-05-25 11:59:42.000','2026-05-30 02:25:33.000'),(21,21,'Xe 7 chỗ',7,'68A-54321','Đang hoạt động','2026-05-30 02:25:33.000','2026-05-30 02:25:33.000');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'dat_xe_ve_que'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-30 10:17:51
