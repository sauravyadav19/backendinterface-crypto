const express = require('express');
const router = express.Router();
const { getSettings } = require('../models/Settings');

// Public — anyone visiting the site can read this, no auth required.
router.get('/public-balance', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({ publicAdminBalance: settings.publicAdminBalance });
  } catch (err) {
    console.error('Fetch public balance failed:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

module.exports = router;