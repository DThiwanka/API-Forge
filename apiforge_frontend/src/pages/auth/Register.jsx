import React from 'react';
import AuthLayout from '../../features/auth/components/RegisterForm';
import RegisterForm from '../../features/auth/components/RegisterForm';

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-100 text-center mb-6">Create Account</h1>
        <RegisterForm />
      </div>
    </div>
  );
}
