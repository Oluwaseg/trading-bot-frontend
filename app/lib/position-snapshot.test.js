const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePositionSnapshot } = require('./position-snapshot');

const position = {
  contract_id: 'contract-1',
  signal: 'BUY',
  buy_price: 100,
  timestamp: '2026-10-06T00:00:00.000Z',
};

function state(openPosition) {
  return { symbol: 'R_75', openPosition };
}

test('a single empty state snapshot retains a previously open position', () => {
  const result = resolvePositionSnapshot(state(position), state(null));

  assert.equal(result.state.openPosition.contract_id, 'contract-1');
  assert.equal(result.state.positionSyncPending, true);
  assert.equal(result.emptyCount, 1);
});

test('a second consecutive empty snapshot confirms the position is closed', () => {
  const result = resolvePositionSnapshot(state(position), state(null), 1);

  assert.equal(result.state.openPosition, null);
  assert.equal(result.state.positionSyncPending, false);
  assert.equal(result.emptyCount, 0);
});

test('a renewed open snapshot resets the empty confirmation count', () => {
  const result = resolvePositionSnapshot(state(null), state(position), 1);

  assert.equal(result.state.openPosition.contract_id, 'contract-1');
  assert.equal(result.state.positionSyncPending, false);
  assert.equal(result.emptyCount, 0);
});
