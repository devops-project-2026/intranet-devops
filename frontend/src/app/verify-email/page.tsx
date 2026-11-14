'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(
    token
      ? 'Verifying your email...'
      : 'No verification token provided. Are you sure you copied the correct link?'
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const verifyToken = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/verify-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Your email has been successfully verified!');
        } else {
          setStatus('error');
          setMessage(data.message || data.error || 'The token is invalid or has expired.');
        }
      } catch {
        setStatus('error');
        setMessage('Network error occurred while trying to verify your email. Please try again later.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-black">Email Verification</h1>
        
        {status === 'loading' && (
          <div className="text-gray-600">
            <span className="inline-block animate-spin mr-2">⟳</span>
            {message}
          </div>
        )}

        {status === 'success' && (
          <div className="text-green-600">
            <p className="mb-6">{message}</p>
            <Link 
              href="/login" 
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-red-600">
            <p className="mb-6">{message}</p>
            <Link 
              href="/signup" 
              className="inline-block px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
            >
              Back to Registration
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center mt-20">Loading verification process...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
