-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),
  os_name VARCHAR(50),
  os_version VARCHAR(20),
  is_mobile TINYINT(1),
  screen_resolution VARCHAR(20),
  referrer VARCHAR(255),
  initial_url VARCHAR(255),
  entry_timestamp DATETIME,
  exit_timestamp DATETIME,
  visible_time INT,
  timezone VARCHAR(50),
  language VARCHAR(20),
  cookies_enabled TINYINT(1),
  geolocation JSON,
  user_agent TEXT,
  device_details JSON,
  performance_metrics JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (session_id)
);

-- Modify heatmap_events table to add new fields if they don't exist
ALTER TABLE heatmap_events
ADD COLUMN IF NOT EXISTS scroll_x INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS scroll_y INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_details JSON; 