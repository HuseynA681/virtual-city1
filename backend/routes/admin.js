const express = require('express');
const { authMiddleware, adminMiddleware, moderatorMiddleware, isOwnerUser, checkRoleLevel, ROLE_NAMES } = require('../middleware/auth');
const { readDatabase, writeDatabase, findById, filter } = require('../store');

module.exports = (io) => {
  const router = express.Router();

  const findUserByIdOrName = (db, value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;

    return filter(db, 'users', () => true).find((user) => (
      String(user._id) === value ||
      user.username?.toLowerCase() === normalized ||
      user.email?.toLowerCase() === normalized
    ));
  };

  const cleanUser = (user) => {
    const cleaned = { ...user, id: user._id };
    delete cleaned.password;
    return cleaned;
  };

  // ==================== MODERATION COMMANDS ====================

  // Ban user
  router.post('/ban/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findById(db, 'users', req.params.userId);
      const executor = findById(db, 'users', req.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.roleLevel >= executor.roleLevel && !isOwnerUser(executor)) {
        return res.status(403).json({ error: 'Cannot ban users with equal or higher role' });
      }

      user.isBanned = true;
      writeDatabase(db);
      
      io.emit('user-action', { 
        type: 'ban', 
        username: user.username, 
        by: executor.username,
        message: `${user.username} has been banned by ${executor.username}`
      });

      res.json({ message: 'User banned', user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban user' });
    }
  });

  // Unban user
  router.post('/unban/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findById(db, 'users', req.params.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.isBanned = false;
      writeDatabase(db);
      
      io.emit('user-action', { 
        type: 'unban', 
        username: user.username,
        message: `${user.username} has been unbanned`
      });

      res.json({ message: 'User unbanned', user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unban user' });
    }
  });

  // Mute user (temporary silence)
  router.post('/mute/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findById(db, 'users', req.params.userId);
      const { duration = 3600 } = req.body; // Duration in seconds (default 1 hour)

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.isMuted = true;
      user.muteExpiry = new Date(Date.now() + duration * 1000);
      writeDatabase(db);

      io.emit('user-action', { 
        type: 'mute', 
        username: user.username,
        duration,
        message: `${user.username} has been muted for ${duration} seconds`
      });

      res.json({ message: `User muted for ${duration}s`, user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mute user' });
    }
  });

  // Unmute user
  router.post('/unmute/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findById(db, 'users', req.params.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.isMuted = false;
      user.muteExpiry = null;
      writeDatabase(db);

      io.emit('user-action', { 
        type: 'unmute', 
        username: user.username,
        message: `${user.username} has been unmuted`
      });

      res.json({ message: 'User unmuted', user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unmute user' });
    }
  });

  // Kick user from session
  router.post('/kick/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findById(db, 'users', req.params.userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      io.emit('user-action', { 
        type: 'kick', 
        userId: user._id,
        username: user.username,
        message: `${user.username} has been kicked from the server`
      });

      res.json({ message: 'User kicked', user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to kick user' });
    }
  });

  // ==================== ROLE MANAGEMENT ====================

  // Promote user (increase role level)
  router.post('/promote/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findUserByIdOrName(db, req.params.userId);
      const executor = findById(db, 'users', req.userId);
      const { newRole = user.roleLevel + 1 } = req.body;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isOwnerUser(user)) {
        return res.status(403).json({ error: 'Cannot modify owner role' });
      }

      if (newRole >= executor.roleLevel && !isOwnerUser(executor)) {
        return res.status(403).json({ error: 'Cannot promote to equal or higher role' });
      }

      if (newRole < 1 || newRole > 10) {
        return res.status(400).json({ error: 'Role level must be between 1-10' });
      }

      user.roleLevel = newRole;
      user.isAdmin = newRole >= 7;
      writeDatabase(db);

      io.emit('user-action', { 
        type: 'promote', 
        username: user.username,
        newRole: newRole,
        roleName: ROLE_NAMES[newRole],
        message: `${user.username} promoted to ${ROLE_NAMES[newRole]}`
      });

      res.json({ message: `User promoted to ${ROLE_NAMES[newRole]}`, user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to promote user' });
    }
  });

  // Demote user (decrease role level)
  router.post('/demote/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findUserByIdOrName(db, req.params.userId);
      const executor = findById(db, 'users', req.userId);
      const { newRole = Math.max(1, user.roleLevel - 1) } = req.body;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isOwnerUser(user)) {
        return res.status(403).json({ error: 'Cannot demote owner' });
      }

      if (user.roleLevel >= executor.roleLevel && !isOwnerUser(executor)) {
        return res.status(403).json({ error: 'Cannot demote users with equal or higher role' });
      }

      if (newRole < 1 || newRole > 10) {
        return res.status(400).json({ error: 'Role level must be between 1-10' });
      }

      user.roleLevel = newRole;
      user.isAdmin = newRole >= 7;
      writeDatabase(db);

      io.emit('user-action', { 
        type: 'demote', 
        username: user.username,
        newRole: newRole,
        roleName: ROLE_NAMES[newRole],
        message: `${user.username} demoted to ${ROLE_NAMES[newRole]}`
      });

      res.json({ message: `User demoted to ${ROLE_NAMES[newRole]}`, user: cleanUser(user) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to demote user' });
    }
  });

  // Set role level directly
  router.post('/set-role/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const user = findUserByIdOrName(db, req.params.userId);
      const executor = findById(db, 'users', req.userId);
      const { roleLevel } = req.body;

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (isOwnerUser(user)) {
        return res.status(403).json({ error: 'Cannot modify owner role' });
      }

      if (roleLevel >= executor.roleLevel && !isOwnerUser(executor)) {
        return res.status(403).json({ error: 'Cannot set role to equal or higher level' });
      }

      if (roleLevel < 1 || roleLevel > 10) {
        return res.status(400).json({ error: 'Role level must be between 1-10' });
      }

      user.roleLevel = roleLevel;
      user.isAdmin = roleLevel >= 7;
      writeDatabase(db);

      res.json({ 
        message: `Role set to ${ROLE_NAMES[roleLevel]}`, 
        user: cleanUser(user) 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set role' });
    }
  });

  // ==================== CHAT MANAGEMENT ====================

  // Clear chat messages
  router.delete('/chat/:channel?', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const channel = req.params.channel || 'global';
      let cleared = 0;

      db.messages = (db.messages || []).map((message) => {
        if (!message.deleted && (!channel || message.channel === channel)) {
          cleared += 1;
          return { ...message, deleted: true };
        }
        return message;
      });

      writeDatabase(db);
      res.json({ message: 'Chat cleared', channel, cleared });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear chat' });
    }
  });

  // Delete specific message
  router.delete('/message/:messageId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const message = findById(db, 'messages', req.params.messageId);

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      message.deleted = true;
      writeDatabase(db);
      res.json({ message: 'Message deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete message' });
    }
  });

  // ==================== COMMAND SYSTEM ====================

  // Run admin command by text
  router.post('/command', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [rawCommand, ...args] = String(req.body.command || '').trim().split(/\s+/);
      const command = rawCommand?.replace(/^\//, '').toLowerCase();
      const target = args.join(' ');
      const db = readDatabase();
      const executor = findById(db, 'users', req.userId);

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      if (command === 'help') {
        const minRole = executor.roleLevel;
        const availableCommands = [
          '/promote <username> - Increase user role',
          '/demote <username> - Decrease user role',
          '/ban <username> - Ban user',
          '/unban <username> - Unban user',
          '/mute <username> [duration] - Mute user (duration in seconds)',
          '/unmute <username> - Unmute user',
          '/kick <username> - Kick user from server',
          '/clear [channel] - Clear chat messages',
          '/setrole <username> <1-10> - Set user role level'
        ];

        if (minRole >= 9) {
          availableCommands.push('/fixowner - Fix owner role (Owner only)');
        }

        return res.json({
          message: 'Available commands',
          userRole: `${ROLE_NAMES[executor.roleLevel]} (Level ${executor.roleLevel})`,
          commands: availableCommands
        });
      }

      // Commands that don't need a target
      if (command === 'clear') {
        const channel = target || 'global';
        let cleared = 0;
        db.messages = (db.messages || []).map((message) => {
          if (!message.deleted && message.channel === channel) {
            cleared += 1;
            return { ...message, deleted: true };
          }
          return message;
        });
        writeDatabase(db);
        return res.json({ message: `Cleared ${cleared} messages in ${channel}`, cleared, channel });
      }

      if (command === 'fixowner') {
        if (!isOwnerUser(executor)) {
          return res.status(403).json({ error: 'Owner only' });
        }
        executor.roleLevel = 10;
        executor.isAdmin = true;
        writeDatabase(db);
        return res.json({ message: 'Owner role fixed', user: cleanUser(executor) });
      }

      // Commands that need a target
      if (!target) {
        return res.status(400).json({ error: `/${command} requires a username, email, or user id` });
      }

      const user = findUserByIdOrName(db, target);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent acting on same or higher level users
      if (user.roleLevel >= executor.roleLevel && !isOwnerUser(executor)) {
        return res.status(403).json({ error: 'Cannot perform action on users with equal or higher role' });
      }

      if (command === 'promote') {
        user.roleLevel = Math.min(10, user.roleLevel + 1);
        user.isAdmin = user.roleLevel >= 7;
        writeDatabase(db);
        io.emit('user-action', { type: 'promote', username: user.username, newRole: user.roleLevel });
        return res.json({ message: `${user.username} promoted to ${ROLE_NAMES[user.roleLevel]}`, user: cleanUser(user) });
      }

      if (command === 'demote') {
        user.roleLevel = Math.max(1, user.roleLevel - 1);
        user.isAdmin = user.roleLevel >= 7;
        writeDatabase(db);
        io.emit('user-action', { type: 'demote', username: user.username, newRole: user.roleLevel });
        return res.json({ message: `${user.username} demoted to ${ROLE_NAMES[user.roleLevel]}`, user: cleanUser(user) });
      }

      if (command === 'ban') {
        user.isBanned = true;
        writeDatabase(db);
        io.emit('user-action', { type: 'ban', username: user.username });
        return res.json({ message: `${user.username} banned`, user: cleanUser(user) });
      }

      if (command === 'unban') {
        user.isBanned = false;
        writeDatabase(db);
        io.emit('user-action', { type: 'unban', username: user.username });
        return res.json({ message: `${user.username} unbanned`, user: cleanUser(user) });
      }

      if (command === 'mute') {
        const duration = parseInt(args[1]) || 3600;
        user.isMuted = true;
        user.muteExpiry = new Date(Date.now() + duration * 1000);
        writeDatabase(db);
        io.emit('user-action', { type: 'mute', username: user.username, duration });
        return res.json({ message: `${user.username} muted for ${duration}s`, user: cleanUser(user) });
      }

      if (command === 'unmute') {
        user.isMuted = false;
        user.muteExpiry = null;
        writeDatabase(db);
        io.emit('user-action', { type: 'unmute', username: user.username });
        return res.json({ message: `${user.username} unmuted`, user: cleanUser(user) });
      }

      if (command === 'kick') {
        io.emit('user-action', { type: 'kick', userId: user._id, username: user.username });
        return res.json({ message: `${user.username} kicked`, user: cleanUser(user) });
      }

      if (command === 'setrole') {
        const roleLevel = parseInt(target);
        if (isNaN(roleLevel) || roleLevel < 1 || roleLevel > 10) {
          return res.status(400).json({ error: 'Role must be between 1-10' });
        }
        user.roleLevel = roleLevel;
        user.isAdmin = roleLevel >= 7;
        writeDatabase(db);
        io.emit('user-action', { type: 'setrole', username: user.username, newRole: roleLevel });
        return res.json({ message: `${user.username} role set to ${ROLE_NAMES[roleLevel]}`, user: cleanUser(user) });
      }

      return res.status(400).json({ error: 'Unknown admin command. Use /help for list' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to run admin command', details: error.message });
    }
  });

  // ==================== ADMIN UTILITIES ====================

  // Get site stats
  router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const totalUsers = filter(db, 'users', () => true).length;
      const activeUsers = filter(db, 'users', (user) => new Date(user.lastLogin) >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
      const totalClans = filter(db, 'clans', () => true).length;
      const bannedUsers = filter(db, 'users', (user) => user.isBanned).length;
      const mutedUsers = filter(db, 'users', (user) => user.isMuted && (!user.muteExpiry || new Date(user.muteExpiry) > new Date())).length;

      const roleDistribution = {};
      filter(db, 'users', () => true).forEach(user => {
        const role = user.roleLevel || 1;
        roleDistribution[ROLE_NAMES[role]] = (roleDistribution[ROLE_NAMES[role]] || 0) + 1;
      });

      res.json({
        totalUsers,
        activeUsers,
        totalClans,
        bannedUsers,
        mutedUsers,
        roleDistribution,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // Get all users (admin panel)
  router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const db = readDatabase();
      const users = filter(db, 'users', () => true).map(user => ({
        _id: user._id,
        username: user.username,
        email: user.email,
        roleLevel: user.roleLevel || 1,
        roleName: ROLE_NAMES[user.roleLevel || 1],
        level: user.level,
        coins: user.coins,
        isBanned: user.isBanned,
        isMuted: user.isMuted,
        muteExpiry: user.muteExpiry,
        createdAt: user.createdAt
      }));

      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  return router;
};
