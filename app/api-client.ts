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
  preferredDerivAccountId?: string | null;
  runtimeConnected?: {
    connected: boolean;
    accountId?: string | null;
    accountType?: string | null;
  } | null;
  derivConnected: boolean;
  mt5Configured?: boolean;
  brokerStatus?: {
    deriv: {
      configured: boolean;
      status: 'connected' | 'not_configured';
      liveBridgeAvailable: boolean;
      readyForTesting: boolean;
    };
  };
}

export interface BrokerCredentialPayload {
  derivToken?: string;
  preferredDerivAccountId?: string;
}

export interface Mt5Account {
  id: string;
  userId: string;
  label: string;
  login: string;
  server: string;
  broker?: string | null;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
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
    riskMonitoringIntervalMs?: number;
  };
}

export interface LogEntry {
  _id: string;
  type: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface ActivityPage {
  items: LogEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filters: {
    broker: BrokerType | null;
    type: string | null;
  };
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
  brokerLabel?: string | null;
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

export type InstrumentRecoveryStrategy =
  | 'fixed_isolated_stake'
  | 'standard_accumulative_deficit'
  | 'aggressive_single_loss_multiplier';

export type BrokerType = 'deriv_ws' | 'mt5';
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
  mt5AccountId?: string | null;
  signalSource?: 'ema' | 'tradingview';
  webhookConfigured?: boolean;
  assetClass?: AssetClassType;
  shortEmaPeriod: number;
  longEmaPeriod: number;
  timeFrame: string;
  historyDepth: number;
  positionSize: number;
  strategy?: InstrumentRecoveryStrategy;
  /** Native size units added for each unit of realized account-currency loss. */
  recoverySizePerCurrency?: number;
  /** Maximum broker-native position size for recovery strategies. */
  maxRecoverySize?: number;
  multiplier: number;
  /** Initial account-currency loss limit (0 = off). */
  stopLossAmount?: number;
  /** Legacy fixed take-profit; new UI uses trailing thresholds instead. */
  takeProfitAmount?: number;
  /** Trail distance below peak unrealized profit for the trailing stop (0 = off). */
  trailingStopDistanceAmount?: number;
  /** Start trailing profit after unrealized account-currency profit reaches this amount (0 = off). */
  trailingProfitActivationAmount?: number;
  /** Close after profit retraces this much from its post-activation peak (0 = off). */
  trailingProfitGivebackAmount?: number;
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
    protectionStopLoss?: number;
    protectionTakeProfit?: number;
    trailingPeakProfit?: number | null;
    trailingStopLevel?: number | null;
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
  getActivity: (params: {
    page: number;
    pageSize: number;
    broker?: BrokerType | '';
    type?: string;
  }) =>
    apiClient.get<ActivityPage>('/logs/activity', {
      params,
    }),
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
  getWebhookSecret: () =>
    apiClient.get<{ secret: string }>('/user/webhook-secret'),
  saveToken: (payload: BrokerCredentialPayload) =>
    apiClient.put<{
      success: boolean;
      tokenLast4?: string | null;
    }>('/user/token', payload),
  deleteToken: () => apiClient.delete<{ success: boolean }>('/user/token'),
  getMt5Accounts: () =>
    apiClient.get<{ accounts: Mt5Account[] }>('/mt5/accounts'),
  createMt5Account: (payload: {
    label?: string;
    login: string;
    password: string;
    server: string;
    broker?: string;
  }) => apiClient.post<{ account: Mt5Account }>('/mt5/accounts', payload),
  deleteMt5Account: (accountId: string) =>
    apiClient.delete<{ deleted: boolean }>(`/mt5/accounts/${accountId}`),

  getInstruments: () => apiClient.get<InstrumentConfig[]>('/instruments'),
  generateInstrumentWebhook: (instrumentId: string) =>
    apiClient.post<{ secret: string; webhookUrl: string }>(
      `/instruments/${instrumentId}/webhook-secret`
    ),
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
  updatePositionProtection: (
    symbol: string,
    brokerType: BrokerType,
    payload: {
      contractId: string;
      stopLoss?: number | null;
      takeProfit?: number | null;
    }
  ) =>
    apiClient.post<{ success: boolean; result: unknown }>(
      `/instruments/${symbol}/position-protection?brokerType=${encodeURIComponent(brokerType)}`,
      payload
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
