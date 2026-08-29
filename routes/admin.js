const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Request = require('../models/Request');
const requireAuth = require('../middleware/authMiddleware');

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

module.exports = router;