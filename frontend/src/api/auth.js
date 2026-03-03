import { apiGet, apiPost, apiPut, apiDelete } from './client.js'

const TOKEN_KEY = 'finance_tracker_token';
const USER_KEY = 'finance_tracker_user';
const LAST_REGISTER_EMAIL_KEY = 'finance_tracker_last_register_email';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore storage errors
  }
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore storage errors in mock mode
  }
}

/** Calls POST /signin. On 403, backend returns "Please verify your email before signing in." */
export async function login(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const data = await apiPost(
    '/signin',
    { email, password },
    { auth: false },
  );

  const { user, token } = data || {};
  if (!token) {
    throw new Error('No token returned from server.');
  }

  setToken(token);
  setStoredUser(user || null);

  return { token, user };
}

export async function register(name, email, password) {
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required.');
  }

  await apiPost(
    '/signup',
    { name, email, password },
    { auth: false },
  );

  try {
    localStorage.setItem(LAST_REGISTER_EMAIL_KEY, email);
  } catch {
    // ignore storage errors
  }

  return { message: 'Registered successfully. Please verify your email.' };
}

export async function requestEmailOtp(email) {
  if (!email) {
    throw new Error('Email is required to send a verification code.');
  }

  try {
    localStorage.setItem(LAST_REGISTER_EMAIL_KEY, email);
  } catch {
    // ignore storage errors
  }

  await apiPost(
    '/auth/send-otp',
    { email },
    { auth: false },
  );

  return { success: true };
}

export async function verifyEmailOtp(email, code) {
  if (!email || !code) {
    throw new Error('Email and code are required.');
  }

  await apiPost(
    '/auth/verify-otp',
    { email, otp: code },
    { auth: false },
  );

  return { success: true };
}

export async function getMe() {
  const data = await apiGet('/getProfile');
  const user = data || null;
  setStoredUser(user);
  return user;
}

export async function updateProfile({ name, email, currentPassword, newPassword, email_budget_alerts }) {
  const payload = {};

  if (name != null) payload.name = name;
  if (email != null) payload.email = email;
  if (newPassword) {
    payload.currentPassword = currentPassword;
    payload.newPassword = newPassword;
  }
  if (typeof email_budget_alerts === 'boolean') {
    payload.email_budget_alerts = email_budget_alerts;
  }

  const data = await apiPut('/updateProfile', payload);
  const updatedUser = data || payload;
  setStoredUser(updatedUser);
  return updatedUser;
}

export async function deleteProfile() {
  await apiDelete('/deleteProfile');
  clearToken();
}
