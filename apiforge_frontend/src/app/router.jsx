import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Workspace from '../pages/Workspace';
import NotFound from '../pages/NotFound';
import LoadingScreen from '../components/common/LoadingScreen';
import { useAuthStore } from '../features/auth/store/authStore';

// Route-level code splitting for heavy, secondary workspaces
const ApiCanvasPage = lazy(() => import('../pages/canvas/ApiCanvasPage'));
const EnvironmentSettingsPage = lazy(() => import('../pages/environments/EnvironmentSettingsPage'));
const HistoryPage = lazy(() => import('../pages/history/HistoryPage'));
const CollectionRunnerPage = lazy(() => import('../pages/runner/CollectionRunnerPage'));
const BrowserPage = lazy(() => import('../pages/browser/BrowserPage'));
const WorkspaceMembersPage = lazy(() => import('../pages/workspace/WorkspaceMembersPage'));
const InvitationAcceptancePage = lazy(() => import('../pages/collaboration/InvitationAcceptancePage'));
const SettingsLayout = lazy(() => import('../pages/settings/SettingsLayout'));

function RootRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }
  return <Home />;
}

function GuestRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }
  return children;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen message="Loading page..." />}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            }
          />
          <Route path="/invite/:token" element={<InvitationAcceptancePage />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/workspace/:workspaceId" element={<Workspace />} />
          <Route path="/workspace/:workspaceId/canvas" element={<ApiCanvasPage />} />
          <Route path="/workspace/:workspaceId/browser" element={<BrowserPage />} />
          <Route path="/workspace/:workspaceId/environments" element={<EnvironmentSettingsPage />} />
          <Route path="/workspace/:workspaceId/members" element={<WorkspaceMembersPage />} />
          <Route path="/workspace/:workspaceId/settings" element={<SettingsLayout />} />
          <Route path="/workspace/:workspaceId/settings/:section" element={<SettingsLayout />} />
          <Route path="/settings" element={<SettingsLayout />} />
          <Route path="/settings/:section" element={<SettingsLayout />} />
          <Route path="/workspace/:workspaceId/history" element={<HistoryPage />} />
          <Route path="/workspace/:workspaceId/runner" element={<CollectionRunnerPage />} />
          <Route
            path="/workspace/:workspaceId/collections/:collectionId/requests/:requestId"
            element={<Workspace />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default AppRouter;
