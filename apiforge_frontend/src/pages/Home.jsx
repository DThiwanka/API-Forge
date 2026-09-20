import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/authStore';
import {
  Terminal,
  ArrowRight,
  LayoutDashboard,
  Network,
  Play,
  Globe,
  FlaskConical,
  Users,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  const capabilities = [
    {
      icon: Network,
      title: 'Spatial API Canvas',
      description: 'Interact with requests, folders, and collections visually on an infinite 2D canvas with inferred relationship edges.',
      badge: 'Signature',
    },
    {
      icon: LayoutDashboard,
      title: 'Request Workspace',
      description: 'Tabbed HTTP client with query parameters, headers, auth mechanisms, structured payloads, and response inspection.',
      badge: 'Core',
    },
    {
      icon: Play,
      title: 'Collection Runner',
      description: 'Run complete API collections sequentially with runtime variable extraction and dynamic request chaining.',
      badge: 'Automation',
    },
    {
      icon: Globe,
      title: 'Browser Space',
      description: 'Integrated developer browser with live network activity capture and one-click import into your API workspace.',
      badge: 'Tooling',
    },
    {
      icon: FlaskConical,
      title: 'API Assertions & Testing',
      description: 'Built-in assertion engine evaluating status codes, JSONPath expressions, response times, and headers.',
      badge: 'Reliability',
    },
    {
      icon: Users,
      title: 'Realtime Collaboration',
      description: 'Multi-user workspaces with role-based access control, secure invitations, and live updates via WebSockets.',
      badge: 'Teams',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f0f2f5] flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
      {/* Header */}
      <header className="h-14 border-b border-[#232732] px-6 flex items-center justify-between bg-[#111318]/80 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-sky-950 border border-sky-600/40 flex items-center justify-center text-sky-400 shadow-sm">
            <Terminal size={16} />
          </div>
          <span className="font-bold text-sm tracking-wider uppercase">APIForge</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1a1f2c] text-sky-400 border border-sky-800/40">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline truncate max-w-[200px]">
                {user?.email}
              </span>
              <Link
                to="/workspace"
                className="px-3.5 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Open Workspace <ArrowRight size={13} />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded hover:bg-[#181b22] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/workspace"
                className="px-3.5 py-1.5 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Open Workspace <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-800/50 text-sky-400 text-xs font-mono mb-6">
          <Zap size={13} />
          <span>Spatial API Development & Testing Workspace</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4 sm:text-5xl lg:text-6xl max-w-3xl leading-tight">
          Craft, Test, and Visualize APIs with Spatial Precision
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-8 leading-relaxed">
          A developer-first infrastructure tool combining multi-request tabs, an infinite Spatial Canvas,
          automated collection execution, and browser network capture in one coherent environment.
        </p>

        <div className="flex items-center gap-3 mb-16 flex-wrap justify-center">
          <Link
            to="/workspace"
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-md font-medium text-sm transition-all flex items-center gap-2 shadow-lg shadow-sky-950/80 cursor-pointer"
          >
            <LayoutDashboard size={17} />
            {isAuthenticated ? 'Open Workspace' : 'Launch Workspace'}
          </Link>
          {!isAuthenticated && (
            <Link
              to="/login"
              className="px-6 py-3 bg-[#181b22] hover:bg-[#222630] active:bg-[#14161d] text-slate-200 border border-[#2b313e] rounded-md font-medium text-sm transition-colors cursor-pointer"
            >
              Sign In to Account
            </Link>
          )}
        </div>

        {/* Feature Grid */}
        <div className="w-full text-left grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-5 rounded-lg bg-[#111318]/70 border border-[#232732] hover:border-slate-700 transition-all space-y-2.5 shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded bg-sky-950/60 border border-sky-800/40 text-sky-400 group-hover:text-sky-300 transition-colors">
                    <Icon size={16} />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#181b22] border border-[#2b313e] text-slate-400 font-semibold uppercase tracking-wider">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-200 pt-1">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#232732] px-6 flex items-center justify-between text-xs text-slate-500 font-mono bg-[#0d0f14]">
        <span>APIForge v1.0 • Spatial API Development & Testing Workspace</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>SSRF Protected & Production Ready</span>
        </div>
      </footer>
    </div>
  );
}
