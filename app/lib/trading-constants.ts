import type {
  AssetClassType,
  BrokerType,
  InstrumentConfig,
} from '../api-client';

export const BROKER_OPTIONS = [
  { value: 'deriv_ws', label: 'Deriv Synthetic Engine' },
  { value: 'mt5', label: 'MT5 account' },
] as const;

export const ASSET_CLASS_OPTIONS = [
  { value: 'Synthetic Indices', label: 'Synthetic Indices' },
  { value: 'Forex', label: 'Forex' },
  { value: 'Stocks', label: 'Stocks' },
  { value: 'Commodities', label: 'Commodities' },
  { value: 'Indices', label: 'Indices' },
  { value: 'Crypto', label: 'Crypto' },
] as const;

export const TIMEFRAME_OPTIONS_BY_BROKER = {
  deriv_ws: [
    { value: '1m', label: '1m' },
    { value: '1s', label: '1s (ticks)' },
    { value: '10s', label: '10s (ticks)' },
    { value: '2m', label: '2m' },
    { value: '3m', label: '3m' },
    { value: '5m', label: '5m' },
    { value: '10m', label: '10m' },
    { value: '15m', label: '15m' },
    { value: '30m', label: '30m' },
    { value: '1h', label: '1h' },
    { value: '2h', label: '2h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ],
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

export type SymbolCatalog = Record<
  BrokerType,
  Partial<Record<AssetClassType, readonly string[]>>
>;

export const SYMBOL_OPTIONS_BY_BROKER_AND_CLASS: SymbolCatalog = {
  deriv_ws: {
    'Synthetic Indices': [
      'R_10',
      'R_25',
      'R_50',
      'R_75',
      'R_100',
      'CRASH500',
      'BOOM500',
      'CRASH1000',
      'BOOM1000',
    ],
  },
  mt5: {
    Forex: ['EURUSD', 'GBPUSD', 'USDJPY'],
    Commodities: ['GOLD'],
    Indices: ['US500'],
    Crypto: [],
  },
};

export const DEFAULT_NEW_INSTRUMENT: InstrumentConfig = {
  symbol: 'R_75',
  brokerType: 'deriv_ws',
  assetClass: 'Synthetic Indices',
  shortEmaPeriod: 5,
  longEmaPeriod: 20,
  timeFrame: '1s',
  historyDepth: 500,
  positionSize: 1,
  strategy: 'fixed_isolated_stake',
  recoverySizePerCurrency: 1,
  maxRecoverySize: 35,
  multiplier: 100,
  stopLossAmount: 0,
  takeProfitAmount: 0,
  trailingStopDistanceAmount: 0,
  trailingProfitActivationAmount: 0,
  trailingProfitGivebackAmount: 0,
  enabled: true,
};

const DERIV_SYNTHETIC_SYMBOLS =
  SYMBOL_OPTIONS_BY_BROKER_AND_CLASS.deriv_ws['Synthetic Indices'] ?? [];
export const SYMBOL_OPTIONS = [...DERIV_SYNTHETIC_SYMBOLS] as const;
