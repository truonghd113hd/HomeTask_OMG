const config = require('../config');
const logger = require('../utils/logger');
const { Blockchain, Block, Transaction } = require('./blockchain');

const blockchain = new Blockchain(
  config.blockchain.difficulty,
  config.blockchain.miningReward
);

const seedDemoData = () => {
  if (!config.demoData.enabled) {
    return;
  }

  for (const { from, to, amount } of config.demoData.transactions) {
    blockchain.addTransaction(new Transaction(from, to, amount));
  }

  if (blockchain.pendingTransactions.length > 0) {
    blockchain.minePendingTransactions(config.blockchain.initialMinerAddress);
    logger.info('Seeded demo blockchain data');
  }
};

seedDemoData();

module.exports = {
  blockchain,
  Blockchain,
  Block,
  Transaction,
};
