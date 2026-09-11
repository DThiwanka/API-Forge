import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Terminal, Lock, Mail, User, ArrowRight } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/workspace');
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f0f2f5] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111318] border border-[#232732] rounded-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400">
            <Terminal size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Create Account</h2>
            <p className="text-[11px] text-slate-500">Get started with APIForge</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Name</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full bg-[#181b22] border border-[#232732] rounded px-3 py-2 pl-9 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@apiforge.local"
                className="w-full bg-[#181b22] border border-[#232732] rounded px-3 py-2 pl-9 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#181b22] border border-[#232732] rounded px-3 py-2 pl-9 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            Create Account <ArrowRight size={13} />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-[#232732] text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-sky-400 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
