import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 50000,
  withCredentials: true,
});

export class ApiError extends Error {
  statusCode: number | null;

  constructor(message: string, statusCode?: number | null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode ?? null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.details ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';

    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - check API server:', API_BASE_URL);
    }

    return Promise.reject(
      new ApiError(message, error?.response?.status ?? null)
    );
  }
);

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export interface CreateUserResponse {
  success: boolean;
  user: User;
  generatedPassword: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface TokenStatus {
  configured: boolean;
  tokenLast4: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  capitalConfigured: boolean;
  capitalApiKeyLast4: string | null;
  capitalIdentifier: string | null;
  capitalAccountType: string;
  preferredDerivAccountId?: string | null;
  runtimeConnected?: {
    connected: boolean;
    accountId?: string | null;
    accountType?: string | null;
  } | null;
  derivConnected: boolean;
  capitalReadyForTesting?: boolean;
  brokerStatus?: {
    deriv: {
      configured: boolean;
      status: 'connected' | 'not_configured';
      liveBridgeAvailable: boolean;
      readyForTesting: boolean;
    };
    capital: {
      configured: boolean;
      status: 'configured' | 'not_configured';
      liveBridgeAvailable: boolean;
      readyForTesting: boolean;
    };
  };
}

export interface BrokerCredentialPayload {
  derivToken?: string;
  capitalApiKey?: string;
  capitalIdentifier?: string;
  capitalPassword?: string;
  capitalAccountType?: string;
  preferredDerivAccountId?: string;
}

export interface CapitalMarket {
  epic: string;
  symbol?: string;
  instrumentName?: string;
  instrumentType?: string;
  marketStatus?: string;
}

export interface DerivAccountRow {
  account_id: string;
  balance: string;
  currency: string;
  group?: string;
  status?: string;
  account_type?: string;
}

export interface AdminUser extends User {
  token: {
    tokenLast4: string | null;
    tokenUpdatedAt: string | null;
  };
}

export interface HealthResponse {
  status: string;
  mongo: {
    configured: boolean;
    connected: boolean;
    dbName: string;
    usersCollection: string;
    userTokensCollection: string;
    instrumentsCollection: string;
    eventsCollection: string;
  };
  auth: {
    bootstrapAdminConfigured: boolean;
    usingFallbackJwtSecret: boolean;
    usingFallbackEncryptionKey: boolean;
  };
  trading: {
    users: number;
    totalInstruments: number;
    activeInstruments: number;
    monitoringIntervalMs: number;
  };
}

export interface LogEntry {
  _id: string;
  type: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface LogSummary {
  totalTrades: number;
  totalClosures: number;
  totalBuys: number;
  totalSells: number;
  openTrades: number;
  latestBalance: number | null;
  byBroker?: Partial<
    Record<
      BrokerType,
      {
        totalTrades: number;
        totalBuys: number;
        totalSells: number;
        openTrades: number;
      }
    >
  >;
}

export interface TradeCloseAnalyticsRow {
  brokerType: BrokerType;
  symbol: string | null;
  contract_id: string | null;
  buy_price: number | null;
  sold_for: number | null;
  profit: number | null;
  createdAt: string;
}

export interface AnalyticsBySymbolRow {
  brokerType: BrokerType;
  symbol: string | null;
  closedTrades: number;
  wins: number;
  losses: number;
  netProfit: number;
  grossProfit?: number;
  grossLoss?: number;
  winRate?: number;
  profitFactor?: number | null;
  avgProfit?: number | null;
  medianProfit?: number | null;
  byTimeFrame?: Array<{
    timeFrame: string | null;
    closedTrades: number;
    wins: number;
    losses: number;
    netProfit: number;
    grossProfit: number;
    grossLoss: number;
    avgProfit?: number | null;
    medianProfit?: number | null;
    winRate?: number;
    profitFactor?: number | null;
  }>;
}

export interface AnalyticsSummary {
  closedTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  profitFactor: number | null;
  byBroker: Array<{
    brokerType: BrokerType;
    closedTrades: number;
    wins: number;
    losses: number;
    breakeven: number;
    netProfit: number;
    grossProfit: number;
    grossLoss: number;
    winRate: number;
    profitFactor: number | null;
  }>;
  bySymbol: AnalyticsBySymbolRow[];
  latest: TradeCloseAnalyticsRow[];
}

export type InstrumentRecoveryStrategy = 'fixed_isolated_stake';

export type BrokerType = 'deriv_ws' | 'capital';
export type AssetClassType =
  | 'Synthetic Indices'
  | 'Forex'
  | 'Stocks'
  | 'Commodities'
  | 'Indices'
  | 'Crypto';

export interface InstrumentConfig {
  id?: string;
  userId?: string;
  symbol: string;
  brokerType?: BrokerType;
  assetClass?: AssetClassType;
  shortEmaPeriod: number;
  longEmaPeriod: number;
  timeFrame: string;
  historyDepth: number;
  positionSize: number;
  strategy?: InstrumentRecoveryStrategy;
  multiplier: number;
  /** Max loss in USD before Deriv auto-closes multiplier (0 = off) */
  stopLossAmount?: number;
  /** Take-profit in USD (0 = off) */
  takeProfitAmount?: number;
  /** Seconds after a trade before opening again (0 = off) */
  tradeCooldownSeconds?: number;
  /** Min |short-long|/long gap in basis points to act on a crossover (0 = off) */
  minEmaSeparationBps?: number;
  enabled: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface InstrumentSignal {
  symbol: string;
  shortEma: number;
  longEma: number;
  emaGapBps?: number;
  crossoverDetected?: boolean;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  state: 'BULLISH' | 'BEARISH';
  timestamp: string;
}

export interface InstrumentState {
  symbol: string;
  config: InstrumentConfig;
  signal: InstrumentSignal | null;
  historyNotice?: {
    requested: number;
    received: number;
    tolerated: boolean;
    message: string;
  } | null;
  historyWarning?: {
    requested: number;
    received: number;
    message: string;
  } | null;
  openPosition: {
    contract_id: string;
    signal: string;
    size?: number | null;
    buy_price: number;
    timestamp: string;
    profit?: number | null;
    bid_price?: number | null;
    takeProfitAmount?: number;
    stopLossAmount?: number;
  } | null;
  recentTrades: Array<Record<string, unknown>>;
}

export interface ApiMessageResponse {
  success: boolean;
  message: string;
}

export const tradingAPI = {
  login: (payload: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', payload),
  logout: () => apiClient.post<{ success: boolean }>('/auth/logout'),
  getCurrentUser: () => apiClient.get<{ user: User }>('/auth/me'),

  getHealth: () => apiClient.get<HealthResponse>('/health'),
  getLogs: (limit = 20) => apiClient.get<LogEntry[]>(`/logs?limit=${limit}`),
  getLogsSummary: () => apiClient.get<LogSummary>('/logs/summary'),
  getAnalyticsSummary: (opts?: {
    limit?: number;
    page?: number;
    pageSize?: number;
  }) => {
    const limit = opts?.limit ?? 50;
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? Math.min(14, limit);
    return apiClient.get<AnalyticsSummary>(
      `/analytics/summary?limit=${limit}&page=${page}&pageSize=${pageSize}`
    );
  },

  getTokenStatus: () => apiClient.get<TokenStatus>('/user/token'),
  saveToken: (payload: BrokerCredentialPayload) =>
    apiClient.put<{
      success: boolean;
      tokenLast4?: string | null;
    }>('/user/token', payload),
  deleteToken: () => apiClient.delete<{ success: boolean }>('/user/token'),

  getInstruments: () => apiClient.get<InstrumentConfig[]>('/instruments'),
  getInstrumentState: (symbol: string, brokerType = 'deriv_ws') =>
    apiClient.get<InstrumentState>(
      `/instruments/${symbol}/state?brokerType=${encodeURIComponent(brokerType)}`
    ),
  addInstrument: (config: InstrumentConfig) =>
    apiClient.post<{
      success: boolean;
      message: string;
      instrument: InstrumentConfig;
    }>('/instruments', config),
  updateInstrument: (
    symbol: string,
    updates: Partial<InstrumentConfig>,
    brokerType = 'deriv_ws'
  ) =>
    apiClient.put<{
      success: boolean;
      message: string;
      instrument: InstrumentConfig;
    }>(
      `/instruments/${symbol}?brokerType=${encodeURIComponent(brokerType)}`,
      updates
    ),
  removeInstrument: (symbol: string, brokerType = 'deriv_ws') =>
    apiClient.delete<ApiMessageResponse>(
      `/instruments/${symbol}?brokerType=${encodeURIComponent(brokerType)}`
    ),
  toggleInstrument: (symbol: string, brokerType = 'deriv_ws') =>
    apiClient.patch<{ success: boolean; message: string; enabled: boolean }>(
      `/instruments/${symbol}/toggle?brokerType=${encodeURIComponent(brokerType)}`
    ),
  closeInstrumentPosition: (symbol: string, brokerType = 'deriv_ws') =>
    apiClient.post<{ success: boolean; contracts_closed: number }>(
      `/instruments/${symbol}/close?brokerType=${encodeURIComponent(brokerType)}`
    ),

  getAdminUsers: () => apiClient.get<AdminUser[]>('/admin/users'),
  createAdminUser: (payload: {
    email: string;
    password?: string;
    role: 'user' | 'admin';
    generatePassword?: boolean;
  }) =>
    apiClient.post<{
      success: boolean;
      user: User;
      generatedPassword: string | null;
    }>('/admin/users', payload),
  getDerivAccounts: () =>
    apiClient.get<{ data: DerivAccountRow[] }>('/user/token/accounts'),
  getCapitalMarkets: () =>
    apiClient.get<{ markets: CapitalMarket[] }>('/user/capital/markets'),
  resetAdminUserPassword: (userId: string, password: string) =>
    apiClient.patch<{ success: boolean; message: string }>(
      `/admin/users/${userId}/password`,
      { password }
    ),
  deleteAdminUser: (userId: string) =>
    apiClient.delete<{ success: boolean; user?: User }>(
      `/admin/users/${userId}`
    ),
};
