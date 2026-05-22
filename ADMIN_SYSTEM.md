# Admin System & Mobile Responsive UI - Implementation Guide

## Overview
This update introduces a comprehensive role-based admin system with 10 levels and a fully mobile-responsive interface for the Virtual City application.

## Backend Changes

### 1. Enhanced User Model (`backend/models/User.js`)
**Added Fields:**
- `roleLevel` (1-10): Numeric role system replacing string-based roles
- `isMuted`: Boolean flag for user mute status
- `muteExpiry`: Date field for mute expiration

**Role Hierarchy (1-10):**
- **Level 10:** Me (Owner/General) - Full access
- **Level 9:** Polkovnik
- **Level 8:** Padpolkovnik  
- **Level 7:** Mayor
- **Level 6:** Kapitan
- **Level 5:** Baş Leytenant
- **Level 4:** Kicik Leytenant
- **Level 3:** Gizir
- **Level 2:** Serjant
- **Level 1:** Kiçik serjant (Regular user)

### 2. Updated Auth Middleware (`backend/middleware/auth.js`)
**New Functions:**
- `checkRoleLevel(userRoleLevel, requiredLevel)`: Compare role levels
- `ROLE_NAMES`: Object mapping levels to names
- `moderatorMiddleware`: Role level 5+ access

**Permission Levels:**
- Admin Access: Role level 7+
- Moderator Access: Role level 5+

### 3. Enhanced Admin Routes (`backend/routes/admin.js`)

#### Moderation Commands
- `/ban <username>` - Ban user
- `/unban <username>` - Unban user
- `/mute <username> [duration]` - Mute user (duration in seconds)
- `/unmute <username>` - Unmute user
- `/kick <username>` - Kick from server
- `/clear [channel]` - Clear chat messages

#### Role Management
- `/promote <username>` - Increase role level
- `/demote <username>` - Decrease role level
- `/setrole <username> <1-10>` - Set specific role level
- `POST /promote/:userId` - API endpoint for promotion
- `POST /demote/:userId` - API endpoint for demotion
- `POST /set-role/:userId` - API endpoint to set specific role

#### New Admin Endpoints
- `GET /admin/stats` - Server statistics with role distribution
- `GET /admin/users` - List all users with roles and status
- `POST /admin/mute/:userId` - Mute user with duration
- `POST /admin/unmute/:userId` - Unmute user
- `POST /admin/kick/:userId` - Kick user

## Frontend Changes

### 1. Mobile-Responsive Dashboard (`frontend/src/pages/Dashboard.js`)
**Features:**
- Hamburger menu navigation (mobile)
- Fixed sidebar (desktop)
- Responsive grid layouts (1-2 columns on mobile, 4 on desktop)
- Touch-friendly padding and button sizes
- Mobile header with menu toggle

**Breakpoints Used:**
- Mobile: `px-4` (4-unit padding)
- Desktop: `lg:p-8` (8-unit padding)
- Grid: `grid-cols-2 md:grid-cols-4`

### 2. Enhanced Admin Panel (`frontend/src/components/AdminPanel.js`)
**New Features:**
- Four-tab interface: Stats, Users, Commands, Moderation
- User search and filtering
- Real-time command execution console
- Batch user management actions
- Role level selector (1-10)
- Mute duration control
- Live action buttons with visual feedback

**Tabs:**
1. **Stats**: Server statistics, role distribution, user counts
2. **Users**: User list with search, filterable by status
3. **Commands**: Command console with syntax help
4. **Moderation**: Direct user management interface

**Actions Available:**
- Ban/Unban
- Mute/Unmute (with duration)
- Kick
- Promote/Demote
- Set specific role
- Clear chat

## How to Use

### Backend Setup
```bash
cd backend
npm install  # (already done)
npm run dev  # Start backend with nodemon
```

### Frontend Setup
```bash
cd frontend
npm install  # (already done)
npm start    # Start React dev server
```

### Admin Commands (Chat Console or Command Tab)

**Basic Syntax:** `/command <username> [additional args]`

**Examples:**
```
/promote john          # Promote user to next level
/demote john           # Demote user to previous level
/ban john              # Ban user
/unban john            # Unban user
/mute john 7200        # Mute john for 2 hours (7200 seconds)
/kick john             # Kick user from server
/clear global          # Clear global chat
/setrole john 7        # Set john's role to level 7 (Mayor)
/help                  # Show available commands
```

### Admin Panel Usage

1. **Navigate to Admin**: Click "Admin" tab in Dashboard (requires role level 7+)
2. **Select Tab**:
   - **Stats**: View server overview and role distribution
   - **Users**: Search and select users for management
   - **Commands**: Type commands in the console
   - **Moderation**: Direct user management interface

3. **User Management**:
   - Click on user to select
   - Choose new role level
   - Set mute duration if needed
   - Click action button (Ban, Mute, Promote, etc.)

## Role Permissions

| Role Level | Name | Permission | Can Manage |
|---|---|---|---|
| 10 | Owner | Full system access | All levels 1-9 |
| 9 | Polkovnik | Admin commands | Levels 1-8 |
| 8 | Padpolkovnik | Admin commands | Levels 1-7 |
| 7 | Mayor | Moderator + Ban/Kick | Levels 1-6 |
| 6 | Kapitan | Moderator functions | Levels 1-5 |
| 5 | Baş Leytenant | Moderation (mute) | Levels 1-4 |
| 4-1 | Various | Limited or no admin | Own profile only |

## Mobile Optimization

### Key Features
- **Responsive Grid**: Adapts from 2-4 columns based on screen size
- **Hamburger Navigation**: Sidebar collapses into mobile menu
- **Touch-Friendly**: Larger tap targets (min 44px)
- **Optimized Typography**: Scales with viewport
- **Flexible Spacing**: Uses responsive padding classes
- **Overflow Handling**: Horizontal scroll for tables on mobile

### Tested Breakpoints
- Mobile: 375px - 640px
- Tablet: 768px - 1024px
- Desktop: 1280px+

## API Endpoints

### Admin Statistics
```
GET /api/admin/stats
Headers: Authorization: Bearer <token>
Response: { totalUsers, activeUsers, totalClans, bannedUsers, mutedUsers, roleDistribution }
```

### Get All Users
```
GET /api/admin/users
Headers: Authorization: Bearer <token>
Response: [{ _id, username, email, roleLevel, roleName, ... }]
```

### Execute Admin Command
```
POST /api/admin/command
Headers: Authorization: Bearer <token>
Body: { command: "/promote username" }
Response: { message, user }
```

### User Actions
```
POST /api/admin/ban/:userId
POST /api/admin/unban/:userId
POST /api/admin/mute/:userId { duration: 3600 }
POST /api/admin/unmute/:userId
POST /api/admin/kick/:userId
POST /api/admin/promote/:userId { newRole: 7 }
POST /api/admin/demote/:userId { newRole: 5 }
POST /api/admin/set-role/:userId { roleLevel: 6 }
```

## Database Compatibility

### MySQL
- Ensure `MYSQL_USER` and `MYSQL_PASSWORD` are set
- Run backend migration if needed for existing databases
- New fields will be auto-added to schema

### JSON Mode
- Works seamlessly with file-based storage
- Role data persists in `/backend/data/db.json`

## Files Modified

### Backend
- `backend/models/User.js` - Added roleLevel, isMuted fields
- `backend/middleware/auth.js` - Added role checking functions
- `backend/routes/admin.js` - Complete rewrite with new system

### Frontend
- `frontend/src/pages/Dashboard.js` - Mobile responsive layout
- `frontend/src/components/AdminPanel.js` - Enhanced UI and features

## Testing Checklist

- [ ] Mobile layout responsive on 375px, 768px, 1024px
- [ ] Admin commands execute via console
- [ ] Role promotions/demotions update correctly
- [ ] Mute feature with duration works
- [ ] Ban/Unban functionality works
- [ ] User search filters correctly
- [ ] Stats display accurate role distribution
- [ ] Sidebar collapses/expands on mobile
- [ ] Touch targets are adequate on mobile
- [ ] Admin access restricted to role 7+

## Notes
- Owner role (level 10) is automatically assigned to 'HuseynAgazade123'
- Users cannot perform actions on equal or higher role users
- All moderation actions are broadcast via WebSocket
- Mute durations are in seconds
- Chat clearing affects the specified channel
