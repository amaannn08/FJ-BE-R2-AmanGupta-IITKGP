import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, setToken } from '../api/auth';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const [authErrorFromOAuth, setAuthErrorFromOAuth] = useState(false);
  const [initialMessage, setInitialMessage] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const authError = params.get('auth');
    const emailVerified = params.get('emailVerified');

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      window.history.replaceState({}, '', window.location.pathname);
      navigate('/dashboard', { replace: true });
      return;
    }

    if (emailVerified === '1') {
      window.history.replaceState({}, '', window.location.pathname);
      setInitialMessage({
        type: 'success',
        text: 'Your email has been verified. You can now sign in.',
      });
      return;
    }

    if (authError === 'error') {
      window.history.replaceState({}, '', window.location.pathname);
      setAuthErrorFromOAuth(true);
    }

    if (getToken()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleLogin = () => {
    navigate('/dashboard');
  };

  const handleRegisterComplete = (email) => {
    navigate('/verify-email', { state: { email } });
  };

  return (
    <LoginForm
      onLogin={handleLogin}
      onRegisterComplete={handleRegisterComplete}
        initialMessage={
          initialMessage
            ? initialMessage
            : authErrorFromOAuth
              ? { type: 'error', text: 'Sign-in failed. Please try again.' }
              : null
        }
    />
  );
}
