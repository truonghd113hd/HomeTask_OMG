/**
 * @jest-environment node
 */
/* eslint-env jest */

const { getFee } = require('../controllers/fee.controller');

const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('fee.controller.getFee', () => {
  it('returns amount, percent, and the computed fee', () => {
    const res = mockRes();
    getFee({}, res);

    const body = res.json.mock.calls[0][0];
    expect(typeof body.amount).toBe('number');
    expect(typeof body.percent).toBe('number');
    expect(typeof body.fee).toBe('number');
    expect(body.fee).toBeCloseTo((body.amount * body.percent) / 100, 5);
  });

  it('fee is amount × percent / 100', () => {
    const res = mockRes();
    getFee({}, res);

    const { amount, percent, fee } = res.json.mock.calls[0][0];
    expect(fee).toBeCloseTo((amount * percent) / 100);
  });
});
