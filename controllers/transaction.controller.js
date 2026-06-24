const { blockchain, Transaction } = require('../models');
const { sendSuccess, sendCreated, sendError } = require('../utils/response');
const { isValidAddress, isValidAmount, sanitizeAddress, sanitizeAmount } = require('../utils/validator');

const addTransaction = (req, res, next) => {
  try {
    const { fromAddress, toAddress, amount, signature, timestamp } = req.body;

    if (!isValidAddress(fromAddress) || !isValidAddress(toAddress)) {
      return sendError(res, 'Invalid wallet address format', 400);
    }

    if (!isValidAmount(amount)) {
      return sendError(res, 'Amount must be a positive number', 400);
    }

    const transaction = new Transaction(
      sanitizeAddress(fromAddress),
      sanitizeAddress(toAddress),
      sanitizeAmount(amount)
    );

    // The client signs the transaction locally, so we must rebuild it with the
    // exact timestamp it signed over (the timestamp is part of the signed hash)
    // and attach the supplied signature before validation.
    if (timestamp !== undefined) {
      transaction.timestamp = Number(timestamp);
    }
    transaction.signature = signature;

    // Surface a bad signature as a 400 (client error) rather than letting the
    // model throw and bubble up as a generic 500.
    if (!transaction.isValid()) {
      return sendError(res, 'Transaction signature is invalid', 400);
    }

    // `addTransaction` re-validates as a defence-in-depth check.
    blockchain.addTransaction(transaction);

    sendCreated(res, {
      message: 'Transaction added to pending pool',
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

const getPendingTransactions = (req, res) => {
  sendSuccess(res, {
    pendingTransactions: blockchain.pendingTransactions,
    count: blockchain.pendingTransactions.length,
  });
};

const getAllTransactions = (req, res) => {
  const transactions = blockchain.getAllTransactions();
  sendSuccess(res, { transactions, count: transactions.length });
};

module.exports = { addTransaction, getPendingTransactions, getAllTransactions };
