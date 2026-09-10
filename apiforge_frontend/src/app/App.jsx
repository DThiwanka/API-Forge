import React from 'react';
import Providers from './providers';
import AppRouter from './router';
import AppShell from '../components/layout/AppShell';

export default function App() {
  return (
    <Providers>
      <AppShell>
        <AppRouter />
      </AppShell>
    </Providers>
  );
}
