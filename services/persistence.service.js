/**
 * Blockchain persistence service.
 *
 * Serialises the in-memory blockchain to a plain JSON file so that state
 * survives server restarts. All file I/O is wrapped in try/catch — a
 * persistence failure is logged but never propagated, so the API keeps serving
 * even if the disk is unavailable or the saved file is corrupt.
 *
 * File shape (`blockchain.json`):
 * ```json
 * {
 *   "difficulty": 2,
 *   "miningReward": 100,
 *   "chain": [
 *     {
 *       "timestamp": 1700000000000,
 *       "transactions": [
 *         { "fromAddress": "04..", "toAddress": "04..", "amount": 100,
 *           "timestamp": 1700000000000, "signature": "abcd.." }
 *       ],
 *       "previousHash": "0",
 *       "nonce": 42,
 *       "hash": "00ab.."
 *     }
 *   ],
 *   "pendingTransactions": []
 * }
 * ```
 *
 * I/O is synchronous by design: writes happen after every mutation and must
 * complete before the next one to keep the on-disk state consistent, and the
 * payload is small. See the README "Known limitations" for the trade-off.
 */

const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');
const { Blockchain, Block, Transaction } = require('../models/blockchain');

const defaultFile = () => config.persistence.file;

/**
 * Serialises the blockchain to disk. Errors are logged and swallowed.
 *
 * @param {Blockchain} blockchain - the chain to persist.
 * @param {string} [filePath] - override for the target file (used in tests).
 * @returns {boolean} `true` on success, `false` if the write failed.
 */
const save = (blockchain, filePath = defaultFile()) => {
  const tmpPath = `${filePath}.tmp`;
  try {
    const payload = JSON.stringify(
      {
        difficulty: blockchain.difficulty,
        miningReward: blockchain.miningReward,
        chain: blockchain.chain,
        pendingTransactions: blockchain.pendingTransactions,
      },
      null,
      2
    );

    // Write to a temp file then atomically rename over the target. `rename` is
    // atomic on the same filesystem, so a crash mid-write can never leave a
    // half-written (corrupt) file — the previous state stays intact until the
    // new file is fully written.
    fs.writeFileSync(tmpPath, payload, 'utf8');
    fs.renameSync(tmpPath, filePath);
    logger.debug(`Blockchain state saved to ${filePath}`);
    return true;
  } catch (err) {
    logger.error(`Failed to save blockchain state: ${err.message}`);
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* temp file may not exist — nothing to clean up */
    }
    return false;
  }
};

/**
 * Reads and deserialises persisted state, rehydrating plain objects back into
 * `Block` / `Transaction` instances so their methods work again.
 *
 * @param {string} [filePath] - override for the source file (used in tests).
 * @returns {Blockchain|null} the restored chain, or `null` if there is no file
 *   to load or the file could not be read/parsed.
 */
const load = (filePath = defaultFile()) => {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.info('No persisted blockchain found — starting fresh');
    } else {
      logger.warn(`Could not read persisted blockchain: ${err.message}`);
    }
    return null;
  }

  try {
    const data = JSON.parse(raw);
    const blockchain = new Blockchain(data.difficulty, data.miningReward);
    blockchain.chain = (data.chain || []).map(Block.fromJSON);
    blockchain.pendingTransactions = (data.pendingTransactions || []).map(
      Transaction.fromJSON
    );
    logger.info(`Loaded persisted blockchain from ${filePath}`);
    return blockchain;
  } catch (err) {
    logger.warn(`Persisted blockchain is corrupt, ignoring it: ${err.message}`);
    return null;
  }
};

/**
 * Deletes the persisted state file. A missing file is treated as success.
 *
 * @param {string} [filePath] - override for the target file (used in tests).
 * @returns {boolean} `true` if the file is gone afterwards.
 */
const clear = (filePath = defaultFile()) => {
  try {
    fs.unlinkSync(filePath);
    logger.info(`Cleared persisted blockchain at ${filePath}`);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return true;
    }
    logger.error(`Failed to clear blockchain state: ${err.message}`);
    return false;
  }
};

module.exports = { save, load, clear };
