/**
 * @jest-environment node
 */
/* eslint-env jest */

jest.mock('../models', () => ({
  blockchain: {
    chain: [{}, {}, {}],
    pendingTransactions: [{ fromAddress: 'a', toAddress: 'b', amount: 10 }],
    difficulty: 2,
    miningReward: 100,
    getAllTransactions: jest.fn(() => [
      { fromAddress: null, toAddress: 'miner', amount: 100 },
      { fromAddress: 'a', toAddress: 'b', amount: 10 },
    ]),
    isChainValid: jest.fn(() => true),
    getLatestBlock: jest.fn(() => ({ hash: '0000latesthash' })),
  },
}));

const { getStats } = require('../controllers/stats.controller');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('stats.controller.getStats', () => {
  it('returns 200 with all stats fields', () => {
    const res = mockRes();
    getStats({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.chainLength).toBe(3);
    expect(body.pendingTransactions).toBe(1);
    expect(body.totalTransactions).toBe(2);
    expect(body.difficulty).toBe(2);
    expect(body.miningReward).toBe(100);
    expect(body.isValid).toBe(true);
    expect(body.latestBlockHash).toBe('0000latesthash');
  });

  it('reports isValid false when chain is tampered', () => {
    const { blockchain } = require('../models');
    blockchain.isChainValid.mockReturnValueOnce(false);

    const res = mockRes();
    getStats({}, res);

    expect(res.json.mock.calls[0][0].isValid).toBe(false);
  });
});
