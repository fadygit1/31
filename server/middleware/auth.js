import jwt from 'jsonwebtoken';
import { pool } from '../database/init.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if session is still valid
    const sessionCheck = await pool.query(
      'SELECT u.*, s.expires_at FROM users u JOIN user_sessions s ON u.id = s.user_id WHERE u.id = $1 AND s.token_hash = $2 AND s.expires_at > NOW()',
      [decoded.userId, token]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = sessionCheck.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireDepartment = (departments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!departments.includes(req.user.department)) {
      return res.status(403).json({ error: 'Department access required' });
    }

    next();
  };
};