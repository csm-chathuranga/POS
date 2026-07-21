const router = require('express').Router();
const crypto = require('crypto');
const auth   = require('../middleware/auth');

// GET /api/imagekit/auth — returns signed token for browser-side uploads
router.get('/auth', auth, (req, res) => {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const expire     = Math.floor(Date.now() / 1000) + 1800; // 30 min
  const token      = crypto.randomUUID();
  const signature  = crypto.createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  res.json({
    token,
    expire,
    signature,
    publicKey:   process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
});

module.exports = router;
