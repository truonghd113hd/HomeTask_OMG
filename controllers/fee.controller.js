const config = require('../config');
const { computeFee } = require('../utils/fee');
const { sendSuccess, sendError } = require('../utils/response');

function getFee(req, res) {
  try {
    const amount = Number(config.fee.defaultAmount);
    const percent = Number(config.fee.defaultPercentage);
    // prefer any precomputed value (startup may have stored it)
    const fee = config.computedFee || computeFee(amount, percent);
    sendSuccess(res, { amount, percent, fee });
  } catch (err) {
    sendError(res, 'Failed to compute fee', 500);
  }
}

module.exports = { getFee };
