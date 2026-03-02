const { verifyToken } = require('../controllers/auth.controller');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ success: false, message: 'Authorization header missing.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, message: 'Invalid authorization header format.' });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('JWT verification failed', err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = {
  authenticateToken,
};

