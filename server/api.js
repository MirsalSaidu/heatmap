const express = require('express');
const router = express.Router();
const db = require('./db');

// Save heatmap data
router.post('/api/heatmap', async (req, res) => {
  try {
    const { events, url, userAgent } = req.body;
    
    // Prepare batch insert
    const values = events.map(event => [
      event.sessionId,
      event.timestamp,
      event.x,
      event.y,
      event.pageX,
      event.pageY,
      event.path,
      url,
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
    
    let sql = 'SELECT * FROM heatmap_events WHERE url = ?';
    let params = [url];
    
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

module.exports = router; 