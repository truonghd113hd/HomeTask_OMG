import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import './BlockchainViewer.css';
import { filterAndSortBlocks } from '../utils/blocks';

const BlockchainViewer = ({ blockchain }) => {
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const chain = blockchain && blockchain.chain;

  // View-only: filter/sort a copy. The canonical chain is never reordered.
  const visibleBlocks = useMemo(
    () => (chain ? filterAndSortBlocks(chain, { query, fromDate, toDate, sortOrder }) : []),
    [chain, query, fromDate, toDate, sortOrder]
  );

  if (!chain) {
    return (
      <div className="blockchain-viewer">
        <p>Loading blockchain data...</p>
      </div>
    );
  }

  const hasFilters = query || fromDate || toDate;
  const clearFilters = () => {
    setQuery('');
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="blockchain-viewer">
      <h2 className="panel-title">
        Blockchain ({chain.length} blocks
        {hasFilters ? `, showing ${visibleBlocks.length}` : ''})
      </h2>

      <div className="viewer-controls">
        <input
          type="text"
          className="viewer-search"
          placeholder="Search address, hash, or amount…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="viewer-control">
          From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="viewer-control">
          To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <label className="viewer-control">
          Sort
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </label>
        {hasFilters && (
          <button type="button" className="viewer-clear" onClick={clearFilters}>
            Clear
          </button>
        )}
      </div>

      <div className="blocks-container">
        {visibleBlocks.length === 0 ? (
          <p className="viewer-empty">No blocks match your filters.</p>
        ) : (
          visibleBlocks.map(({ block, height }) => (
            <div key={block.hash || height} className="block-card">
              <div className="block-header">
                <span className="block-number">Block #{height}</span>
                {height === 0 && <span className="genesis-badge">Genesis</span>}
              </div>

              <div className="block-content">
                <div className="block-field">
                  <span className="field-label">Hash:</span>
                  <span className="field-value hash">{block.hash}</span>
                </div>

                <div className="block-field">
                  <span className="field-label">Previous Hash:</span>
                  <span className="field-value hash">{block.previousHash || 'N/A'}</span>
                </div>

                <div className="block-field">
                  <span className="field-label">Timestamp:</span>
                  <span className="field-value">{new Date(block.timestamp).toLocaleString()}</span>
                </div>

                <div className="block-field">
                  <span className="field-label">Nonce:</span>
                  <span className="field-value">{block.nonce}</span>
                </div>

                <div className="block-field">
                  <span className="field-label">Transactions:</span>
                  <span className="field-value">{block.transactions?.length || 0}</span>
                </div>

                {block.transactions && block.transactions.length > 0 && (
                  <div className="transactions-list">
                    <div className="transactions-header">Transactions:</div>
                    {block.transactions.map((tx, txIndex) => (
                      <div key={txIndex} className="transaction-item">
                        <div className="tx-from">
                          <span className="tx-label">From:</span>
                          <span className="tx-address">{tx.fromAddress || 'Mining Reward'}</span>
                        </div>
                        <div className="tx-arrow">→</div>
                        <div className="tx-to">
                          <span className="tx-label">To:</span>
                          <span className="tx-address">{tx.toAddress}</span>
                        </div>
                        <div className="tx-amount">{tx.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

BlockchainViewer.propTypes = {
  blockchain: PropTypes.shape({
    chain: PropTypes.arrayOf(
      PropTypes.shape({
        hash: PropTypes.string,
        previousHash: PropTypes.string,
        timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        nonce: PropTypes.number,
        transactions: PropTypes.arrayOf(PropTypes.object),
      })
    ).isRequired,
  }).isRequired,
};

export default BlockchainViewer;
