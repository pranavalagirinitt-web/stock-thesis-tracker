import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

export default function Admin() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/users/${id}`);
      setSelectedUser(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRoleChange = async (id, role) => {
    if (!confirm(`Change this user's role to ${role}?`)) return;
    try {
      await api.put(`/admin/users/${id}/role`, { role });
      fetchUsers();
      if (selectedUser?.id === id) fetchUserDetail(id);
    } catch (err) {
      alert('Failed to change role.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Permanently delete this user and all their data?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      {/* Navbar */}
      <nav className="border-b border-[#1e2d4a] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors text-sm">
          ← Dashboard
        </button>
        <h1 className="text-xl font-bold tracking-tight">
          THESIS <span className="text-[#00ff88]">TRACKER</span>
          <span className="text-gray-400 text-sm font-normal ml-3">Admin Panel</span>
        </h1>
        <span className="ml-auto text-gray-400 text-sm font-mono">{user?.name}</span>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">

          {/* Users List */}
          <div className="w-96 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">All Users</h2>
              <span className="text-gray-400 text-sm font-mono">{users.length} total</span>
            </div>

            {loading ? (
              <p className="text-gray-400 font-mono text-sm">Loading...</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id}
                    onClick={() => fetchUserDetail(u.id)}
                    className={`bg-[#0f1629] border rounded-xl px-4 py-3 cursor-pointer transition-colors
                      ${selectedUser?.id === u.id ? 'border-[#00ff88]/40' : 'border-[#1e2d4a] hover:border-[#00ff88]/20'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white text-sm font-semibold">{u.name}</p>
                        <p className="text-gray-400 text-xs font-mono">{u.email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-mono px-2 py-0.5 rounded
                          ${u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#1a2440] text-gray-400'}`}>
                          {u.role}
                        </span>
                        <p className="text-gray-600 text-xs font-mono mt-1">{u._count.watchlist} stocks</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Detail */}
          <div className="flex-1">
            {!selectedUser ? (
              <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-8 text-center">
                <p className="text-gray-400 font-mono text-sm">Select a user to view their details</p>
              </div>
            ) : detailLoading ? (
              <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-8 text-center">
                <p className="text-gray-400 font-mono text-sm">Loading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Header */}
                <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-white text-xl font-bold">{selectedUser.name}</h3>
                      <p className="text-gray-400 text-sm font-mono">{selectedUser.email}</p>
                      <p className="text-gray-600 text-xs font-mono mt-1">
                        Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUser.role === 'USER' ? (
                        <button onClick={() => handleRoleChange(selectedUser.id, 'ADMIN')}
                          className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded font-mono hover:bg-purple-500/30 transition-colors">
                          Make Admin
                        </button>
                      ) : (
                        <button onClick={() => handleRoleChange(selectedUser.id, 'USER')}
                          className="text-xs bg-[#1a2440] text-gray-400 border border-[#1e2d4a] px-3 py-1.5 rounded font-mono hover:bg-[#243055] transition-colors">
                          Remove Admin
                        </button>
                      )}
                      {selectedUser.id !== user.id && (
                        <button onClick={() => handleDeleteUser(selectedUser.id)}
                          className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded font-mono hover:bg-red-500/20 transition-colors">
                          Delete User
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* User's Watchlist */}
                <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-xl p-6">
                  <h4 className="text-white font-semibold mb-4">
                    Watchlist <span className="text-gray-400 font-mono text-sm">({selectedUser.watchlist.length} stocks)</span>
                  </h4>
                  {selectedUser.watchlist.length === 0 ? (
                    <p className="text-gray-600 font-mono text-sm">No stocks tracked yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedUser.watchlist.map(item => (
                        <div key={item.id} className="bg-[#1a2440] rounded-xl px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-mono font-bold">{item.symbol}</span>
                              <span className="text-xs bg-[#0f1629] text-gray-400 px-2 py-0.5 rounded font-mono">{item.market}</span>
                            </div>
                            <span className="text-gray-400 text-sm">{item.companyName}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {item.thesisCases.map(tc => (
                              <span key={tc.id} className={`text-xs px-2 py-0.5 rounded font-mono
                                ${tc.type === 'BUY' ? 'bg-green-500/20 text-green-400' :
                                  tc.type === 'SELL' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'}`}>
                                {tc.type} ({tc.conditions.length} conditions)
                              </span>
                            ))}
                            {item.thesisCases.length === 0 && (
                              <span className="text-xs text-gray-600 font-mono">No thesis set</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}