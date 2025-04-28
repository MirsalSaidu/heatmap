const express = require('express');
const router = express.Router();
const db = require('./db');
const { auth } = require('./auth');
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
    const { events, url, userAgent, userData } = req.body;
    const normalizedUrl = normalizeUrl(url);
    
    // First, save or update the session data
    const sessionId = events[0]?.sessionId;
    if (sessionId && userData) {
      await saveUserSession(sessionId, userData, normalizedUrl);
    }
    
    // Then save the events
    if (events && events.length > 0) {
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
        userAgent,
        event.scrollX || 0,
        event.scrollY || 0,
        event.clickDetails ? JSON.stringify(event.clickDetails) : '{}'
      ]);
      
      const sql = `
        INSERT INTO heatmap_events 
        (session_id, timestamp, x, y, page_x, page_y, path, url, viewport_width, viewport_height, user_agent, scroll_x, scroll_y, click_details)
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

// Helper function to save user session information
async function saveUserSession(sessionId, userData, url) {
  try {
    // Check if the session record already exists
    const [existingSession] = await db.query(
      'SELECT id FROM user_sessions WHERE session_id = ?',
      [sessionId]
    );
    
    if (existingSession.length === 0) {
      // Create a new session record
      const sessionData = {
        session_id: sessionId,
        browser_name: userData.browserInfo?.browserName || 'Unknown',
        browser_version: userData.browserInfo?.browserVersion || 'Unknown',
        os_name: userData.browserInfo?.osName || 'Unknown',
        os_version: userData.browserInfo?.osVersion || 'Unknown',
        is_mobile: userData.browserInfo?.isMobile ? 1 : 0,
        screen_resolution: userData.deviceInfo?.screenWidth && userData.deviceInfo?.screenHeight ? 
                          `${userData.deviceInfo.screenWidth}x${userData.deviceInfo.screenHeight}` : 'Unknown',
        referrer: userData.referrer || '',
        initial_url: userData.initialUrl || url,
        entry_timestamp: userData.entryTimestamp || new Date().toISOString(),
        timezone: userData.timezone || '',
        language: userData.language || '',
        cookies_enabled: userData.cookiesEnabled ? 1 : 0,
        geolocation: userData.locationInfo ? JSON.stringify(userData.locationInfo) : null,
        user_agent: userData.browserInfo?.userAgent || '',
        device_details: JSON.stringify(userData.deviceInfo || {}),
        performance_metrics: userData.performanceMetrics ? JSON.stringify(userData.performanceMetrics) : null
      };
      
      const columns = Object.keys(sessionData).join(', ');
      const placeholders = Object.keys(sessionData).map(() => '?').join(', ');
      
      await db.query(
        `INSERT INTO user_sessions (${columns}) VALUES (${placeholders})`,
        Object.values(sessionData)
      );
    } else {
      // Update the existing session with any new information
      if (userData.visibleTime) {
        await db.query(
          'UPDATE user_sessions SET visible_time = ? WHERE session_id = ?',
          [userData.visibleTime, sessionId]
        );
      }
      
      if (userData.performanceMetrics) {
        await db.query(
          'UPDATE user_sessions SET performance_metrics = ? WHERE session_id = ?',
          [JSON.stringify(userData.performanceMetrics), sessionId]
        );
      }
    }
  } catch (error) {
    console.error('Error saving user session:', error);
    // Continue execution even if session save fails
  }
}

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

// Fix the screenshot API endpoint
router.get('/api/screenshot', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
  // Return a JSON response instead of attempting to use Puppeteer
  res.status(200).json({ 
    success: false, 
    message: 'Screenshots are not available in serverless environment',
    url: url 
  });
});

// Get visitor statistics
router.get('/api/visitors', async (req, res) => {
  try {
    // Get unique visitor count
    const [uniqueVisitorsResult] = await db.query(
      'SELECT COUNT(DISTINCT session_id) as count FROM user_sessions'
    );
    const uniqueVisitors = uniqueVisitorsResult[0].count;
    
    // Get average time on page
    const [timeOnPageResult] = await db.query(
      'SELECT AVG(visible_time) as avg_time FROM user_sessions WHERE visible_time IS NOT NULL'
    );
    const avgTimeOnPage = timeOnPageResult[0].avg_time ? Math.floor(timeOnPageResult[0].avg_time / 1000) : 0;
    
    // Get mobile percentage
    const [mobileResult] = await db.query(
      'SELECT (SUM(is_mobile) / COUNT(*)) * 100 as percentage FROM user_sessions'
    );
    const mobilePercentage = mobileResult[0].percentage || 0;
    
    // Get browser distribution
    const [browsersResult] = await db.query(`
      SELECT browser_name as name, COUNT(*) as count 
      FROM user_sessions 
      GROUP BY browser_name 
      ORDER BY count DESC
    `);
    
    // Get device types
    const [deviceTypesResult] = await db.query(`
      SELECT 
        SUM(CASE WHEN is_mobile = 0 THEN 1 ELSE 0 END) as desktop,
        SUM(CASE WHEN is_mobile = 1 AND JSON_EXTRACT(device_details, '$.isTablet') != 'true' THEN 1 ELSE 0 END) as mobile,
        SUM(CASE WHEN JSON_EXTRACT(device_details, '$.isTablet') = 'true' THEN 1 ELSE 0 END) as tablet
      FROM user_sessions
    `);
    
    // Get recent visitors
    const [recentVisitors] = await db.query(`
      SELECT * 
      FROM user_sessions 
      ORDER BY entry_timestamp DESC 
      LIMIT 10
    `);
    
    res.json({
      uniqueVisitors,
      avgTimeOnPage,
      mobilePercentage,
      browsers: browsersResult,
      deviceTypes: deviceTypesResult[0],
      recentVisitors
    });
  } catch (error) {
    console.error('Error fetching visitor statistics:', error);
    res.status(500).json({ error: 'Failed to fetch visitor statistics' });
  }
});

// Export all visitor data
router.get('/api/visitors/export', async (req, res) => {
  try {
    const [visitors] = await db.query('SELECT * FROM user_sessions ORDER BY entry_timestamp DESC');
    res.json(visitors);
  } catch (error) {
    console.error('Error exporting visitor data:', error);
    res.status(500).json({ error: 'Failed to export visitor data' });
  }
});

// Get detailed visitor analytics
router.get('/api/visitors/analytics', async (req, res) => {
  try {
    // Time series data for visitor counts
    const [dailyVisitors] = await db.query(`
      SELECT 
        DATE(entry_timestamp) as date,
        COUNT(DISTINCT session_id) as visitors
      FROM user_sessions
      WHERE entry_timestamp > DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(entry_timestamp)
      ORDER BY date
    `);
    
    // Countries breakdown (if geolocation is available)
    const [countries] = await db.query(`
      SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(geolocation, '$.country')) as country,
        COUNT(*) as count
      FROM user_sessions
      WHERE geolocation IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Referrers breakdown
    const [referrers] = await db.query(`
      SELECT 
        IF(referrer = '', 'Direct', 
          IF(referrer LIKE '%google%', 'Google',
            IF(referrer LIKE '%facebook%', 'Facebook',
              IF(referrer LIKE '%twitter%', 'Twitter',
                IF(referrer LIKE '%instagram%', 'Instagram',
                  IF(referrer LIKE '%linkedin%', 'LinkedIn',
                    SUBSTRING_INDEX(SUBSTRING_INDEX(referrer, '://', -1), '/', 1)
                  )
                )
              )
            )
          )
        ) as source,
        COUNT(*) as count
      FROM user_sessions
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Language preferences
    const [languages] = await db.query(`
      SELECT 
        language,
        COUNT(*) as count
      FROM user_sessions
      WHERE language != ''
      GROUP BY language
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // Performance metrics averages
    const [performance] = await db.query(`
      SELECT
        AVG(JSON_EXTRACT(performance_metrics, '$.pageLoadTime')) as avg_page_load_time,
        AVG(JSON_EXTRACT(performance_metrics, '$.domReadyTime')) as avg_dom_ready_time,
        AVG(JSON_EXTRACT(performance_metrics, '$.networkLatency')) as avg_network_latency
      FROM user_sessions
      WHERE performance_metrics IS NOT NULL
    `);
    
    res.json({
      dailyVisitors,
      countries,
      referrers,
      languages,
      performance: performance[0]
    });
  } catch (error) {
    console.error('Error fetching visitor analytics:', error);
    res.status(500).json({ error: 'Failed to fetch visitor analytics' });
  }
});

// Get details for a specific visitor session
router.get('/api/visitors/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session details
    const [sessionDetails] = await db.query(
      'SELECT * FROM user_sessions WHERE session_id = ?',
      [sessionId]
    );
    
    if (sessionDetails.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Get click events for this session
    const [clickEvents] = await db.query(
      'SELECT * FROM heatmap_events WHERE session_id = ? ORDER BY timestamp',
      [sessionId]
    );
    
    res.json({
      session: sessionDetails[0],
      events: clickEvents
    });
  } catch (error) {
    console.error('Error fetching visitor details:', error);
    res.status(500).json({ error: 'Failed to fetch visitor details' });
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