import TopBar from './TopBar';
import WorkspaceHeader from './WorkspaceHeader';
import StatusBar from './StatusBar';
import CommandCenter from '../../features/command-center/components/CommandCenter';
import ToastContainer from '../common/ToastContainer';

export default function AppShell({ children, workspaceId }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#090a0f] text-[#f0f2f5] overflow-hidden">
      {/* WCAG 2.2 AA 2.4.1 Bypass Blocks */}
      <a href="#main-content" className="sr-only skip-to-content">
        Skip to main content
      </a>
      <TopBar workspaceId={workspaceId} />
      {workspaceId && <WorkspaceHeader workspaceId={workspaceId} />}
      <main id="main-content" className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
      <StatusBar workspaceId={workspaceId} />
      {workspaceId && <CommandCenter workspaceId={workspaceId} />}
      <ToastContainer />
    </div>
  );
}
