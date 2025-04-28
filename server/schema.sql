-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Websites table
CREATE TABLE IF NOT EXISTS websites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  url VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Heatmap events table (existing)
CREATE TABLE IF NOT EXISTS heatmap_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  page_x FLOAT,
  page_y FLOAT,
  path VARCHAR(255),
  url VARCHAR(255) NOT NULL,
  viewport_width INT,
  viewport_height INT,
  user_agent TEXT,
  website_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default admin user (password: Admin123!)
INSERT INTO users (first_name, last_name, email, password, role)
VALUES ('Admin', 'User', 'admin@heatmapiq.com', '$2a$10$ixlPY3AAd4ty1l6E2IsXUOXLm/MZpcVksR9TZiJZvl17WlRVMbEMW', 'admin')
ON DUPLICATE KEY UPDATE id = id;

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value)
VALUES 
  ('data_retention', '90'),
  ('sample_rate', '1.0'),
  ('default_radius', '25'),
  ('default_opacity', '0.6'),
  ('require_approval', 'false')
ON DUPLICATE KEY UPDATE setting_key = setting_key; 