import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import api from '../lib/api';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            THESIS <span className="text-[#00ff88]">TRACKER</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2 font-mono">
            Your personal investment thesis validator
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0f1629] border border-[#1e2d4a] rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-6">Sign in to your account</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-1 block">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-1 block">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#1a2440] border border-[#1e2d4a] text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#00ff88] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#00ff88] hover:bg-[#00cc6a] text-black font-semibold py-3 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <p className="text-gray-400 text-sm text-center mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#00ff88] hover:underline">
              Register
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}