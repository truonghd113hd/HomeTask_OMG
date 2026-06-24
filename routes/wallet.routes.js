const { Router } = require('express');
const { createWallet, giftCoins } = require('../controllers/wallet.controller');
const { writeLimiter } = require('../middleware/rateLimit.middleware');
const { validateBody } = require('../middleware/validateRequest.middleware');

const router = Router();

// No request body is required to generate a wallet, so `validateBody` does not
// apply here — the write rate limiter still guards against abuse.
router.post('/', writeLimiter, createWallet);

// Faucet endpoint to request gift coins, body must contain 'address'
router.post('/gift', writeLimiter, validateBody(['address']), giftCoins);

module.exports = router;
