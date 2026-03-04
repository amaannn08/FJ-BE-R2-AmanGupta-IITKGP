import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestEmailOtp, verifyEmailOtp } from '../api/auth';

const LAST_REGISTER_EMAIL_KEY = 'finance_tracker_last_register_email';

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialEmail =
    (location.state && location.state.email) ||
    (() => {
      try {
        return localStorage.getItem(LAST_REGISTER_EMAIL_KEY) || '';
      } catch {
        return '';
      }
    })();

  const [email] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true });
    }
  }, [email, navigate]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code) {
      showMessage('error', 'Please enter the verification code.');
      return;
    }

    setVerifying(true);
    setMessage({ type: '', text: '' });

    try {
      await verifyEmailOtp(email, code);
      showMessage('success', 'Email verified! You can now sign in.');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      showMessage('error', err.message || 'Failed to verify code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setMessage({ type: '', text: '' });

    try {
      await requestEmailOtp(email);
      showMessage('success', 'A new verification code has been sent to your email.');
    } catch (err) {
      showMessage('error', err.message || 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          <span className="mr-1">{'\u2190'}</span>
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-semibold text-slate-900 text-center mb-2">
          Verify your email
        </h1>
        <p className="text-slate-600 text-sm text-center mb-4">
          We&apos;ve sent a 6-digit verification code to
        </p>
        <p className="text-sm font-medium text-emerald-700 text-center mb-6 break-all">
          {email}
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 tracking-widest text-center"
            />
          </div>

          {message.text && (
            <div
              className={`rounded-lg px-4 py-2.5 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-500/40'
                  : 'bg-red-50 text-red-700 border border-red-500/40'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={verifying || !code}
            className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-100"
          >
            {verifying ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="mt-4 w-full py-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-slate-400 hover:bg-slate-50"
        >
          {resending ? 'Resending…' : 'Resend code'}
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          If you don&apos;t see the email in a minute or two, check your spam folder
          or try resending the code.
        </p>
      </div>
    </div>
  );
}

