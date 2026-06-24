const crypto = require('crypto');
const { publicKeyFromAddress, privateKeyFromHex } = require('../utils/crypto');

const SIGNATURE_ALGORITHM = 'SHA256';
const SIGNATURE_ENCODING = 'ieee-p1363';

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.previousHash +
          this.timestamp +
          JSON.stringify(this.transactions) +
          this.nonce
      )
      .digest('hex');
  }

  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join('0');

    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }

  hasValidTransactions() {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Rebuilds a `Block` instance (with real `Transaction` instances) from the
   * plain object produced by `JSON.parse`. The stored `nonce`/`hash` are kept
   * verbatim so the chain still validates after a reload.
   *
   * @param {object} data - a serialised block.
   * @returns {Block}
   */
  static fromJSON(data) {
    const block = new Block(
      data.timestamp,
      (data.transactions || []).map(Transaction.fromJSON),
      data.previousHash
    );
    block.nonce = data.nonce;
    block.hash = data.hash;
    return block;
  }
}

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.timestamp = Date.now();
    this.signature = '';
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.fromAddress + this.toAddress + this.amount + this.timestamp)
      .digest('hex');
  }

  /**
   * Signs this transaction's hash with the owner's private key. The resulting
   * IEEE-P1363 signature is stored on `this.signature` (hex-encoded).
   *
   * @param {string} privateKeyHex - the raw secp256k1 scalar that owns
   *   `this.fromAddress`.
   * @throws {Error} if the private key does not correspond to `fromAddress`.
   */
  signTransaction(privateKeyHex) {
    const signingKey = privateKeyFromHex(privateKeyHex, this.fromAddress);

    this.signature = crypto
      .sign(SIGNATURE_ALGORITHM, Buffer.from(this.calculateHash()), {
        key: signingKey,
        dsaEncoding: SIGNATURE_ENCODING,
      })
      .toString('hex');

    // A private key that does not own `fromAddress` produces a signature that
    // will not verify against it — reject rather than store a useless signature.
    if (!this.isValid()) {
      this.signature = '';
      throw new Error('You cannot sign transactions for other wallets!');
    }
  }

  /**
   * Validates the transaction's signature against `fromAddress`.
   *
   * - Mining-reward transactions (`fromAddress === null`) are always valid.
   * - Every other transaction MUST carry a signature that verifies against its
   *   sender's public key. (The previous demo bypass that accepted unsigned
   *   transactions has been removed.)
   *
   * @returns {boolean}
   */
  isValid() {
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      return false;
    }

    try {
      const publicKey = publicKeyFromAddress(this.fromAddress);

      return crypto.verify(
        SIGNATURE_ALGORITHM,
        Buffer.from(this.calculateHash()),
        { key: publicKey, dsaEncoding: SIGNATURE_ENCODING },
        Buffer.from(this.signature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Rebuilds a `Transaction` instance from the plain object produced by
   * `JSON.parse`, preserving the original timestamp and signature so the
   * transaction hash (and therefore the chain) still validates after a reload.
   *
   * @param {object} data - a serialised transaction.
   * @returns {Transaction}
   */
  static fromJSON(data) {
    const tx = new Transaction(data.fromAddress, data.toAddress, data.amount);
    tx.timestamp = data.timestamp;
    tx.signature = data.signature || '';
    return tx;
  }
}

class Blockchain {
  constructor(difficulty, miningReward) {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = difficulty || 2;
    this.pendingTransactions = [];
    this.miningReward = miningReward || 100;
  }

  createGenesisBlock() {
    return new Block(Date.now(), [], '0');
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(miningRewardAddress) {
    const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
    this.pendingTransactions.push(rewardTx);

    const block = new Block(
      Date.now(),
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    block.mineBlock(this.difficulty);

    this.chain.push(block);
    this.pendingTransactions = [];
  }

  addTransaction(transaction) {
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }

    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }

    this.pendingTransactions.push(transaction);
  }

  getBalanceOfAddress(address) {
    let balance = 0;

    for (const block of this.chain) {
      for (const trans of block.transactions) {
        if (trans.fromAddress === address) balance -= trans.amount;
        if (trans.toAddress === address) balance += trans.amount;
      }
    }

    return balance;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (!current.hasValidTransactions()) return false;
      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }

    return true;
  }

  getAllTransactions() {
    return this.chain.flatMap((block) => block.transactions);
  }
}

module.exports = { Blockchain, Block, Transaction };
