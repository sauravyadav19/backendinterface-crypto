const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Request = require('../models/Request');
const User = require('../models/User');
const requireAuth = require('../middleware/authMiddleware');
const { getSettings, Settings } = require('../models/Settings');

router.use(requireAuth);

router.get('/payments', async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 });
  res.json(payments);
});

router.get('/requests', async (req, res) => {
  const requests = await Request.find().sort({ createdAt: -1 });
  res.json(requests);
});

router.post('/requests/:id/settle', async (req, res) => {
  try {
    const { status, txId } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    if (status === 'APPROVED' && !txId) {
      return res.status(400).json({ error: 'txId required when approving.' });
    }

    const request = await Request.findOneAndUpdate(
      { _id: req.params.id, status: 'PENDING' },
      { $set: { status, txId } },
      { new: true }
    );

    if (!request) {
      return res.status(409).json({ error: 'Request already settled or not found.' });
    }
    res.json(request);
  } catch (err) {
    console.error('Settle failed:', err);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    walletBalance: u.walletBalance,
    createdAt: u.createdAt,
  })));
});

router.patch('/users/:id/balance', async (req, res) => {
  try {
    const { walletBalance } = req.body;
    if (typeof walletBalance !== 'number' || !Number.isFinite(walletBalance) || walletBalance < 0) {
      return res.status(400).json({ error: 'walletBalance must be a non-negative number.' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { walletBalance } },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ id: user._id, walletBalance: user.walletBalance });
  } catch (err) {
    console.error('Balance update failed:', err);
    res.status(500).json({ error: 'Failed to update balance.' });
  }
});
router.get('/settings/public-balance', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ publicAdminBalance: settings.publicAdminBalance });
  } catch (err) {
    console.error('Fetch settings failed:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.patch('/settings/public-balance', async (req, res) => {
  try {
    const { publicAdminBalance } = req.body;
    if (typeof publicAdminBalance !== 'number' || !Number.isFinite(publicAdminBalance) || publicAdminBalance < 0) {
      return res.status(400).json({ error: 'publicAdminBalance must be a non-negative number.' });
    }
    const settings = await Settings.findByIdAndUpdate(
      'global',
      { $set: { publicAdminBalance } },
      { new: true, upsert: true }
    );
    res.json({ publicAdminBalance: settings.publicAdminBalance });
  } catch (err) {
    console.error('Update public balance failed:', err);
    res.status(500).json({ error: 'Failed to update balance.' });
  }
});

module.exports = router;