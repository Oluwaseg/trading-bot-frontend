function resolvePositionSnapshot(
  previousState,
  nextState,
  previousEmptyCount = 0
) {
  if (nextState.openPosition) {
    return {
      state: { ...nextState, positionSyncPending: false },
      emptyCount: 0,
    };
  }

  if (previousState?.openPosition) {
    const emptyCount = previousEmptyCount + 1;
    if (emptyCount < 2) {
      return {
        state: {
          ...nextState,
          openPosition: previousState.openPosition,
          positionSyncPending: true,
        },
        emptyCount,
      };
    }
  }

  return {
    state: { ...nextState, positionSyncPending: false },
    emptyCount: 0,
  };
}

module.exports = { resolvePositionSnapshot };
