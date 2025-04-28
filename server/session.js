const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';

// Create a session
exports.createSession = (user) => {
  // Create JWT payload
  const payload = {
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  };
  
  // Sign token
  return new Promise((resolve, reject) => {
    jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES }, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

// Verify a session
exports.verifySession = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

// Check if user is admin
exports.isAdmin = (decoded) => {
  return decoded && decoded.user && decoded.user.role === 'admin';
}; 