const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');

const {
  createUserFromGoogle,
  findUserByEmail,
  findUserByGoogleId,
} = require('../models/user.model');
const { generateToken } = require('./auth.controller');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

// URL of the frontend app to redirect back to after successful/failed auth
const FRONTEND_APP_URL = process.env.FRONTEND_APP_URL || 'http://localhost:5173';

function ensureGoogleConfig() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    const error = new Error('Google OAuth is not configured.');
    error.status = 500;
    throw error;
  }
}

function createOAuthClient() {
  ensureGoogleConfig();
  return new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function parseCookies(header) {
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.split('=');
    const name = key && key.trim();
    if (!name) return acc;
    acc[name] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
}

function setStateCookie(res, value) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `oauth_state=${encodeURIComponent(value)}`,
    'Path=/auth/google/callback',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${10 * 60}`, // 10 minutes
  ];
  if (isProd) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearStateCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    'oauth_state=',
    'Path=/auth/google/callback',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isProd) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

async function googleAuthRedirect(req, res, next) {
  try {
    const client = createOAuthClient();

    const state = crypto.randomBytes(32).toString('hex');
    setStateCookie(res, state);

    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',
    });

    return res.redirect(authorizeUrl);
  } catch (err) {
    return next(err);
  }
}

async function googleAuthCallback(req, res, next) {
  try {
    const client = createOAuthClient();

    const { code, state, error: oauthError } = req.query || {};

    const cookies = parseCookies(req.headers.cookie || '');
    const storedState = cookies.oauth_state;
    clearStateCookie(res);

    if (oauthError) {
      const redirectUrl = new URL('/login', FRONTEND_APP_URL);
      redirectUrl.searchParams.set('auth', 'error');
      return res.redirect(redirectUrl.toString());
    }

    if (!code || !state || !storedState || storedState !== state) {
      const redirectUrl = new URL('/login', FRONTEND_APP_URL);
      redirectUrl.searchParams.set('auth', 'error');
      return res.redirect(redirectUrl.toString());
    }

    const { tokens } = await client.getToken(code);

    if (!tokens || !tokens.id_token) {
      const redirectUrl = new URL('/login', FRONTEND_APP_URL);
      redirectUrl.searchParams.set('auth', 'error');
      return res.redirect(redirectUrl.toString());
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload() || {};
    const googleId = payload.sub;
    const email = (payload.email || '').toLowerCase();
    const emailVerified = payload.email_verified;
    const name = payload.name || '';
    const avatarUrl = payload.picture || null;

    if (!googleId || !email || emailVerified === false) {
      const redirectUrl = new URL('/login', FRONTEND_APP_URL);
      redirectUrl.searchParams.set('auth', 'error');
      return res.redirect(redirectUrl.toString());
    }

    let user = await findUserByGoogleId(googleId);

    if (!user) {
      const existingByEmail = await findUserByEmail(email);
      if (existingByEmail) {
        // Link Google account to an existing email/password account.
        const text = `
          UPDATE users
          SET google_id = $1,
              avatar_url = $2,
              email_verified = true,
              email_verified_at = COALESCE(email_verified_at, NOW()),
              updated_at = NOW()
          WHERE id = $3
          RETURNING id, name, email, avatar_url, created_at, updated_at
        `;
        const values = [googleId, avatarUrl, existingByEmail.id];
        const { pool } = require('../db');
        const { rows } = await pool.query(text, values);
        // eslint-disable-next-line prefer-destructuring
        user = rows[0];
      }
    }

    if (!user) {
      user = await createUserFromGoogle({
        id: uuidv4(),
        google_id: googleId,
        email,
        name,
        avatar_url: avatarUrl,
      });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    const redirectUrl = new URL('/auth/google/callback', FRONTEND_APP_URL);
    redirectUrl.searchParams.set('token', token);

    return res.redirect(redirectUrl.toString());
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  googleAuthRedirect,
  googleAuthCallback,
};

