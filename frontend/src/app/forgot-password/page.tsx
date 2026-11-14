'use client';

import { useState, Suspense } from 'react';
import { Mail, Shield, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const fromProfile = searchParams.get('from') === 'profile';
  const inviteEmail = searchParams.get('email') || '';
  const invited = searchParams.get('invited') === '1';
  
  const [email, setEmail] = useState(inviteEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(
    invited ? 'Your account was created. Use the code sent to your email to set a new password.' : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'An error occurred');
      }

      setStep(2);
      setSuccess('If this account exists, a 6-digit code has been sent to your email.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password: newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Invalid or expired code');
      }

      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your information below
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-md">
               {error}
             </div>
          )}
          {success && step !== 3 && (
             <div className="mb-4 bg-green-50 border border-green-200 text-green-600 text-sm p-3 rounded-md">
               {success}
             </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md p-3 border text-black"
                    placeholder="jean.dupont@email.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLoading ? 'Sending...' : 'Send Code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
               <div>
                <label className="block text-sm font-medium text-gray-700">Confirmation Code (6 digits)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-10 block w-full font-mono tracking-widest sm:text-lg text-center border-gray-300 rounded-md p-3 border text-black"
                    placeholder="123456"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="mt-1">
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full sm:text-sm border-gray-300 rounded-md p-3 border text-black"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? 'Validating...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Mot de passe modifié !</h3>
              <p className="text-sm text-gray-500 mb-6">
                Votre mot de passe a été mis à jour avec succès. 
              </p>
              <Link href={fromProfile ? "/settings" : "/login"} className="w-full inline-flex justify-center py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                {fromProfile ? "Back to Settings" : "Retour à la connexion"}
              </Link>
            </div>
          )}

          {step !== 3 && (
            <div className="mt-6 text-center">
              <Link href={fromProfile ? "/settings" : "/login"} className="text-sm text-indigo-600 hover:text-indigo-500">
                {fromProfile ? "Back to Settings" : "Retour à la connexion"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex justify-center items-center">Chargement...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

