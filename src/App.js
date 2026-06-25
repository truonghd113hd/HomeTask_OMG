import React, { useState, useEffect } from 'react';
import './App.css';

import BlockchainViewer from './components/BlockchainViewer';
import TransactionForm from './components/TransactionForm';
import StatsPanel from './components/StatsPanel';
import Header from './components/Header';
import Wallet from './components/Wallet';

import useBlockchain from './hooks/useBlockchain';
import usePersistentWallet from './hooks/usePersistentWallet';
import { mineBlock, fetchBalance } from './api/blockchain.api';

function App() {
  const { chain, stats, loading, error, refresh } = useBlockchain();
  // The active wallet lives in client state only (persisted in localStorage so
  // it survives refreshes); its private key is used to sign transactions
  // locally and is never sent to the server.
  const [wallet, setWallet] = usePersistentWallet();
  const [balance, setBalance] = useState(null);
  const [mineError, setMineError] = useState(null);

  // Refresh the wallet balance whenever the wallet changes or the chain
  // updates. The `ignore` flag discards a response that resolves after a newer
  // request has already superseded it (out-of-order fetch race).
  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      return undefined;
    }

    let ignore = false;
    (async () => {
      try {
        const data = await fetchBalance(wallet.publicKey);
        if (!ignore) setBalance(data.balance);
      } catch (err) {
        if (!ignore) console.error('Failed to fetch balance:', err.message);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [wallet, chain]);

  const handleMine = async () => {
    try {
      setMineError(null);
      await mineBlock(wallet ? wallet.publicKey : undefined);
      await refresh();
    } catch (err) {
      setMineError(err.message || 'Mining failed');
      console.error('Mining failed:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading Blockchain...</p>
      </div>
    );
  }

  return (
    <div className="App">
      <Header />
      <div className="app-container">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}
        {mineError && (
          <div className="error-banner mine-error">
            <p>{mineError}</p>
          </div>
        )}

        <div className="main-content">
          <div className="left-panel">
            <StatsPanel stats={stats} onMine={handleMine} />
            <Wallet wallet={wallet} onWalletCreated={setWallet} balance={balance} />
            <TransactionForm wallet={wallet} balance={balance} onTransactionAdded={refresh} />
          </div>

          <div className="right-panel">
            <BlockchainViewer blockchain={chain} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
