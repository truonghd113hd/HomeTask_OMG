import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import './Wallet.css';
import { createWallet, fetchBalance } from '../api/blockchain.api';

/**
 * Wallet panel.
 *
 * Generates a cryptographic key pair via `POST /api/wallets`, displays the
 * public key (the wallet address) and its on-chain balance, and keeps the
 * private key in client state only — it is never sent back to the server.
 */
const Wallet = ({ wallet, onWalletCreated, refreshSignal }) => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');
  const [revealKey, setRevealKey] = useState(false);

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

  const refreshBalance = useCallback(async () => {
    if (!wallet) return;
    try {
      const data = await fetchBalance(wallet.publicKey);
      setBalance(data.balance);
    } catch (err) {
      setError(err.message || 'Failed to fetch balance');
    }
  }, [wallet]);

  // Refresh the balance whenever the wallet changes or the chain updates.
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance, refreshSignal]);

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
  refreshSignal: PropTypes.any,
};

export default Wallet;
