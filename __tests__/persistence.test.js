/**
 * @jest-environment node
 */
/* eslint-env jest */

const fs = require('fs');
const os = require('os');
const path = require('path');

const persistence = require('../services/persistence.service');
const { generateKeyPair } = require('../utils/crypto');
const { Blockchain, Transaction } = require('../models/blockchain');

const tmpFile = () =>
  path.join(os.tmpdir(), `bc-test-${process.pid}-${Math.random().toString(36).slice(2)}.json`);

const buildSignedChain = () => {
  const sender = generateKeyPair();
  const recipient = generateKeyPair();
  const chain = new Blockchain(1, 100);

  chain.minePendingTransactions(sender.publicKey); // give sender a balance

  const tx = new Transaction(sender.publicKey, recipient.publicKey, 30);
  tx.signTransaction(sender.privateKey);
  chain.addTransaction(tx);
  chain.minePendingTransactions(sender.publicKey);

  return { chain, recipient };
};

describe('persistence.service', () => {
  let file;

  beforeEach(() => {
    file = tmpFile();
  });

  afterEach(() => {
    try {
      fs.unlinkSync(file);
    } catch {
      /* nothing to clean up */
    }
  });

  it('saves and restores a chain, preserving validity and balances', () => {
    const { chain, recipient } = buildSignedChain();

    expect(persistence.save(chain, file)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);

    const restored = persistence.load(file);
    expect(restored).toBeInstanceOf(Blockchain);
    expect(restored.chain).toHaveLength(chain.chain.length);
    expect(restored.isChainValid()).toBe(true);
    expect(restored.getBalanceOfAddress(recipient.publicKey)).toBe(30);
  });

  it('rehydrates transactions into instances with working methods', () => {
    const { chain } = buildSignedChain();
    persistence.save(chain, file);

    const restored = persistence.load(file);
    const restoredTx = restored
      .getAllTransactions()
      .find((t) => t.fromAddress !== null);

    expect(restoredTx).toBeInstanceOf(Transaction);
    expect(restoredTx.isValid()).toBe(true);
  });

  it('returns null when no file exists', () => {
    expect(persistence.load(file)).toBeNull();
  });

  it('returns null (does not throw) for corrupt JSON', () => {
    fs.writeFileSync(file, '{ this is not valid json', 'utf8');
    expect(persistence.load(file)).toBeNull();
  });

  it('detects a tampered chain as invalid after load', () => {
    const { chain } = buildSignedChain();
    persistence.save(chain, file);

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Tamper with a confirmed transaction amount without re-mining.
    data.chain[1].transactions[0].amount = 999999;
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');

    const restored = persistence.load(file);
    expect(restored).not.toBeNull();
    expect(restored.isChainValid()).toBe(false);
  });

  it('clear() removes the file and treats a missing file as success', () => {
    const { chain } = buildSignedChain();
    persistence.save(chain, file);

    expect(persistence.clear(file)).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
    expect(persistence.clear(file)).toBe(true); // already gone → still ok
  });
});
