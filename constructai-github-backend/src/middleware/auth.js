const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_random_secret_key_12345';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Support for development mock token bypass
  if (token === 'mock_token') {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = userAgent.includes('Expo') || 
                     userAgent.includes('okhttp') || 
                     userAgent.includes('Darwin') || 
                     userAgent.includes('Android') ||
                     req.headers['x-platform'] === 'mobile';
    
    if (isMobile) {
      req.user = { id: 12, email: 'ravi@constructai.com', fullName: 'Ravi', role: 'Worker' };
    } else {
      req.user = { id: 11, email: 'arjun@constructai.com', fullName: 'Arjun M.', role: 'Manager' };
    }
    return next();
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
