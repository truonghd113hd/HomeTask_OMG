const { Router } = require('express');
const { createWallet } = require('../controllers/wallet.controller');
const { writeLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

// No request body is required to generate a wallet, so `validateBody` does not
// apply here — the write rate limiter still guards against abuse.
router.post('/', writeLimiter, createWallet);

module.exports = router;
