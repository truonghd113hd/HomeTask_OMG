require('dotenv').config();
const path = require('path');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3002,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  blockchain: {
    difficulty: parseInt(process.env.BLOCKCHAIN_DIFFICULTY, 10) || 2,
    miningReward: parseFloat(process.env.BLOCKCHAIN_MINING_REWARD) || 100,
    initialMinerAddress: process.env.INITIAL_MINER_ADDRESS || 'genesis-miner',
  },
  demoData: {
    enabled: process.env.SEED_DEMO_DATA !== 'false',
    transactions: [
      { from: 'address1', to: 'address2', amount: 100 },
      { from: 'address2', to: 'address1', amount: 50 },
    ],
  },
  fee: {
    defaultAmount: parseFloat(process.env.FEE_AMOUNT) || 100,
    defaultPercentage: parseFloat(process.env.FEE_PERCENTAGE) || 2.5,
  },
  persistence: {
    enabled: process.env.BLOCKCHAIN_PERSISTENCE !== 'false',
    file:
      process.env.BLOCKCHAIN_DATA_FILE ||
      path.join(__dirname, '..', 'blockchain.json'),
  },
  faucet: {
    giftAmount: parseFloat(process.env.FAUCET_GIFT_AMOUNT) || 500,
  },
};
