const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./api');
const { router: authRoutes } = require('./auth');
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

// API routes
app.use('/', apiRoutes);

// Serve static assets
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// Main route - redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
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