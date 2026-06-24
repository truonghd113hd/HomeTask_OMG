/**
 * @jest-environment node
 */
/* eslint-env jest */

const mockGetBalance = jest.fn();
jest.mock('../models', () => ({
  blockchain: {
    getBalanceOfAddress: (addr) => mockGetBalance(addr),
  },
}));

const { getBalance } = require('../controllers/balance.controller');

const mockReq = (params = {}) => ({ params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('balance.controller.getBalance', () => {
  beforeEach(() => mockGetBalance.mockClear());

  it('returns 200 with address and balance for a valid address', () => {
    mockGetBalance.mockReturnValue(250);
    const res = mockRes();
    getBalance(mockReq({ address: 'someWalletAddress' }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.address).toBe('someWalletAddress');
    expect(body.balance).toBe(250);
    expect(mockGetBalance).toHaveBeenCalledWith('someWalletAddress');
  });

  it('returns 400 for an empty address', () => {
    const res = mockRes();
    getBalance(mockReq({ address: '   ' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(mockGetBalance).not.toHaveBeenCalled();
  });

  it('returns 0 balance for an address with no transactions', () => {
    mockGetBalance.mockReturnValue(0);
    const res = mockRes();
    getBalance(mockReq({ address: 'newWallet' }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].balance).toBe(0);
  });
});
