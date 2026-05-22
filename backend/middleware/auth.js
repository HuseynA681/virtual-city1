const jwt = require('jsonwebtoken');
const { readDatabase, findById } = require('../store');

const OWNER_USERNAME = 'HuseynAgazade123';

// Role definitions (1-10)
const ROLE_NAMES = {
  10: 'Owner (Me)',
  9: 'Polkovnik',
  8: 'Padpolkovnik',
  7: 'Mayor',
  6: 'Kapitan',
  5: 'Baş Leytenant',
  4: 'Kicik Leytenant',
  3: 'Gizir',
  2: 'Serjant',
  1: 'Kiçik serjant'
};

const isOwnerUser = (user) => user?.username?.trim().toLowerCase() === OWNER_USERNAME.toLowerCase();

// Check if user has minimum role level required
const checkRoleLevel = (userRoleLevel, requiredLevel) => {
  return (userRoleLevel || 1) >= requiredLevel;
};

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const db = readDatabase();
    const user = findById(db, 'users', decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Set owner to roleLevel 10 automatically
    if (isOwnerUser(user) && (!user.roleLevel || user.roleLevel < 10)) {
      user.roleLevel = 10;
      user.isAdmin = true;
    }

    req.userId = decoded.userId;
    req.user = {
      ...decoded,
      username: user.username,
      roleLevel: user.roleLevel || 1,
      roleName: ROLE_NAMES[user.roleLevel || 1],
      isAdmin: user.isAdmin || (user.roleLevel >= 7)
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Admin middleware - requires role level 7 or higher
const adminMiddleware = (req, res, next) => {
  if (!req.user || !checkRoleLevel(req.user.roleLevel, 7)) {
    return res.status(403).json({ error: 'Admin access required (Role level 7+)' });
  }
  next();
};

// Moderator middleware - requires role level 5 or higher
const moderatorMiddleware = (req, res, next) => {
  if (!req.user || !checkRoleLevel(req.user.roleLevel, 5)) {
    return res.status(403).json({ error: 'Moderator access required (Role level 5+)' });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, moderatorMiddleware, isOwnerUser, checkRoleLevel, ROLE_NAMES };
