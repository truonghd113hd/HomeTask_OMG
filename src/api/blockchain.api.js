import client from './client';
import ENDPOINTS from './endpoints';

export const fetchChain = () => client.get(ENDPOINTS.CHAIN);

export const fetchChainValidity = () => client.get(ENDPOINTS.CHAIN_VALID);

export const fetchStats = () => client.get(ENDPOINTS.STATS);

export const fetchPendingTransactions = () => client.get(ENDPOINTS.TRANSACTIONS_PENDING);

export const fetchAllTransactions = () => client.get(ENDPOINTS.TRANSACTIONS_ALL);

export const createWallet = () => client.post(ENDPOINTS.WALLETS);

export const addTransaction = (transaction) => client.post(ENDPOINTS.TRANSACTIONS, transaction);

export const mineBlock = (miningRewardAddress = 'miner1') =>
  client.post(ENDPOINTS.MINE, { miningRewardAddress });

export const fetchBalance = (address) => client.get(ENDPOINTS.balance(address));

export const fetchDashboard = () =>
  Promise.all([fetchChain(), fetchStats()]).then(([chainData, statsData]) => ({
    chainData,
    statsData,
  }));
