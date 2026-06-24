/**
 * Computes a fee amount given a principal and a percentage rate.
 *
 * @param {number} amount - the principal value.
 * @param {number} percentage - the fee rate (e.g. 2.5 for 2.5 %).
 * @returns {number} the computed fee.
 */
function computeFee(amount, percentage) {
  return (amount * percentage) / 100;
}

module.exports = { computeFee };
