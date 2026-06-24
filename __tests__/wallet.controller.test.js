/**
 * @jest-environment node
 */
/* eslint-env jest */

const { createWallet, giftCoins } = require('../controllers/wallet.controller');
const { ADDRESS_HEX_LENGTH } = require('../utils/crypto');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('wallet.controller.createWallet', () => {
  it('responds 201 with a generated key pair', () => {
    const res = mockRes();
    createWallet({}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.publicKey).toHaveLength(ADDRESS_HEX_LENGTH);
    expect(body.privateKey).toHaveLength(64);
  });

  it('returns a different wallet on each call', () => {
    const res1 = mockRes();
    const res2 = mockRes();
    createWallet({}, res1, jest.fn());
    createWallet({}, res2, jest.fn());

    expect(res1.json.mock.calls[0][0].publicKey).not.toEqual(
      res2.json.mock.calls[0][0].publicKey
    );
  });
});

describe('wallet.controller.giftCoins', () => {
  it('gifts 500 coins and adds to pending transactions when not in production', () => {
    const { blockchain } = require('../models');
    const originalPendingCount = blockchain.pendingTransactions.length;

    const res = mockRes();
    const next = jest.fn();
    const address = '04' + 'a'.repeat(128);

    giftCoins({ body: { address } }, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/gift/i);
    expect(blockchain.pendingTransactions.length).toBe(originalPendingCount + 1);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects with 403 in production environment', () => {
    const config = require('../config');
    const originalEnv = config.env;
    config.env = 'production';

    const res = mockRes();
    const next = jest.fn();
    const address = '04' + 'a'.repeat(128);

    try {
      giftCoins({ body: { address } }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/only available/i);
    } finally {
      config.env = originalEnv;
    }
  });
});
