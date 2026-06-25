/**
 * @jest-environment node
 */
/* eslint-env jest */

const { filterAndSortBlocks } = require('../src/utils/blocks');

// Mid-month timestamps so month-boundary date filters never flip on timezone.
const chain = [
  { hash: 'h0', timestamp: new Date('2024-01-15T12:00:00Z').getTime(), transactions: [] },
  {
    hash: 'h1',
    timestamp: new Date('2024-02-15T12:00:00Z').getTime(),
    transactions: [{ fromAddress: 'alicePubKey', toAddress: 'bobPubKey', amount: 10 }],
  },
  {
    hash: 'h2',
    timestamp: new Date('2024-03-15T12:00:00Z').getTime(),
    transactions: [{ fromAddress: null, toAddress: 'carolPubKey', amount: 100 }],
  },
];

const heights = (result) => result.map((r) => r.height);

describe('filterAndSortBlocks', () => {
  it('preserves true block height and defaults to newest-first', () => {
    expect(heights(filterAndSortBlocks(chain))).toEqual([2, 1, 0]);
  });

  it('sorts oldest-first when asked', () => {
    expect(heights(filterAndSortBlocks(chain, { sortOrder: 'asc' }))).toEqual([0, 1, 2]);
  });

  it('returns everything for an empty query', () => {
    expect(filterAndSortBlocks(chain, { query: '' })).toHaveLength(3);
  });

  it('filters by transaction address (case-insensitive)', () => {
    expect(heights(filterAndSortBlocks(chain, { query: 'ALICE' }))).toEqual([1]);
  });

  it('filters by block hash and by amount', () => {
    expect(heights(filterAndSortBlocks(chain, { query: 'h2' }))).toEqual([2]);
    expect(heights(filterAndSortBlocks(chain, { query: '100' }))).toEqual([2]);
  });

  it('filters by an inclusive date range', () => {
    expect(heights(filterAndSortBlocks(chain, { fromDate: '2024-02-01' }))).toEqual([2, 1]);
    expect(heights(filterAndSortBlocks(chain, { toDate: '2024-02-28' }))).toEqual([1, 0]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterAndSortBlocks(chain, { query: 'no-such-thing' })).toEqual([]);
  });
});
