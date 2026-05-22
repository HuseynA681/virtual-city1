import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Users, TrendingUp, BarChart3, Ban, Trash2, UserPlus, UserMinus, MessageSquare, Shield, AlertCircle, Loader } from 'lucide-react';
import { apiUrl } from '../config/api';

const ROLE_NAMES = {
  10: 'Me (Owner)',
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

export const AdminPanelComponent = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [command, setCommand] = useState('');
  const [commandOutput, setCommandOutput] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [muteDuration, setMuteDuration] = useState(3600);
  const { token, user } = useAuth();

  useEffect(() => {
    if (activeTab === 'stats') fetchStats();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl('/api/admin/stats'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(apiUrl('/api/admin/users'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeCommand = async (action, userId = null, extraData = {}) => {
    try {
      setLoading(true);
      const payload = userId
        ? { headers: { Authorization: `Bearer ${token}` }, data: extraData }
        : { headers: { Authorization: `Bearer ${token}` }, data: { ...extraData } };

      const url = userId
        ? apiUrl(`/api/admin/${action}/${userId}`)
        : apiUrl(`/api/admin/${action}`);

      let response;
      if (action === 'command') {
        response = await axios.post(url, { command: extraData.command }, payload);
      } else {
        response = await axios.post(url, extraData, payload);
      }

      setCommandOutput(`✅ ${response.data.message}`);
      fetchUsers();
      if (activeTab === 'stats') fetchStats();
    } catch (error) {
      const errorMsg = error.response?.data?.error || `Failed to execute ${action}`;
      setCommandOutput(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCommand = async () => {
    if (!command.trim()) {
      setCommandOutput('❌ Please enter a command');
      return;
    }
    await executeCommand('command', null, { command: command.trim() });
    setCommand('');
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-0 md:px-4">
      {/* Tabs */}
      <div className="flex gap-2 md:gap-4 p-3 md:p-4 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 overflow-x-auto">
        {['stats', 'users', 'commands', 'moderation'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 md:px-4 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
              activeTab === tab
                ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <StatCard icon="👥" label="Total Users" value={stats.totalUsers} />
            <StatCard icon="🟢" label="Active Users" value={stats.activeUsers} />
            <StatCard icon="🏢" label="Total Clans" value={stats.totalClans} />
            <StatCard icon="🚫" label="Banned" value={stats.bannedUsers} />
            <StatCard icon="🤐" label="Muted" value={stats.mutedUsers} />
          </div>

          {stats.roleDistribution && (
            <div className="p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <h3 className="text-lg md:text-xl font-bold mb-6">Role Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(stats.roleDistribution).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="font-medium">{role}</span>
                    <span className="text-purple-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(u => (
                <UserCard
                  key={u._id}
                  user={u}
                  onAction={executeCommand}
                  onSelect={() => setSelectedUser(selectedUser?._id === u._id ? null : u)}
                  isSelected={selectedUser?._id === u._id}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No users found</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Commands Tab */}
      {activeTab === 'commands' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <h3 className="text-lg font-bold mb-4">Command Console</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., /promote username, /ban username, /help"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRunCommand()}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleRunCommand}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-semibold transition"
              >
                Send
              </button>
            </div>

            {commandOutput && (
              <div className={`mt-4 p-4 rounded-lg ${
                commandOutput.startsWith('✅')
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                  : 'bg-red-500/20 border border-red-500/50 text-red-300'
              }`}>
                {commandOutput}
              </div>
            )}
          </div>

          <div className="p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <h3 className="text-lg font-bold mb-4">Available Commands</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <CommandInfo cmd="/promote <user>" desc="Increase user role" />
              <CommandInfo cmd="/demote <user>" desc="Decrease user role" />
              <CommandInfo cmd="/ban <user>" desc="Ban user" />
              <CommandInfo cmd="/unban <user>" desc="Unban user" />
              <CommandInfo cmd="/mute <user> [duration]" desc="Mute user" />
              <CommandInfo cmd="/unmute <user>" desc="Unmute user" />
              <CommandInfo cmd="/kick <user>" desc="Kick from server" />
              <CommandInfo cmd="/clear [channel]" desc="Clear chat" />
              <CommandInfo cmd="/setrole <user> <1-10>" desc="Set role level" />
              <CommandInfo cmd="/help" desc="Show all commands" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Moderation Tab */}
      {activeTab === 'moderation' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {selectedUser && (
            <div className="p-4 md:p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <h3 className="text-lg font-bold mb-6">Manage User: {selectedUser.username}</h3>

              <div className="space-y-4">
                {/* Role Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Set Role Level</label>
                    <select
                      value={selectedRole || selectedUser.roleLevel}
                      onChange={(e) => setSelectedRole(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                        <option key={level} value={level}>
                          {level} - {ROLE_NAMES[level]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => executeCommand('set-role', selectedUser._id, { roleLevel: selectedRole || selectedUser.roleLevel })}
                      className="mt-2 w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
                    >
                      Update Role
                    </button>
                  </div>

                  {/* Mute Duration */}
                  {!selectedUser.isMuted && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">Mute Duration (seconds)</label>
                      <input
                        type="number"
                        value={muteDuration}
                        onChange={(e) => setMuteDuration(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-purple-500"
                        min="60"
                      />
                      <button
                        onClick={() => executeCommand('mute', selectedUser._id, { duration: muteDuration })}
                        className="mt-2 w-full px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 transition"
                      >
                        Mute User
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {!selectedUser.isBanned && (
                    <ActionBtn
                      icon="🚫"
                      label="Ban"
                      onClick={() => executeCommand('ban', selectedUser._id)}
                      color="red"
                    />
                  )}
                  {selectedUser.isBanned && (
                    <ActionBtn
                      icon="✅"
                      label="Unban"
                      onClick={() => executeCommand('unban', selectedUser._id)}
                      color="green"
                    />
                  )}
                  {selectedUser.isMuted && (
                    <ActionBtn
                      icon="🔊"
                      label="Unmute"
                      onClick={() => executeCommand('unmute', selectedUser._id)}
                      color="green"
                    />
                  )}
                  <ActionBtn
                    icon="👢"
                    label="Kick"
                    onClick={() => executeCommand('kick', selectedUser._id)}
                    color="orange"
                  />
                  {selectedUser.roleLevel < 10 && (
                    <ActionBtn
                      icon="⬆️"
                      label="Promote"
                      onClick={() => executeCommand('promote', selectedUser._id)}
                      color="blue"
                    />
                  )}
                  {selectedUser.roleLevel > 1 && (
                    <ActionBtn
                      icon="⬇️"
                      label="Demote"
                      onClick={() => executeCommand('demote', selectedUser._id)}
                      color="purple"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedUser && (
            <div className="p-8 text-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">Select a user from the Users tab to manage</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/50">
    <p className="text-3xl md:text-4xl mb-2">{icon}</p>
    <p className="text-gray-300 text-xs md:text-sm">{label}</p>
    <p className="text-2xl md:text-3xl font-bold">{value}</p>
  </div>
);

const UserCard = ({ user, onAction, onSelect, isSelected }) => (
  <motion.div
    layout
    onClick={onSelect}
    className={`p-3 md:p-4 rounded-lg border transition cursor-pointer ${
      isSelected
        ? 'bg-purple-600/30 border-purple-500'
        : 'bg-white/10 border-white/20 hover:bg-white/20'
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <p className="font-bold truncate">{user.username}</p>
        <p className="text-sm text-gray-400">{user.roleName} (Lvl {user.roleLevel})</p>
      </div>
      <div className="flex gap-2 text-sm">
        {user.isBanned && <span className="px-2 py-1 rounded bg-red-500/30 text-red-300">Banned</span>}
        {user.isMuted && <span className="px-2 py-1 rounded bg-yellow-500/30 text-yellow-300">Muted</span>}
      </div>
    </div>
    {isSelected && (
      <div className="flex gap-2 flex-wrap text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction(user.isBanned ? 'unban' : 'ban', user._id);
          }}
          className={`px-2 py-1 rounded ${
            user.isBanned ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'
          }`}
        >
          {user.isBanned ? 'Unban' : 'Ban'}
        </button>
      </div>
    )}
  </motion.div>
);

const CommandInfo = ({ cmd, desc }) => (
  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
    <p className="font-mono text-purple-300">{cmd}</p>
    <p className="text-xs text-gray-400 mt-1">{desc}</p>
  </div>
);

const ActionBtn = ({ icon, label, onClick, color = 'purple' }) => {
  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700',
    green: 'bg-green-600 hover:bg-green-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    orange: 'bg-orange-600 hover:bg-orange-700'
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`px-3 py-2 rounded-lg ${colorClasses[color]} text-white font-semibold transition text-sm`}
    >
      {icon} {label}
    </button>
  );
};
