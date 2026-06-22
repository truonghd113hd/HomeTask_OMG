// Small fee helper wrapper for server-side usage
const Web3TokenHelper = require('web3-token-helper');

function computeFee(amount, percentage) {
  const fee = Web3TokenHelper.calculateFee(amount, percentage);
  return fee;
}

module.exports = { computeFee };
