import React from 'react';
import Providers from './providers';
import AppRouter from './router';
import ErrorBoundary from '../components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
}
