import React from 'react';
import AuthLayout from '../../features/auth/components/AuthLayout';
import LoginForm from '../../features/auth/components/LoginForm';

export default function Login() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your API Forge account">
      <LoginForm />
    </AuthLayout>
  );
}
