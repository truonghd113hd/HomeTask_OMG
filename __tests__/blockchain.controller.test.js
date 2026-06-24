/**
 * @jest-environment node
 */
/* eslint-env jest */

jest.mock('../models', () => ({
  blockchain: {
    chain: [
      { timestamp: 1000, transactions: [], previousHash: '0', nonce: 0, hash: '0000abc' },
      { timestamp: 2000, transactions: [], previousHash: '0000abc', nonce: 1, hash: '0000def' },
    ],
    isChainValid: jest.fn(() => true),
  },
}));

const { getChain, validateChain } = require('../controllers/blockchain.controller');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('blockchain.controller.getChain', () => {
  it('returns 200 with the chain and its length', () => {
    const res = mockRes();
    getChain({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.chain).toHaveLength(2);
    expect(body.length).toBe(2);
  });
});

describe('blockchain.controller.validateChain', () => {
  it('returns 200 with isValid true when chain is valid', () => {
    const res = mockRes();
    validateChain({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.isValid).toBe(true);
  });

  it('returns isValid false when chain has been tampered with', () => {
    const { blockchain } = require('../models');
    blockchain.isChainValid.mockReturnValueOnce(false);

    const res = mockRes();
    validateChain({}, res);

    const body = res.json.mock.calls[0][0];
    expect(body.isValid).toBe(false);
  });
});
