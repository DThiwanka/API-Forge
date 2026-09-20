import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import apiClient from '../lib/apiClient';
import { useAuthStore } from '../features/auth/store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const user = response.data?.data?.user;
      if (user) {
        useAuthStore.getState().setAuth(user);
      }
      navigate('/workspace', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f0f2f5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111318] border border-[#232732] rounded-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400">
            <Terminal size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Sign In to APIForge</h2>
            <p className="text-[11px] text-slate-500">Enter your credentials to access workspace</p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            id="login-error"
            aria-live="assertive"
            className="mb-4 p-2.5 rounded bg-rose-950/40 border border-rose-800/50 flex items-center gap-2 text-xs text-rose-300"
          >
            <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs text-slate-400 mb-1 font-medium">
              Email <span className="text-rose-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@apiforge.local"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 pl-9 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs text-slate-400 mb-1 font-medium">
              Password <span className="text-rose-400" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full bg-[#181b22] border border-[#2b313e] rounded px-3 py-2 pl-9 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#232732] text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-sky-400 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
