import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../api/auth';

export default function GoogleOAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const authError = params.get('auth');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      navigate('/dashboard', { replace: true });
      return;
    }

    if (authError === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
    }

    navigate('/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-8">
        <p className="text-sm text-slate-600 text-center">
          Completing Google sign-in&hellip;
        </p>
      </div>
    </div>
  );
}

