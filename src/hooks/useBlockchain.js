import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchDashboard } from '../api/blockchain.api';
import { POLL_INTERVAL_MS } from '../constants';

const useBlockchain = (pollInterval = POLL_INTERVAL_MS) => {
  const [chain, setChain] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const latestRequestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    try {
      const { chainData, statsData } = await fetchDashboard();
      // A newer refresh (poll or manual) has superseded this one — drop its
      // result so out-of-order responses can't clobber fresher state.
      if (requestId !== latestRequestRef.current) return;
      setChain(chainData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      if (requestId === latestRequestRef.current) {
        setError(err.message || 'Failed to connect to the blockchain API.');
      }
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, pollInterval);
    return () => clearInterval(intervalRef.current);
  }, [refresh, pollInterval]);

  return { chain, stats, loading, error, refresh };
};

export default useBlockchain;
