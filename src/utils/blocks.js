/**
 * Pure, view-only helpers for displaying the blockchain.
 *
 * IMPORTANT: these never mutate or reorder the canonical chain — the chain's
 * order is consensus-critical (each block links to the previous via
 * `previousHash`). They operate on a copy and return `{ block, height }` pairs
 * so the true block height is preserved regardless of display order.
 */

/**
 * Filters and sorts blocks for display.
 *
 * @param {Array} chain - the canonical chain (oldest-first).
 * @param {object} options
 * @param {string} [options.query] - case-insensitive substring matched against
 *   a block's hash and its transactions' addresses/amount.
 * @param {string} [options.fromDate] - inclusive lower bound, `YYYY-MM-DD`.
 * @param {string} [options.toDate] - inclusive upper bound, `YYYY-MM-DD`.
 * @param {'asc'|'desc'} [options.sortOrder] - `desc` (newest first) by default.
 * @returns {Array<{ block: object, height: number }>}
 */
export const filterAndSortBlocks = (
  chain = [],
  { query = '', fromDate = '', toDate = '', sortOrder = 'desc' } = {}
) => {
  const q = query.trim().toLowerCase();
  const fromTs = fromDate ? new Date(fromDate).getTime() : null;
  const toTs = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

  const matches = ({ block }) => {
    const ts = Number(block.timestamp);
    if (fromTs !== null && ts < fromTs) return false;
    if (toTs !== null && ts > toTs) return false;

    if (!q) return true;
    if ((block.hash || '').toLowerCase().includes(q)) return true;

    return (block.transactions || []).some(
      (tx) =>
        (tx.fromAddress || '').toLowerCase().includes(q) ||
        (tx.toAddress || '').toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
    );
  };

  return chain
    .map((block, height) => ({ block, height }))
    .filter(matches)
    .sort((a, b) => (sortOrder === 'asc' ? a.height - b.height : b.height - a.height));
};
