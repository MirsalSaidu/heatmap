const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const apiRoutes = require('./api');
const { router: authRoutes, auth, admin } = require('./auth');
const db = require('./db');
const session = require('./session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - Important: cookieParser must be before route handlers
app.use(cookieParser());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(apiRoutes); // This registers all routes from api.js

// Set headers for CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token');
  next();
});

// Authentication middleware for protected routes
const checkAuth = (req, res, next) => {
  // Check for token in cookies or headers
  const token = req.cookies?.authToken || req.header('x-auth-token');
  
  if (!token) {
    // For API routes, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // For non-API routes, redirect to login
    return res.redirect('/login');
  }
  
  try {
    const decoded = session.verifySession(token);
    if (!decoded) {
      // Invalid or expired token
      res.clearCookie('authToken');
      return res.redirect('/login');
    }
    
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.clearCookie('authToken');
    return res.redirect('/login');
  }
};

// Admin check middleware
const checkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/dashboard');
  }
  next();
};

// Auth routes - public
app.use('/api/auth', authRoutes);

// API routes - some may need protection
app.use('/api', require('./api'));

// Public routes - accessible without login
app.get('/login', (req, res) => {
  const token = req.cookies?.authToken || req.header('x-auth-token');
  if (token) {
    try {
      const decoded = session.verifySession(token);
      if (decoded) {
        // Already logged in, redirect to dashboard or admin
        return res.redirect(decoded.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      // Invalid token, clear cookie and show login
      res.clearCookie('authToken');
    }
  }
  res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/register', (req, res) => {
  const token = req.cookies?.authToken || req.header('x-auth-token');
  if (token) {
    try {
      const decoded = session.verifySession(token);
      if (decoded) {
        return res.redirect(decoded.user.role === 'admin' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      res.clearCookie('authToken');
    }
  }
  res.sendFile(path.join(__dirname, '../register.html'));
});

// Protected routes
app.get('/dashboard', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

app.get('/admin', checkAuth, checkAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

// Main route - redirect based on auth status
app.get('/', (req, res) => {
  // Check for token in cookies or headers
  const token = req.cookies?.authToken || req.header('x-auth-token');
  
  if (!token) {
    console.log('No token found, redirecting to login');
    return res.redirect('/login');
  }
  
  try {
    const decoded = session.verifySession(token);
    if (!decoded || !decoded.user) {
      console.log('Invalid token, redirecting to login');
      res.clearCookie('authToken');
      return res.redirect('/login');
    }
    
    console.log('Valid token, redirecting to appropriate dashboard');
    if (decoded.user.role === 'admin') {
      return res.redirect('/admin');
    } else {
      return res.redirect('/dashboard');
    }
  } catch (err) {
    console.error('Auth error at root path:', err);
    res.clearCookie('authToken');
    return res.redirect('/login');
  }
});

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// Start server
app.listen(PORT, async () => {
  try {
    // Test database connection
    await db.query('SELECT 1');
    console.log(`Server running on port ${PORT}`);
    console.log('Connected to database');
  } catch (err) {
    console.error('Database connection failed:', err);
  }
});

// Export for Vercel
module.exports = app; 