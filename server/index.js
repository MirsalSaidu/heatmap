const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api');
const { router: authRoutes, auth, admin } = require('./auth');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-auth-token']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Set headers for CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token');
  next();
});

// Auth routes
app.use('/api/auth', authRoutes);

// API routes - protected and unprotected
app.use('/api/heatmap', apiRoutes);

// Public routes - accessible without login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../register.html'));
});

// Protected routes - require authentication
const serveWithAuthCheck = (req, res, filePath, adminRequired = false) => {
  const token = req.header('x-auth-token') || req.cookies?.authToken;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (adminRequired && decoded.user.role !== 'admin') {
      return res.redirect('/dashboard');
    }
    
    res.sendFile(path.join(__dirname, filePath));
  } catch (err) {
    return res.redirect('/login');
  }
};

// Admin route - requires admin role
app.get('/admin', (req, res) => {
  serveWithAuthCheck(req, res, '../admin.html', true);
});

// Dashboard route - requires authentication
app.get('/dashboard', (req, res) => {
  serveWithAuthCheck(req, res, '../dashboard.html');
});

// Main route - check auth and redirect accordingly
app.get('/', (req, res) => {
  const token = req.header('x-auth-token') || req.cookies?.authToken;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.user.role === 'admin') {
      return res.redirect('/admin');
    } else {
      return res.redirect('/dashboard');
    }
  } catch (err) {
    return res.redirect('/login');
  }
});

// Install cookie parser for better session handling
const cookieParser = require('cookie-parser');
app.use(cookieParser());

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