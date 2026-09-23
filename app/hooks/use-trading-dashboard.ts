import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { CapitalMarket, DerivAccountRow } from '../api-client';
import {
  ApiError,
  tradingAPI,
  type InstrumentConfig,
  type InstrumentState,
  type TokenStatus,
} from '../api-client';
import { extractErrorMessage } from '../lib/format';
import { DEFAULT_NEW_INSTRUMENT } from '../lib/trading-constants';

export type LoginForm = {
  email: string;
  password: string;
};

export type CreateUserForm = {
  email: string;
  password: string;
  role: 'user' | 'admin';
  generatePassword: boolean;
};

const poll = {
  refetchIntervalInBackground: true,
  refetchOnReconnect: true,
};

function useTradingDashboardInternal() {
  const [instrumentPollMs, setInstrumentPollMs] = useState<number>(8000);
  const queryClient = useQueryClient();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [tokenInput, setTokenInput] = useState('');
  const [capitalCredentials, setCapitalCredentials] = useState({
    apiKey: '',
    identifier: '',
    password: '',
    accountType: 'demo',
  });
  const [newInstrument, setNewInstrument] = useState<InstrumentConfig>(
    DEFAULT_NEW_INSTRUMENT
  );
  const [showAddInstrument, setShowAddInstrument] = useState(false);
  const [derivAccounts, setDerivAccounts] = useState<DerivAccountRow[] | null>(
    null
  );
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    role: 'user',
    generatePassword: true,
  });

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await tradingAPI.getCurrentUser()).data.user,
    retry: false,
    refetchOnWindowFocus: false,
    ...poll,
  });

  const currentUser = meQuery.data ?? null;
  const isAdmin = currentUser?.role === 'admin';

  const healthQuery = useQuery({
    queryKey: ['dashboard', 'health'],
    queryFn: async () => (await tradingAPI.getHealth()).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const tokenQuery = useQuery({
    queryKey: ['dashboard', 'token'],
    queryFn: async () => (await tradingAPI.getTokenStatus()).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const capitalMarketsQuery = useQuery({
    queryKey: ['dashboard', 'capital-markets'],
    queryFn: async () => (await tradingAPI.getCapitalMarkets()).data.markets,
    enabled: !!currentUser && !!tokenQuery.data?.capitalConfigured,
    staleTime: 60000,
    retry: false,
    ...poll,
  });

  const fetchDerivAccounts = async () => {
    const data = (await tradingAPI.getDerivAccounts()).data;
    const rows: DerivAccountRow[] = data?.data || [];
    setDerivAccounts(rows);
    return rows;
  };

  const instrumentsQuery = useQuery({
    queryKey: ['dashboard', 'instruments'],
    queryFn: async () => (await tradingAPI.getInstruments()).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const logsQuery = useQuery({
    queryKey: ['dashboard', 'logs'],
    queryFn: async () => (await tradingAPI.getLogs(20)).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const logSummaryQuery = useQuery({
    queryKey: ['dashboard', 'log-summary'],
    queryFn: async () => (await tradingAPI.getLogsSummary()).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const analyticsQuery = useQuery({
    queryKey: ['dashboard', 'analytics'],
    queryFn: async () =>
      (await tradingAPI.getAnalyticsSummary({ limit: 50 })).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const [tradesPage, setTradesPage] = useState<number>(1);
  const [tradesPageSize, setTradesPageSize] = useState<number>(14);

  const analyticsQueryWithPage = useQuery({
    queryKey: ['dashboard', 'analytics', tradesPage, tradesPageSize],
    queryFn: async () =>
      (
        await tradingAPI.getAnalyticsSummary({
          limit: 200,
          page: tradesPage,
          pageSize: tradesPageSize,
        })
      ).data,
    enabled: !!currentUser,
    refetchInterval: 5000,
    ...poll,
  });

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => (await tradingAPI.getAdminUsers()).data,
    enabled: isAdmin,
    refetchInterval: 5000,
    ...poll,
  });

  const instrumentStateQueries = useQueries({
    queries: (instrumentsQuery.data || []).map((instrument) => ({
      queryKey: [
        'dashboard',
        'instrument-state',
        instrument.brokerType ?? 'deriv_ws',
        instrument.symbol,
      ],
      queryFn: async () =>
        (
          await tradingAPI.getInstrumentState(
            instrument.symbol,
            instrument.brokerType ?? 'deriv_ws'
          )
        ).data,
      enabled: !!currentUser,
      refetchInterval: instrumentPollMs,
      placeholderData: (previousData: InstrumentState | undefined) =>
        previousData,
      ...poll,
    })),
  });

  const instrumentStates: InstrumentState[] = (instrumentsQuery.data || []).map(
    (cfg, index) => {
      const live = instrumentStateQueries[index]?.data;
      if (live) return live;
      return {
        symbol: cfg.symbol,
        config: cfg,
        signal: null,
        openPosition: null,
        recentTrades: [],
      };
    }
  );

  const instrumentStateMeta = (instrumentsQuery.data || []).map((_, index) => ({
    isFetching: instrumentStateQueries[index]?.isFetching ?? false,
    isError: instrumentStateQueries[index]?.isError ?? false,
    errorMessage: instrumentStateQueries[index]?.error
      ? String(instrumentStateQueries[index]?.error)
      : null,
    errorStatusCode:
      instrumentStateQueries[index]?.error instanceof ApiError
        ? instrumentStateQueries[index]?.error.statusCode
        : null,
    dataUpdatedAt: instrumentStateQueries[index]?.dataUpdatedAt ?? 0,
  }));

  const refreshAll = async () => {
    setGlobalError(null);
    setGlobalSuccess('Dashboard refreshed successfully');
    setTimeout(() => setGlobalSuccess(null), 3000);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['admin'] }),
    ]);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['auth'] }),
      queryClient.refetchQueries({ queryKey: ['dashboard'] }),
      queryClient.refetchQueries({ queryKey: ['admin'] }),
    ]);
  };

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginForm) =>
      (await tradingAPI.login(payload)).data,
    onSuccess: async () => {
      setGlobalError(null);
      setLoginForm({ email: '', password: '' });
      await refreshAll();
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => (await tradingAPI.logout()).data,
    onSuccess: () => {
      queryClient.clear();
      window.location.reload();
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const saveTokenMutation = useMutation({
    mutationFn: async (payload: {
      derivToken?: string;
      capitalApiKey?: string;
      capitalIdentifier?: string;
      capitalPassword?: string;
      capitalAccountType?: string;
      preferredDerivAccountId?: string;
    }) => (await tradingAPI.saveToken(payload)).data,
    onSuccess: async (_data, variables) => {
      setTokenInput('');
      setCapitalCredentials({
        apiKey: '',
        identifier: '',
        password: '',
        accountType: 'demo',
      });
      setGlobalError(null);
      const preferredId = variables?.preferredDerivAccountId;
      if (preferredId) {
        setGlobalSuccess('Preferred Deriv account saved — waiting for daemon');
        // Poll token status to see when runtime connects to preferred account
        const maxAttempts = 8;
        let attempt = 0;
        const pollInterval = 2000;
        const check = async () => {
          attempt += 1;
          try {
            const status = (await tradingAPI.getTokenStatus())
              .data as TokenStatus;
            if (status?.runtimeConnected?.accountId === preferredId) {
              setGlobalSuccess('Daemon connected to preferred Deriv account');
              setTimeout(() => setGlobalSuccess(null), 3000);
              return;
            }
          } catch (e) {
            // ignore
          }
          if (attempt < maxAttempts) {
            setTimeout(check, pollInterval);
          } else {
            setGlobalError('Daemon not yet connected to preferred account');
            setTimeout(() => setGlobalError(null), 5000);
            setGlobalSuccess(null);
          }
        };
        void check();
      } else {
        const msg = 'Broker credentials saved successfully';
        setGlobalSuccess(msg);
        setTimeout(() => setGlobalSuccess(null), 3000);
      }
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'token'] });
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'token'] });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async () => (await tradingAPI.deleteToken()).data,
    onSuccess: async () => {
      setGlobalError(null);
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'token'] });
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'token'] });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const addInstrumentMutation = useMutation({
    mutationFn: async (payload: InstrumentConfig) =>
      (await tradingAPI.addInstrument(payload)).data,
    onSuccess: async (_data, variables) => {
      setShowAddInstrument(false);
      setNewInstrument(DEFAULT_NEW_INSTRUMENT);
      setGlobalError(null);
      setGlobalSuccess(`Instrument ${variables.symbol} added successfully`);
      setTimeout(() => setGlobalSuccess(null), 3000);
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const updateInstrumentMutation = useMutation({
    mutationFn: async ({
      symbol,
      updates,
    }: {
      symbol: string;
      updates: Partial<InstrumentConfig>;
    }) => {
      const instrument = (instrumentsQuery.data || []).find(
        (item) => item.symbol === symbol
      );
      return (
        await tradingAPI.updateInstrument(
          symbol,
          updates,
          instrument?.brokerType ?? 'deriv_ws'
        )
      ).data;
    },
    onSuccess: async (_data, { symbol }) => {
      setGlobalError(null);
      setGlobalSuccess(`Instrument ${symbol} updated`);
      setTimeout(() => setGlobalSuccess(null), 3000);
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const toggleInstrumentMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const instrument = (instrumentsQuery.data || []).find(
        (item) => item.symbol === symbol
      );
      return (
        await tradingAPI.toggleInstrument(
          symbol,
          instrument?.brokerType ?? 'deriv_ws'
        )
      ).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const closePositionMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const instrument = (instrumentsQuery.data || []).find(
        (item) => item.symbol === symbol
      );
      return (
        await tradingAPI.closeInstrumentPosition(
          symbol,
          instrument?.brokerType ?? 'deriv_ws'
        )
      ).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'logs'] });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'logs'] });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const removeInstrumentMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const instrument = (instrumentsQuery.data || []).find(
        (item) => item.symbol === symbol
      );
      return (
        await tradingAPI.removeInstrument(
          symbol,
          instrument?.brokerType ?? 'deriv_ws'
        )
      ).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instruments'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'instrument-state'],
      });
      await queryClient.refetchQueries({
        queryKey: ['dashboard', 'instruments'],
      });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const createUserMutation = useMutation({
    mutationFn: async (payload: CreateUserForm) =>
      (
        await tradingAPI.createAdminUser({
          email: payload.email,
          password: payload.password,
          role: payload.role,
          generatePassword: payload.generatePassword,
        })
      ).data,
    onSuccess: async (data) => {
      setCreateUserForm({
        email: '',
        password: '',
        role: 'user',
        generatePassword: true,
      });
      setGlobalError(null);
      setGlobalSuccess(
        data.generatedPassword
          ? `User created successfully. Temporary password: ${data.generatedPassword}`
          : 'User created successfully'
      );
      setTimeout(() => setGlobalSuccess(null), 5000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'health'],
      });
      await queryClient.refetchQueries({ queryKey: ['admin', 'users'] });
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'health'] });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      userId,
      password,
    }: {
      userId: string;
      password: string;
    }) => (await tradingAPI.resetAdminUserPassword(userId, password)).data,
    onSuccess: async () => {
      setGlobalError(null);
      setGlobalSuccess('Password updated successfully');
      setTimeout(() => setGlobalSuccess(null), 3000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.refetchQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) =>
      (await tradingAPI.deleteAdminUser(userId)).data,
    onSuccess: async (_data, userId) => {
      setGlobalError(null);
      setGlobalSuccess(`User ${userId} removed successfully`);
      setTimeout(() => setGlobalSuccess(null), 3000);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'health'],
      });
      await queryClient.refetchQueries({ queryKey: ['admin', 'users'] });
      await queryClient.refetchQueries({ queryKey: ['dashboard', 'health'] });
    },
    onError: (error) => setGlobalError(extractErrorMessage(error)),
  });

  const activeInstrumentCount = useMemo(
    () =>
      instrumentStates.filter((instrument) => instrument.config.enabled).length,
    [instrumentStates]
  );

  const openPositionCount = useMemo(
    () =>
      instrumentStates.filter((instrument) => instrument.openPosition).length,
    [instrumentStates]
  );

  const userCount = healthQuery.data?.trading.users ?? 0;
  const health = healthQuery.data;
  const logs = logsQuery.data || [];
  const analytics = analyticsQueryWithPage.data || analyticsQuery.data;
  const logSummary = logSummaryQuery.data;
  const tokenStatus = tokenQuery.data;
  const adminUsers = usersQuery.data || [];

  const anyInstrumentFetching = instrumentStateMeta.some((m) => m.isFetching);

  return {
    meQuery,
    currentUser,
    isAdmin,
    healthQuery,
    tokenQuery,
    instrumentsQuery,
    logsQuery,
    logSummaryQuery,
    analyticsQuery,
    usersQuery,
    instrumentStateQueries,
    instrumentStates,
    instrumentStateMeta,
    anyInstrumentFetching,
    refreshAll,
    globalError,
    globalSuccess,
    loginForm,
    setLoginForm,
    tokenInput,
    setTokenInput,
    capitalCredentials,
    setCapitalCredentials,
    newInstrument,
    setNewInstrument,
    showAddInstrument,
    setShowAddInstrument,
    createUserForm,
    setCreateUserForm,
    loginMutation,
    logoutMutation,
    saveTokenMutation,
    deleteTokenMutation,
    addInstrumentMutation,
    updateInstrumentMutation,
    toggleInstrumentMutation,
    closePositionMutation,
    removeInstrumentMutation,
    createUserMutation,
    resetPasswordMutation,
    deleteUserMutation,
    activeInstrumentCount,
    openPositionCount,
    userCount,
    health,
    logs,
    analytics,
    tradesPage,
    setTradesPage,
    tradesPageSize,
    setTradesPageSize,
    logSummary,
    tokenStatus,
    capitalMarkets: (capitalMarketsQuery.data || []) as CapitalMarket[],
    adminUsers,
    instrumentPollMs,
    setInstrumentPollMs,
    derivAccounts,
    fetchDerivAccounts,
  };
}

export const useTradingDashboard = useTradingDashboardInternal;
export type TradingDashboard = ReturnType<typeof useTradingDashboardInternal>;
