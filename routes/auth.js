const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getTronWeb } = require('../config/tron');
const router = express.Router();

const tronWeb = getTronWeb();
const nonceStore = new Map();
const NONCE_TTL_MS = 5 * 60 * 1000;

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.get('/nonce', authLimiter, (req, res) => {
  try {
    const nonce = crypto.randomBytes(32).toString('hex');
    const message = `Sign this message to access the Admin Dashboard: ${nonce}`;
    nonceStore.set(process.env.CLIENT_MASTER_ADDRESS, { message, expiresAt: Date.now() + NONCE_TTL_MS });
    return res.json({ message });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { signature, address } = req.body;
  const entry = nonceStore.get(process.env.CLIENT_MASTER_ADDRESS);

  if (!entry || Date.now() > entry.expiresAt) {
    nonceStore.delete(process.env.CLIENT_MASTER_ADDRESS);
    return res.status(400).json({ error: 'Nonce expired or not found. Refresh and try again.' });
  }
  if (address !== process.env.CLIENT_MASTER_ADDRESS) {
    return res.status(403).json({ error: 'Unauthorized wallet address.' });
  }

  try {
    const isValid = await tronWeb.trx.verifyMessageV2(entry.message, signature);
    if (isValid === process.env.CLIENT_MASTER_ADDRESS) {
      nonceStore.delete(address);
      const token = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: '12h' });
      res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 12 * 3600000,
    });
      return res.json({ success: true });
    }
    return res.status(401).json({ error: 'Signature verification failed.' });
  } catch (error) {
    console.error('Login verification error:', error);
    return res.status(500).json({ error: 'Internal validation error.' });
  }
});

module.exports = router;