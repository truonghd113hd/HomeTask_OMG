/**
 * @jest-environment node
 */
/* eslint-env jest */

const { generateKeyPair } = require('../utils/crypto');
const { Transaction } = require('../models/blockchain');

// Mock the blockchain singleton so tests are isolated from real chain state.
const mockAddTransaction = jest.fn();
jest.mock('../models', () => ({
  blockchain: {
    pendingTransactions: [],
    addTransaction: (...args) => mockAddTransaction(...args),
    getAllTransactions: jest.fn(() => []),
  },
  Transaction: require('../models/blockchain').Transaction,
}));

const {
  addTransaction,
  getPendingTransactions,
  getAllTransactions,
} = require('../controllers/transaction.controller');

const mockReq = (body = {}, params = {}) => ({ body, params });
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('transaction.controller.addTransaction', () => {
  let sender;
  let recipient;

  beforeAll(() => {
    sender = generateKeyPair();
    recipient = generateKeyPair();
  });

  beforeEach(() => {
    mockAddTransaction.mockClear();
    mockAddTransaction.mockImplementation(() => {});
  });

  it('rejects when fromAddress is missing', () => {
    const res = mockRes();
    const next = jest.fn();
    addTransaction(
      mockReq({ toAddress: recipient.publicKey, amount: 10, signature: 'sig', timestamp: Date.now() }),
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
  });

  it('rejects when toAddress is missing', () => {
    const res = mockRes();
    const next = jest.fn();
    addTransaction(
      mockReq({ fromAddress: sender.publicKey, amount: 10, signature: 'sig', timestamp: Date.now() }),
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a non-positive amount', () => {
    const res = mockRes();
    const next = jest.fn();
    addTransaction(
      mockReq({ fromAddress: sender.publicKey, toAddress: recipient.publicKey, amount: -5, signature: 'sig', timestamp: Date.now() }),
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/positive/i);
  });

  it('rejects a transaction with an invalid signature', () => {
    const res = mockRes();
    const next = jest.fn();
    const timestamp = Date.now();
    addTransaction(
      mockReq({
        fromAddress: sender.publicKey,
        toAddress: recipient.publicKey,
        amount: 10,
        signature: 'badsignature',
        timestamp,
      }),
      res,
      next
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toMatch(/signature/i);
  });

  it('accepts a properly signed transaction and returns 201', () => {
    const timestamp = Date.now();
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 25);
    tx.timestamp = timestamp;
    tx.signTransaction(sender.privateKey);

    const res = mockRes();
    const next = jest.fn();
    addTransaction(
      mockReq({
        fromAddress: sender.publicKey,
        toAddress: recipient.publicKey,
        amount: 25,
        signature: tx.signature,
        timestamp,
      }),
      res,
      next
    );

    expect(res.status).toHaveBeenCalledWith(201);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.message).toMatch(/pending/i);
    expect(mockAddTransaction).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(err) when blockchain.addTransaction throws', () => {
    const timestamp = Date.now();
    const tx = new Transaction(sender.publicKey, recipient.publicKey, 25);
    tx.timestamp = timestamp;
    tx.signTransaction(sender.privateKey);

    mockAddTransaction.mockImplementationOnce(() => {
      throw new Error('chain full');
    });

    const res = mockRes();
    const next = jest.fn();
    addTransaction(
      mockReq({
        fromAddress: sender.publicKey,
        toAddress: recipient.publicKey,
        amount: 25,
        signature: tx.signature,
        timestamp,
      }),
      res,
      next
    );

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('transaction.controller.getPendingTransactions', () => {
  it('returns 200 with pending transaction list and count', () => {
    const { blockchain } = require('../models');
    blockchain.pendingTransactions = [{ fromAddress: 'a', toAddress: 'b', amount: 5 }];

    const res = mockRes();
    getPendingTransactions({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
    expect(body.pendingTransactions).toHaveLength(1);
  });
});

describe('transaction.controller.getAllTransactions', () => {
  it('returns 200 with flattened transaction list and count', () => {
    const { blockchain } = require('../models');
    blockchain.getAllTransactions.mockReturnValueOnce([
      { fromAddress: null, toAddress: 'miner', amount: 100 },
    ]);

    const res = mockRes();
    getAllTransactions({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.count).toBe(1);
  });
});
