import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, setToken } from '../api/auth';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
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

  return <LoginForm onLogin={handleLogin} onRegisterComplete={handleRegisterComplete} />;
}
