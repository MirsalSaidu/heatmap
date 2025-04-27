CREATE TABLE IF NOT EXISTS heatmap_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  page_x INT NOT NULL,
  page_y INT NOT NULL,
  path VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  viewport_width INT NOT NULL,
  viewport_height INT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_heatmap_url ON heatmap_events(url(255));
CREATE INDEX idx_heatmap_created_at ON heatmap_events(created_at); 