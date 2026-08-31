const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { TronWeb } = require('tronweb');
const Request = require('../models/Request');

const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/create', createLimiter, async (req, res) => {
  try {
    const { destinationAddress, amount, requesterName, requesterEmail } = req.body;

    if (!TronWeb.isAddress(destinationAddress)) {
      return res.status(400).json({ error: 'Invalid TRON address.' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    if (!requesterName || typeof requesterName !== 'string' || !requesterName.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!requesterEmail || typeof requesterEmail !== 'string' || !EMAIL_REGEX.test(requesterEmail.trim())) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }

    const newRequest = new Request({
      destinationAddress,
      amount,
      requesterName: requesterName.trim(),
      requesterEmail: requesterEmail.trim(),
    });
    await newRequest.save();
    res.json({ success: true, id: newRequest._id });
  } catch (err) {
    console.error('Request creation failed:', err);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json({
      status: request.status,
      destinationAddress: request.destinationAddress,
      amount: request.amount,
      txId: request.txId,
    });
  } catch (err) {
    console.error('Request lookup failed:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;