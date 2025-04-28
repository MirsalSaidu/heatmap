const express = require('express');
const router = express.Router();
const db = require('./db');
const { auth } = require('./auth');

// Add URL normalization in both save and get endpoints
function normalizeUrl(url) {
  // Remove protocol, trailing slashes, and query params
  return url.replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
            .split('?')[0];
}

// Save heatmap data
router.post('/api/heatmap', async (req, res) => {
  try {
    const { events, url, userAgent } = req.body;
    const normalizedUrl = normalizeUrl(url);
    
    // Prepare batch insert
    const values = events.map(event => [
      event.sessionId,
      event.timestamp,
      event.x,
      event.y,
      event.pageX,
      event.pageY,
      event.path,
      normalizedUrl,
      event.viewportWidth,
      event.viewportHeight,
      userAgent
    ]);
    
    if (values.length > 0) {
      const sql = `
        INSERT INTO heatmap_events 
        (session_id, timestamp, x, y, page_x, page_y, path, url, viewport_width, viewport_height, user_agent)
        VALUES ?
      `;
      
      await db.query(sql, [values]);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving heatmap data:', error);
    res.status(500).json({ error: 'Failed to save heatmap data' });
  }
});

// Get heatmap data for visualization
router.get('/api/heatmap', async (req, res) => {
  try {
    const { url, startDate, endDate } = req.query;
    const normalizedUrl = normalizeUrl(url);
    
    let sql = 'SELECT * FROM heatmap_events WHERE url = ?';
    let params = [normalizedUrl];
    
    if (startDate && endDate) {
      sql += ' AND created_at BETWEEN ? AND ?';
      params.push(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(new Date(startDate));
    } else if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(new Date(endDate));
    }
    
    const [rows] = await db.query(sql, params);
    
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// Get list of URLs with heatmap data
router.get('/api/heatmap/urls', async (req, res) => {
  try {
    const sql = 'SELECT DISTINCT url FROM heatmap_events';
    const [rows] = await db.query(sql);
    
    const urls = rows.map(row => row.url);
    res.status(200).json(urls);
  } catch (error) {
    console.error('Error fetching heatmap URLs:', error);
    res.status(500).json({ error: 'Failed to fetch heatmap URLs' });
  }
});

// Add this route to server/api.js
router.get('/api/test', async (req, res) => {
  try {
    // Simple test query
    const [rows] = await db.query('SELECT 1 as test');
    res.status(200).json({ success: true, dbConnected: true, data: rows });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      success: false, 
      dbConnected: false, 
      error: error.message 
    });
  }
});

// Add this to your API routes file
router.get('/api/test-db', async (req, res) => {
  try {
    const [result] = await db.query('SELECT 1 as test');
    res.json({ success: true, result });
  } catch (error) {
    console.error('DB test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add this route to allow adding a website
router.post('/api/websites', auth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'URL is required' });
  try {
    // Save to DB, associate with user if needed
    await db.query('INSERT INTO websites (user_id, url) VALUES (?, ?)', [req.user.id, url]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add URL', error: err.message });
  }
});

module.exports = router; 