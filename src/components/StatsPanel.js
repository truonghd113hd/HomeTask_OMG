import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './StatsPanel.css';
import ENDPOINTS from '../api/endpoints';

const StatsPanel = ({ stats, onMine }) => {
  // Hooks must run unconditionally — keep them above the early return.
  const [feeInfo, setFeeInfo] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetch(ENDPOINTS.FEE)
      .then((r) => r.json())
      .then((data) => {
        if (mounted) setFeeInfo(data);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!stats) return null;

  const pendingCount = stats.pendingTransactions;
  const hasPending = pendingCount > 0;

  return (
    <div className="stats-panel">
      <h2 className="panel-title">Blockchain Stats</h2>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Chain Length</div>
          <div className="stat-value">{stats.chainLength}</div>
        </div>

        <div className={`stat-item${hasPending ? ' pending-active' : ''}`}>
          <div className="stat-label">Pending Transactions</div>
          <div className="stat-value">{pendingCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Difficulty</div>
          <div className="stat-value">{stats.difficulty}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Mining Reward</div>
          <div className="stat-value">{stats.miningReward}</div>
        </div>

        <div className="stat-item status">
          <div className="stat-label">Chain Status</div>
          <div className={`stat-value ${stats.isValid ? 'valid' : 'invalid'}`}>
            {stats.isValid ? '✓ Valid' : '✗ Invalid'}
          </div>
        </div>

        {feeInfo && (
          <div
            className="stat-item fee-item"
            title={`Computed fee for ${feeInfo.amount} at ${feeInfo.percent}%`}
          >
            <div className="stat-label">Fee</div>
            <div className="stat-value">
              {Number(feeInfo.amount).toLocaleString()} @ {Number(feeInfo.percent).toFixed(2)}% →{' '}
              {Number(feeInfo.fee).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <button className={`mine-button${hasPending ? ' has-pending' : ''}`} onClick={onMine}>
        ⛏️ Mine Block{hasPending ? ` (${pendingCount} pending)` : ''}
      </button>

      {hasPending && (
        <p className="mine-hint">
          {pendingCount} transaction{pendingCount > 1 ? 's are' : ' is'} waiting — mine a block to
          confirm {pendingCount > 1 ? 'them' : 'it'} into balances.
        </p>
      )}
    </div>
  );
};

export default StatsPanel;

StatsPanel.propTypes = {
  stats: PropTypes.shape({
    chainLength: PropTypes.number.isRequired,
    pendingTransactions: PropTypes.number.isRequired,
    difficulty: PropTypes.number.isRequired,
    miningReward: PropTypes.number.isRequired,
    isValid: PropTypes.bool.isRequired,
  }),
  onMine: PropTypes.func.isRequired,
};
