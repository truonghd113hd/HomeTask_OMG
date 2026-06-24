const { generateKeyPair } = require('../utils/crypto');
const { sendCreated } = require('../utils/response');

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

module.exports = { createWallet };
