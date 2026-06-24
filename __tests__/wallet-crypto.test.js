/**
 * @jest-environment node
 */
/* eslint-env jest */

const { generateKeyPair, ADDRESS_HEX_LENGTH } = require('../utils/crypto');
const { Blockchain, Transaction } = require('../models/blockchain');

describe('utils/crypto.generateKeyPair', () => {
  it('returns a well-formed secp256k1 key pair', () => {
    const { publicKey, privateKey } = generateKeyPair();

    expect(publicKey).toHaveLength(ADDRESS_HEX_LENGTH); // 130 hex chars
    expect(publicKey.startsWith('04')).toBe(true);
    expect(privateKey).toHaveLength(64);
    expect(publicKey).toMatch(/^[0-9a-f]+$/);
    expect(privateKey).toMatch(/^[0-9a-f]+$/);
  });

  it('generates a unique key pair each call', () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    expect(a.publicKey).not.toEqual(b.publicKey);
    expect(a.privateKey).not.toEqual(b.privateKey);
  });
});

describe('Transaction signing', () => {
  let sender;
  let recipient;

  beforeEach(() => {
    sender = generateKeyPair();
    recipient = generateKeyPair();
  });

  it('produces a signature that validates', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 50);
    tx.signTransaction(sender.privateKey);

    expect(tx.signature).toMatch(/^[0-9a-f]+$/);
    expect(tx.isValid()).toBe(true);
  });

  it('rejects an unsigned transaction (demo bypass removed)', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 50);
    expect(tx.signature).toBe('');
    expect(tx.isValid()).toBe(false);
  });

  it('treats mining-reward transactions (no sender) as valid', () => {
    const reward = new Transaction(null, recipient.publicKey, 100);
    expect(reward.isValid()).toBe(true);
  });

  it('detects tampering after signing', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 50);
    tx.signTransaction(sender.privateKey);

    tx.amount = 5000;
    expect(tx.isValid()).toBe(false);
  });

  it('refuses to sign for a wallet you do not own', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 50);
    expect(() => tx.signTransaction(recipient.privateKey)).toThrow(
      /cannot sign transactions for other wallets/i
    );
    expect(tx.signature).toBe('');
  });
});

describe('Blockchain.addTransaction', () => {
  let chain;
  let sender;
  let recipient;

  beforeEach(() => {
    chain = new Blockchain(1, 100);
    sender = generateKeyPair();
    recipient = generateKeyPair();
  });

  it('accepts a properly signed transaction', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 25);
    tx.signTransaction(sender.privateKey);

    chain.addTransaction(tx);
    expect(chain.pendingTransactions).toContain(tx);
  });

  it('rejects an unsigned transaction', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 25);
    expect(() => chain.addTransaction(tx)).toThrow(/invalid transaction/i);
  });

  it('keeps the chain valid after mining signed transactions', () => {
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 25);
    tx.signTransaction(sender.privateKey);
    chain.addTransaction(tx);
    chain.minePendingTransactions(sender.publicKey);

    expect(chain.isChainValid()).toBe(true);
    expect(chain.getBalanceOfAddress(recipient.publicKey)).toBe(25);
  });
});
