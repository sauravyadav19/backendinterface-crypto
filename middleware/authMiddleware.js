const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (req.user.address !== process.env.CLIENT_MASTER_ADDRESS) {
      return res.status(403).json({ error: 'Forbidden. Not the master admin.' });
    }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};