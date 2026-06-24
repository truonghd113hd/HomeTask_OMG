const { generateKeyPair } = require('../utils/crypto');
const { sendCreated, sendSuccess, sendError } = require('../utils/response');
const { blockchain } = require('../models');
const config = require('../config');
const { isValidAddress, sanitizeAddress } = require('../utils/validator');

/**
 * POST /api/wallets
 *
 * Generates a fresh secp256k1 key pair and returns it. The private key is
 * returned exactly once, here, and is never stored server-side — the client is
 * responsible for keeping it safe and signing transactions with it.
 *
 * @returns {{ publicKey: string, privateKey: string }} via `sendCreated`.
 */
const createWallet = (req, res, next) => {
  try {
    const { publicKey, privateKey } = generateKeyPair();
    sendCreated(res, { publicKey, privateKey });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/wallets/gift
 *
 * Faucet endpoint — adds `config.faucet.giftAmount` coins to the specified
 * wallet's pending balance. Only available outside production so it cannot be
 * exploited on a live network.
 *
 * Persistence is handled automatically by the `persistAfter` wrapper in
 * `models/index.js` — no persistence logic belongs here.
 *
 * @param {object} req - Express request. Body must contain `address`.
 * @param {object} res - Express response.
 * @param {Function} next - Express next middleware.
 */
const giftCoins = (req, res, next) => {
  try {
    if (config.env === 'production') {
      return sendError(res, 'Faucet is only available in development mode', 403);
    }

    const address = sanitizeAddress(req.body.address);
    if (!isValidAddress(address)) {
      return sendError(res, 'Invalid wallet address format', 400);
    }

    const amount = config.faucet.giftAmount;
    const giftTx = blockchain.addGiftTransaction(address, amount);

    sendSuccess(res, {
      message: `Gift of ${amount} coins added to pending transaction pool`,
      transaction: giftTx,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createWallet, giftCoins };
