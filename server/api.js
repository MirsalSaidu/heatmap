const express = require('express');
const router = express.Router();
const db = require('./db');
const { auth } = require('./auth');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Add URL normalization in both save and get endpoints
function normalizeUrl(url) {
  // Remove protocol, trailing slashes, and query params
  return url.replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
            .split('?')[0];
}

// Add this at the beginning of your API routes file
router.use((req, res, next) => {
  console.log(`API Request: ${req.method} ${req.path}`);
  next();
});

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

// Get list of URLs with heatmap data - remove auth requirement
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

// Modify this route to work without auth for now and add better error handling
router.post('/api/websites', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: 'URL is required' });
  
  try {
    new URL(url); // Validate URL
    
    // Log for debugging
    console.log('Attempting to insert URL:', url);
    
    try {
      // Check if websites table exists first
      const [tables] = await db.query("SHOW TABLES LIKE 'websites'");
      
      if (tables.length === 0) {
        // Create websites table if it doesn't exist
        console.log('Creating websites table');
        await db.query(`
          CREATE TABLE websites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            url VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
      
      // Insert URL
      await db.query('INSERT INTO websites (url) VALUES (?)', [url]);
      
      // Return success
      res.json({ success: true, message: 'URL added successfully' });
    } catch (dbErr) {
      console.error('Database error:', dbErr);
      res.status(500).json({ 
        success: false, 
        message: 'Database error', 
        error: dbErr.message,
        stack: dbErr.stack
      });
    }
  } catch (err) {
    console.error('Error adding website:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add URL', 
      error: err.message,
      stack: err.stack
    });
  }
});

// Add a screenshot API endpoint
router.get('/api/screenshot', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  try {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }
    
    // Generate a filename based on URL
    const filename = `${Buffer.from(url).toString('base64').replace(/[/+=]/g, '_')}.png`;
    const screenshotPath = path.join(screenshotsDir, filename);
    
    // Check if we already have a screenshot
    if (fs.existsSync(screenshotPath)) {
      return res.sendFile(screenshotPath);
    }
    
    // If not, capture a new screenshot
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    
    await browser.close();
    
    // Send the screenshot
    res.sendFile(screenshotPath);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    res.status(500).json({ error: 'Failed to capture screenshot' });
  }
});

// Also add this at the end of your API routes file
router.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Server error', 
    error: err.message 
  });
});

module.exports = router; 