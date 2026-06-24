/**
 * @jest-environment node
 */
/* eslint-env jest */

const mockMinePending = jest.fn();
const mockGetLatestBlock = jest.fn(() => ({ hash: '0000minedhash' }));

jest.mock('../models', () => ({
  blockchain: {
    minePendingTransactions: (...args) => mockMinePending(...args),
    getLatestBlock: () => mockGetLatestBlock(),
    chain: [{}, {}],
  },
}));

const { mineBlock } = require('../controllers/mining.controller');

const mockReq = (body = {}) => ({ body });
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('mining.controller.mineBlock', () => {
  beforeEach(() => {
    mockMinePending.mockClear();
    mockGetLatestBlock.mockClear();
  });

  it('mines with the provided miningRewardAddress and returns 200', () => {
    mockMinePending.mockImplementation(() => {});
    const res = mockRes();
    const next = jest.fn();
    mineBlock(mockReq({ miningRewardAddress: 'miner-wallet' }), res, next);

    expect(mockMinePending).toHaveBeenCalledWith('miner-wallet');
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/mined/i);
    expect(body.latestBlock.hash).toBe('0000minedhash');
    expect(body.chainLength).toBe(2);
    expect(next).not.toHaveBeenCalled();
  });

  it('falls back to "miner1" when miningRewardAddress is omitted', () => {
    mockMinePending.mockImplementation(() => {});
    const res = mockRes();
    mineBlock(mockReq({}), res, jest.fn());

    expect(mockMinePending).toHaveBeenCalledWith('miner1');
  });

  it('calls next(err) when mining throws', () => {
    mockMinePending.mockImplementation(() => {
      throw new Error('mining failed');
    });
    const res = mockRes();
    const next = jest.fn();
    mineBlock(mockReq({ miningRewardAddress: 'miner' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.json).not.toHaveBeenCalled();
  });
});
