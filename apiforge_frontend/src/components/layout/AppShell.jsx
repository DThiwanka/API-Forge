import TopBar from './TopBar';
import WorkspaceHeader from './WorkspaceHeader';
import StatusBar from './StatusBar';

export default function AppShell({ children, workspaceId }) {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#090a0f] text-[#f0f2f5] overflow-hidden">
      <TopBar workspaceId={workspaceId} />
      {workspaceId && <WorkspaceHeader workspaceId={workspaceId} />}
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>
      <StatusBar workspaceId={workspaceId} />
    </div>
  );
}
