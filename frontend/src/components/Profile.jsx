import React, { useState, useEffect } from 'react';
import { updateProfile } from '../api/auth';
import { useUser } from '../context/UserContext';

const inputClass =
  'w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/25';

export default function Profile({ onClose, onUpdate }) {
  const { user, loading, refetch } = useUser();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({ name: '', email: '' });

  useEffect(() => {
    if (!user) return;
    setForm({ name: user.name || '', email: user.email || '' });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {};
      if (form.name.trim() !== (user?.name || '')) payload.name = form.name.trim();
      if (form.email.trim() !== (user?.email || '')) payload.email = form.email.trim();
      if (Object.keys(payload).length === 0) {
        setMessage({ type: 'success', text: 'No changes to save.' });
        setSaving(false);
        return;
      }
      const updated = await updateProfile({ name: payload.name, email: payload.email });
      await refetch();
      setMessage({ type: 'success', text: 'Profile updated.' });
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
        <p className="text-sm text-slate-500">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Profile</h2>
        {user?.avatar_url && (
          <img src={user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {message.text && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/40 bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50"
            >
              Close
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
