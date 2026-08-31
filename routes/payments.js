const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Payment = require('../models/Payment');

const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const INVOICE_TTL_MINUTES = 30;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function withUniqueOffset(amount) {
  const microAmount = Math.round(amount * 1e6);
  const offsetMicro = Math.floor(Math.random() * 9000) + 1000;
  return (microAmount + offsetMicro) / 1e6;
}

router.post('/create', createLimiter, async (req, res) => {
  try {
    const { amount, payerName, payerEmail } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    if (!payerName || typeof payerName !== 'string' || !payerName.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!payerEmail || typeof payerEmail !== 'string' || !EMAIL_REGEX.test(payerEmail.trim())) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!process.env.CLIENT_MASTER_ADDRESS) {
      return res.status(500).json({ error: 'Admin deposit address not configured.' });
    }

    let expectedAmount = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = withUniqueOffset(amount);
      const collision = await Payment.findOne({ expectedAmount: candidate, status: 'PENDING' });
      if (!collision) {
        expectedAmount = candidate;
        break;
      }
    }
    if (expectedAmount === null) {
      return res.status(500).json({ error: 'Could not allocate a unique invoice amount, please try again.' });
    }

    const payment = new Payment({
      depositAddress: process.env.CLIENT_MASTER_ADDRESS,
      expectedAmount,
      requestedAmount: amount,
      payerName: payerName.trim(),
      payerEmail: payerEmail.trim(),
      expiresAt: new Date(Date.now() + INVOICE_TTL_MINUTES * 60 * 1000),
    });

    await payment.save();
    res.json({
      id: payment._id,
      depositAddress: payment.depositAddress,
      amount: payment.expectedAmount,
      expiresAt: payment.expiresAt,
    });
  } catch (err) {
    console.error('Payment creation failed:', err);
    res.status(500).json({ error: 'Failed to create payment intent.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Not found' });
    res.json({
      status: payment.status,
      expiresAt: payment.expiresAt,
      depositAddress: payment.depositAddress,
      amount: payment.expectedAmount,
      incomingTxId: payment.incomingTxId,
      fromAddress: payment.fromAddress,
    });
  } catch (err) {
    console.error('Payment lookup failed:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;