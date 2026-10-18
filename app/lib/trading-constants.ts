import type {
  AssetClassType,
  BrokerType,
  InstrumentConfig,
} from '../api-client';

export const ASSET_CLASS_OPTIONS = [
  { value: 'Synthetic Indices', label: 'Synthetic Indices' },
  { value: 'Forex', label: 'Forex' },
  { value: 'Stocks', label: 'Stocks' },
  { value: 'Commodities', label: 'Commodities' },
  { value: 'Indices', label: 'Indices' },
  { value: 'Crypto', label: 'Crypto' },
] as const;

export const TIMEFRAME_OPTIONS_BY_BROKER = {
  mt5: [
    { value: '1m', label: '1m' },
    { value: '1s', label: '1s (ticks)' },
    { value: '10s', label: '10s (ticks)' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ],
} as const;

export type SymbolCatalog = Partial<
  Record<BrokerType, Partial<Record<AssetClassType, readonly string[]>>>
>;

export const SYMBOL_OPTIONS_BY_BROKER_AND_CLASS: SymbolCatalog = {
  mt5: {
    'Synthetic Indices': [
      'Volatility 10 Index',
      'Volatility 25 Index',
      'Volatility 50 Index',
      'Volatility 75 Index',
      'Volatility 100 Index',
      'Volatility 10 (1s) Index',
      'Volatility 25 (1s) Index',
      'Volatility 50 (1s) Index',
      'Volatility 75 (1s) Index',
      'Volatility 100 (1s) Index',
      'Volatility 150 (1s) Index',
      'Volatility 250 (1s) Index',
      'Volatility 15 (1s) Index',
      'Volatility 30 (1s) Index',
      'Volatility 90 (1s) Index',
      'Volatility 5 Index',
      'Volatility 5 (1s) Index',
      'Volatility 15 Index',
      'Volatility 30 Index',
      'Volatility 90 Index',
    ],
    Forex: ['EURUSD', 'GBPUSD', 'USDJPY'],
    Commodities: ['XAUUSD'],
    Indices: ['US500'],
    Crypto: [],
  },
};

export const MT5_ASSET_CLASS_OPTIONS = ASSET_CLASS_OPTIONS.filter(
  (option) =>
    (SYMBOL_OPTIONS_BY_BROKER_AND_CLASS.mt5?.[option.value]?.length ?? 0) > 0
);

export const DEFAULT_NEW_INSTRUMENT: InstrumentConfig = {
  symbol: 'EURUSD',
  brokerType: 'mt5',
  assetClass: 'Forex',
  shortEmaPeriod: 5,
  longEmaPeriod: 20,
  timeFrame: '1m',
  historyDepth: 500,
  positionSize: 0.01,
  strategy: 'fixed_isolated_stake',
  recoverySizePerCurrency: 0,
  maxRecoverySize: 0.01,
  multiplier: 100,
  trailingStopDistanceAmount: 0,
  enabled: false,
  automatedEntriesEnabled: false,
};
