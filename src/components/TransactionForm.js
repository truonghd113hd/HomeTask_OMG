import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './TransactionForm.css';
import { addTransaction } from '../api/blockchain.api';
import { signTransaction } from '../utils/crypto';

const TransactionForm = ({ wallet, balance, onTransactionAdded }) => {
  const [formData, setFormData] = useState({ toAddress: '', amount: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!wallet) {
      setMessage('Create a wallet first to sign transactions.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const amount = Number(formData.amount);

      if (balance !== null && amount > balance) {
        setMessage(`Insufficient balance. Your current balance is ${balance}.`);
        setLoading(false);
        return;
      }

      // Build the exact payload that gets signed. The timestamp is part of the
      // signed hash, so it must travel to the server unchanged.
      const payload = {
        fromAddress: wallet.publicKey,
        toAddress: formData.toAddress.trim(),
        amount,
        timestamp: Date.now(),
      };

      const signature = signTransaction(wallet.privateKey, payload);

      await addTransaction({ ...payload, signature });
      setMessage('Transaction signed and added successfully!');
      setFormData({ toAddress: '', amount: '' });
      onTransactionAdded();
    } catch (err) {
      setMessage(err.message || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form">
      <h2 className="panel-title">Create Transaction</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fromAddress">From Address (your wallet)</label>
          <input
            type="text"
            id="fromAddress"
            name="fromAddress"
            value={wallet ? wallet.publicKey : ''}
            placeholder="Create a wallet to populate this"
            readOnly
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="toAddress">To Address</label>
          <input
            type="text"
            id="toAddress"
            name="toAddress"
            value={formData.toAddress}
            onChange={handleChange}
            placeholder="Recipient public key"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="e.g., 100"
            step="0.01"
            min="0"
            required
          />
        </div>

        {message && (
          <div className={`form-message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <button type="submit" className="submit-button" disabled={loading || !wallet}>
          {loading ? 'Signing…' : 'Sign & Add Transaction'}
        </button>
      </form>
    </div>
  );
};

TransactionForm.propTypes = {
  wallet: PropTypes.shape({
    publicKey: PropTypes.string.isRequired,
    privateKey: PropTypes.string.isRequired,
  }),
  balance: PropTypes.number,
  onTransactionAdded: PropTypes.func.isRequired,
};

export default TransactionForm;
