const { verifySession } = require('../session');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

module.exports = (req, res) => {
  const { redirect, admin } = req.query;
  const token = req.cookies?.authToken || req.headers['x-auth-token'];
  
  if (!token) {
    return res.redirect(302, '/login');
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if admin route requires admin role
    if (admin === 'true' && decoded.user.role !== 'admin') {
      return res.redirect(302, '/dashboard');
    }
    
    // If redirect is specified, go there
    if (redirect) {
      return res.redirect(302, redirect);
    }
    
    // Default redirect based on role
    return res.redirect(302, decoded.user.role === 'admin' ? '/admin' : '/dashboard');
    
  } catch (err) {
    console.error('Auth check error:', err);
    
    // Clear the invalid token cookie
    res.setHeader('Set-Cookie', 'authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    
    return res.redirect(302, '/login');
  }
}; 