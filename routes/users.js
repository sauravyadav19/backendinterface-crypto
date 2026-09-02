const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const requireUserAuth = require('../middleware/userAuthMiddleware');

const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    walletBalance: user.walletBalance,
    createdAt: user.createdAt,
  };
}

router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!email || !EMAIL_REGEX.test(email.trim())) return res.status(400).json({ error: 'A valid email is required.' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      walletBalance: 0,
    });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error('Signup failed:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

router.get('/me', requireUserAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(toPublicUser(user));
  } catch (err) {
    console.error('Fetch user failed:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

module.exports = router;