/* eslint-env node */
const config = require('../config');
const { computeFee } = require('../utils/fee');

function getFee(req, res) {
  try {
    const amount = Number(config.fee.defaultAmount);
    const percent = Number(config.fee.defaultPercentage);
    // prefer any precomputed value (startup may have stored it)
    const fee = config.computedFee || computeFee(amount, percent);
    res.json({ amount, percent, fee });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute fee' });
  }
}

module.exports = { getFee };
