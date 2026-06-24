const config = require('../config');
const logger = require('../utils/logger');
const { generateKeyPair } = require('../utils/crypto');
const persistence = require('../services/persistence.service');
const { Blockchain, Block, Transaction } = require('./blockchain');

const blockchain = new Blockchain(
  config.blockchain.difficulty,
  config.blockchain.miningReward
);

/**
 * Wraps a mutating blockchain method so that the chain is persisted to disk
 * after every successful call. Keeping this wiring in the composition root
 * (rather than in `server.js` or a controller) lets the domain model stay free
 * of any persistence concerns.
 *
 * @param {'addTransaction'|'minePendingTransactions'} methodName
 */
const persistAfter = (methodName) => {
  const original = blockchain[methodName].bind(blockchain);
  blockchain[methodName] = (...args) => {
    const result = original(...args);
    if (config.persistence.enabled) {
      persistence.save(blockchain);
    }
    return result;
  };
};

/**
 * Copies restored state into the singleton, keeping the exported reference
 * stable for every module that already imported it.
 *
 * @param {Blockchain} restored
 */
const adoptState = (restored) => {
  blockchain.chain = restored.chain;
  blockchain.pendingTransactions = restored.pendingTransactions;
  blockchain.difficulty = restored.difficulty;
  blockchain.miningReward = restored.miningReward;
};

/**
 * Attempts to restore persisted state. Falls back to a fresh chain when there
 * is nothing to load or the saved chain fails validation.
 *
 * @returns {boolean} `true` if a valid chain was restored.
 */
const restorePersistedState = () => {
  if (!config.persistence.enabled) {
    return false;
  }

  const restored = persistence.load();
  if (!restored) {
    return false;
  }

  if (!restored.isChainValid()) {
    logger.warn('Persisted chain failed validation — starting fresh');
    return false;
  }

  adoptState(restored);
  logger.info(`Restored blockchain (${blockchain.chain.length} blocks)`);
  return true;
};

/**
 * Seeds a small, fully-signed demo chain using freshly generated wallets, so a
 * first-run app has something to show while still exercising real signatures.
 */
const seedDemoData = () => {
  if (!config.demoData.enabled) {
    return;
  }

  const sender = generateKeyPair();
  const recipient = generateKeyPair();

  // Give the sender a starting balance by mining the first block to them.
  blockchain.minePendingTransactions(sender.publicKey);

  for (const { amount } of config.demoData.transactions) {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, amount);
    tx.signTransaction(sender.privateKey);
    blockchain.addTransaction(tx);
  }

  blockchain.minePendingTransactions(sender.publicKey);
  logger.info('Seeded demo blockchain data with generated wallets');
};

persistAfter('addTransaction');
persistAfter('minePendingTransactions');
persistAfter('addGiftTransaction');

if (!restorePersistedState()) {
  seedDemoData();
}

module.exports = {
  blockchain,
  Blockchain,
  Block,
  Transaction,
};
