import React, { useEffect } from 'react';
import Providers from './providers';
import AppRouter from './router';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useAuthStore } from '../features/auth/store/authStore';

function AuthBootstrap({ children }) {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AuthBootstrap>
          <AppRouter />
        </AuthBootstrap>
      </Providers>
    </ErrorBoundary>
  );
}
