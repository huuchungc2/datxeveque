-- Create feedbacks table
CREATE TABLE `feedbacks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category` ENUM('RATING', 'COMPLAINT_DRIVER', 'SUGGESTION', 'BUG_REPORT', 'OTHER') NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(255),
  `booking_id` INT,
  `route_id` INT,
  `content` LONGTEXT NOT NULL,
  `resolved` BOOLEAN DEFAULT FALSE,
  `admin_note` LONGTEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes for filtering
  INDEX `idx_phone_created` (`phone`, `created_at`),
  INDEX `idx_category_resolved_created` (`category`, `resolved`, `created_at`),

  -- Foreign keys (optional, can be added if needed)
  CONSTRAINT `fk_feedback_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_feedback_route` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
