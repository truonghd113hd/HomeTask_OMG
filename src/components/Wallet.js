import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './Wallet.css';
import { createWallet, giftWallet } from '../api/blockchain.api';

/**
 * Wallet panel.
 *
 * Generates a cryptographic key pair via `POST /api/wallets`, displays the
 * public key (the wallet address) and its on-chain balance, and keeps the
 * private key in client state only — it is never sent back to the server.
 */
const Wallet = ({ wallet, onWalletCreated, balance }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [giftMessage, setGiftMessage] = useState({ text: '', type: '' });
  const [revealKey, setRevealKey] = useState(false);
  const [giftLoading, setGiftLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const { publicKey, privateKey } = await createWallet();
      onWalletCreated({ publicKey, privateKey });
      setRevealKey(false);
    } catch (err) {
      setError(err.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleGift = async () => {
    if (!wallet) return;
    setGiftLoading(true);
    setGiftMessage({ text: '', type: '' });
    try {
      const response = await giftWallet(wallet.publicKey);
      setGiftMessage({ text: response.message || 'Gift coins added!', type: 'success' });
    } catch (err) {
      setGiftMessage({ text: err.message || 'Failed to request gift coins', type: 'error' });
    } finally {
      setGiftLoading(false);
    }
  };

  return (
    <div className="wallet-panel">
      <h2 className="panel-title">Wallet</h2>

      {!wallet ? (
        <p className="wallet-empty">
          No wallet yet. Generate one to start sending signed transactions.
        </p>
      ) : (
        <div className="wallet-details">
          <div className="wallet-field">
            <span className="wallet-label">Address (public key)</span>
            <code className="wallet-value" title={wallet.publicKey}>
              {wallet.publicKey}
            </code>
          </div>

          <div className="wallet-field">
            <span className="wallet-label">Balance</span>
            <span className="wallet-balance">{balance === null ? '…' : balance}</span>
          </div>

          <div className="wallet-field">
            <span className="wallet-label">Private key (kept in your browser only)</span>
            {revealKey ? (
              <code className="wallet-value wallet-private">{wallet.privateKey}</code>
            ) : (
              <button type="button" className="wallet-link" onClick={() => setRevealKey(true)}>
                Reveal private key
              </button>
            )}
          </div>

          <div className="wallet-field">
            <span className="wallet-label">Free Coins (dev only)</span>
            <button
              type="button"
              className="wallet-link"
              onClick={handleGift}
              disabled={giftLoading}
            >
              {giftLoading ? 'Requesting…' : '🎁 Request Gift Coins'}
            </button>
            {giftMessage.text && (
              <span className={`form-message ${giftMessage.type}`}>{giftMessage.text}</span>
            )}
          </div>
        </div>
      )}

      {error && <div className="form-message error">{error}</div>}

      <button type="button" className="submit-button" onClick={handleCreate} disabled={loading}>
        {loading ? 'Generating…' : wallet ? 'Generate New Wallet' : 'Create Wallet'}
      </button>
    </div>
  );
};

Wallet.propTypes = {
  wallet: PropTypes.shape({
    publicKey: PropTypes.string.isRequired,
    privateKey: PropTypes.string.isRequired,
  }),
  onWalletCreated: PropTypes.func.isRequired,
  balance: PropTypes.number,
};

export default Wallet;
