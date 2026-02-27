import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import fetch from 'node-fetch';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
import { initFirestore } from '../firestore.js';

const router = express.Router();

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_POINTS = 1;
const RATE_LIMIT_DURATION = 10; // seconds

const rateLimiter = new RateLimiterMemory({
  points: RATE_LIMIT_POINTS,
  duration: RATE_LIMIT_DURATION,
});


function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /auth/request
router.post('/request', async (req, res, next) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required', code: 'EMAIL_REQUIRED' });
  try {
    await rateLimiter.consume(email);
    const db = await req.dbPromise;
    const otp = generateOTP();
    const otp_hash = await bcrypt.hash(otp, 10);
    const expires_at = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000).toISOString();
    await db.run(
      `INSERT OR REPLACE INTO auth_codes (email, otp_hash, expires_at, attempts) VALUES (?, ?, ?, 0)`,
      [email, otp_hash, expires_at]
    );
      // Envoi OTP via API ahasend
      try {
        const ahaRes = await fetch('https://api.ahasend.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AHASEND_API_KEY}`
          },
          body: JSON.stringify({
            to: email,
            from: process.env.EMAIL_FROM || 'no-reply@gbairai.fun',
            subject: 'Votre code OTP gbairai',
            html: `<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px">
              <p>Pour vous authentifier, veuillez utiliser le code à usage unique (OTP) suivant :</p>
              <p style="font-size: 22px"><strong>${otp}</strong></p>
              <p>Ce code est valable pendant 5 minutes.</p>
              <p>Ne partagez jamais ce code avec qui que ce soit. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.</p>
              <p>Merci de votre visite sur gbairai !</p>
            </div>`
          })
        });
        if (!ahaRes.ok) {
          const errorText = await ahaRes.text();
          console.error('Ahasend error:', errorText);
          return res.status(500).json({ success: false, message: 'Erreur Ahasend', code: 'AHASEND_ERROR', details: errorText });
        }
      } catch (ahaErr) {
        console.error('Ahasend error:', ahaErr);
        return res.status(500).json({ success: false, message: 'Erreur Ahasend', code: 'AHASEND_ERROR', details: ahaErr.message });
      }
    res.json({ success: true, data: { status: 'code_sent' } });
  } catch (err) {
    if (err.msBeforeNext) {
      return res.status(429).json({ success: false, message: 'Trop de requêtes, réessayez plus tard', code: 'RATE_LIMITED' });
    }
    next(err);
  }
});

// POST /auth/verify
router.post('/verify', async (req, res, next) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, message: 'Email et code requis', code: 'INPUT_REQUIRED' });
  try {
    const db = await req.dbPromise;
    const row = await db.get('SELECT * FROM auth_codes WHERE email = ?', [email]);
    if (!row) return res.status(400).json({ success: false, message: 'Code non trouvé', code: 'CODE_NOT_FOUND' });
    if (row.attempts >= MAX_ATTEMPTS) return res.status(400).json({ success: false, message: 'Trop de tentatives', code: 'TOO_MANY_ATTEMPTS' });
    if (new Date(row.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'Code expiré', code: 'CODE_EXPIRED' });
    const valid = await bcrypt.compare(code, row.otp_hash);
    if (!valid) {
      await db.run('UPDATE auth_codes SET attempts = attempts + 1 WHERE email = ?', [email]);
      return res.status(400).json({ success: false, message: 'Code incorrect', code: 'INVALID_CODE' });
    }
    // Find or create user in Firestore
    const firestore = initFirestore();
    let userDoc = await firestore.collection('users').where('email', '==', email).limit(1).get();
    let user;
    if (userDoc.empty) {
      const newUserRef = firestore.collection('users').doc();
      user = { id: newUserRef.id, email, created_at: new Date().toISOString(), last_login: new Date().toISOString() };
      await newUserRef.set(user);
    } else {
      const doc = userDoc.docs[0];
      user = doc.data();
      user.id = doc.id;
      await firestore.collection('users').doc(user.id).update({ last_login: new Date().toISOString() });
    }
    // Remove used code
    await db.run('DELETE FROM auth_codes WHERE email = ?', [email]);
    // Generate tokens
    const access_token = jwt.sign({ user_id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refresh_token = jwt.sign({ user_id: user.id }, process.env.REFRESH_SECRET, { expiresIn: '30d' });
    // Sessions peuvent rester en SQLite ou être migrées Firestore si besoin
    await db.run('INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)', [user.id, refresh_token, new Date(Date.now() + 30*24*60*60*1000).toISOString()]);
    res.json({ success: true, data: { access_token, refresh_token, user: { id: user.id, email: user.email } } });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ success: false, message: 'Token requis', code: 'TOKEN_REQUIRED' });
  try {
    const db = await req.dbPromise;
    const session = await db.get('SELECT * FROM sessions WHERE refresh_token = ?', [refresh_token]);
    if (!session) return res.status(400).json({ success: false, message: 'Session non trouvée', code: 'SESSION_NOT_FOUND' });
    if (new Date(session.expires_at) < new Date()) return res.status(400).json({ success: false, message: 'Session expirée', code: 'SESSION_EXPIRED' });
    const payload = jwt.verify(refresh_token, process.env.REFRESH_SECRET);
    const user = await db.get('SELECT * FROM users WHERE id = ?', [payload.user_id]);
    if (!user) return res.status(400).json({ success: false, message: 'Utilisateur non trouvé', code: 'USER_NOT_FOUND' });
    const access_token = jwt.sign({ user_id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ success: true, data: { access_token } });
  } catch (err) {
    next(err);
  }
});

export default router;
