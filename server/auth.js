const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Environment variables for security
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }
    
    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Set default role to 'user'
    const role = 'user';
    
    // Insert user into database with proper error handling
    try {
      const sql = `
        INSERT INTO users (first_name, last_name, email, password, role, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await db.query(sql, [firstName, lastName, email, hashedPassword, role, 'active']);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully'
      });
    } catch (dbError) {
      console.error('Database error during registration:', dbError);
      res.status(500).json({ 
        success: false, 
        message: 'Database error during registration',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    
    // Find user by email
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account is inactive' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    // Create JWT payload
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
    
    // Determine token expiration based on rememberMe
    const expiresIn = rememberMe ? '30d' : JWT_EXPIRES;
    
    // Sign token
    jwt.sign(payload, JWT_SECRET, { expiresIn }, (err, token) => {
      if (err) throw err;
      
      // Return user info (excluding password)
      const userInfo = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      };
      
      // Set cookie for server-side auth if using cookies
      if (rememberMe) {
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          sameSite: 'strict'
        });
      } else {
        res.cookie('authToken', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });
      }
      
      res.json({
        success: true,
        token,
        user: userInfo
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Auth middleware
const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if no token
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }
  
  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({ success: false, message: 'Access denied: Admin privileges required' });
};

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE id = ?', [req.user.id]);
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const user = users[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a logout route
router.get('/logout', (req, res) => {
  // Clear cookie
  res.clearCookie('authToken');
  
  // Send success response
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = { router, auth, admin }; 