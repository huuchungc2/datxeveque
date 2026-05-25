-- Thông báo in-app (đơn mới, điều phối gán chuyến)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  link VARCHAR(255) NULL,
  entity_type VARCHAR(40) NULL,
  entity_id INT NULL,
  read_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id, read_at, created_at)
);
