'use client';

import { useState } from 'react';
import type {
  AdminUser,
  AnalyticsSummary,
  DerivAccountRow,
  LogEntry,
  LogSummary,
} from '../../api-client';
import type { TradingDashboard } from '../../hooks/use-trading-dashboard';
import { formatDate, formatMoney } from '../../lib/format';
import {
  ASSET_CLASS_OPTIONS,
  BROKER_OPTIONS,
  SYMBOL_OPTIONS_BY_BROKER_AND_CLASS,
  TIMEFRAME_OPTIONS_BY_BROKER,
} from '../../lib/trading-constants';
import { InstrumentBoard } from './instrument-board';
import {
  Alert,
  ButtonGhost,
  ButtonPrimary,
  Kpi,
  MiniStat,
  NavItem,
  NumberField,
  Panel,
  SelectField,
  TextField,
  Tooltip,
} from './ui-primitives';

type MainSection = 'overview' | 'token' | 'performance' | 'activity' | 'admin';

export function DashboardApp(d: TradingDashboard) {
  const [section, setSection] = useState<MainSection>('overview');
  const [showDerivAccountsModal, setShowDerivAccountsModal] = useState(false);
  const [isCheckingAccounts, setIsCheckingAccounts] = useState(false);
  const {
    currentUser,
    isAdmin,
    refreshAll,
    logoutMutation,
    globalError,
    globalSuccess,
    health,
    tokenStatus,
    capitalMarkets,
    tokenInput,
    setTokenInput,
    capitalCredentials,
    setCapitalCredentials,
    saveTokenMutation,
    deleteTokenMutation,
    instrumentStates,
    instrumentStateMeta,
    anyInstrumentFetching,
    showAddInstrument,
    setShowAddInstrument,
    newInstrument,
    setNewInstrument,
    addInstrumentMutation,
    addDefaultsMutation,
    updateInstrumentMutation,
    toggleInstrumentMutation,
    closePositionMutation,
    removeInstrumentMutation,
    analytics,
    logSummary,
    logs,
    activeInstrumentCount,
    openPositionCount,
    userCount,
    createUserForm,
    setCreateUserForm,
    createUserMutation,
    resetPasswordMutation,
    deleteUserMutation,
    adminUsers,
    derivAccounts,
    fetchDerivAccounts,
  } = d;

  const busyInstrument =
    toggleInstrumentMutation.isPending ||
    closePositionMutation.isPending ||
    removeInstrumentMutation.isPending;

  const preferredDerivAccountId = tokenStatus?.preferredDerivAccountId ?? null;
  const connectedDerivAccountId =
    tokenStatus?.runtimeConnected?.accountId ?? null;
  const derivAccountStatusText = !preferredDerivAccountId
    ? 'No Deriv account selected'
    : connectedDerivAccountId === preferredDerivAccountId
      ? 'Using selected account'
      : 'Selected account pending reconnect';

  const newInstrumentBroker = newInstrument.brokerType ?? 'deriv_ws';
  const newInstrumentAssetClass =
    newInstrument.assetClass ??
    (newInstrumentBroker === 'capital' ? 'Forex' : 'Synthetic Indices');
  const capitalSymbols = capitalMarkets
    .filter((market) => {
      const type = String(market.instrumentType || '').toUpperCase();
      if (newInstrumentAssetClass === 'Forex') return type === 'CURRENCIES';
      if (newInstrumentAssetClass === 'Commodities')
        return type === 'COMMODITIES';
      if (newInstrumentAssetClass === 'Indices') return type === 'INDICES';
      if (newInstrumentAssetClass === 'Stocks') return type === 'SHARES';
      if (newInstrumentAssetClass === 'Crypto')
        return type === 'CRYPTOCURRENCIES';
      return false;
    })
    .map((market) => market.epic)
    .filter(Boolean);
  const defaultInstrumentSymbols =
    newInstrumentBroker === 'capital'
      ? capitalSymbols
      : (SYMBOL_OPTIONS_BY_BROKER_AND_CLASS.deriv_ws['Synthetic Indices'] ??
        []);
  const newInstrumentSymbols =
    newInstrumentBroker === 'capital'
      ? capitalSymbols
      : (SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[newInstrumentBroker]?.[
          newInstrumentAssetClass
        ] ?? defaultInstrumentSymbols);

  return (
    <div className='flex min-h-screen bg-background text-foreground'>
      <aside className='hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar py-6 pl-4 pr-3 md:flex'>
        <p className='px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
          Menu
        </p>
        <nav className='mt-4 flex flex-col gap-1'>
          <NavItem
            active={section === 'overview'}
            onClick={() => setSection('overview')}
          >
            Overview
          </NavItem>
          <NavItem
            active={section === 'token'}
            onClick={() => setSection('token')}
          >
            Token
          </NavItem>
          <NavItem
            active={section === 'performance'}
            onClick={() => setSection('performance')}
          >
            Performance
          </NavItem>
          <NavItem
            active={section === 'activity'}
            onClick={() => setSection('activity')}
          >
            Activity
          </NavItem>
          {isAdmin ? (
            <NavItem
              active={section === 'admin'}
              onClick={() => setSection('admin')}
            >
              Admin
            </NavItem>
          ) : null}
        </nav>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur'>
          <div className='flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8'>
            <div>
              <p className='text-xs font-medium text-muted-foreground'>
                {isAdmin ? 'Administrator' : 'Trader'}
              </p>
              <h1 className='text-xl font-semibold tracking-tight'>
                {currentUser?.email}
              </h1>
              <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                <span className='rounded-md bg-muted px-2 py-0.5 font-medium text-foreground/80'>
                  {currentUser?.role}
                </span>
                {anyInstrumentFetching ? (
                  <span className='flex items-center gap-1'>
                    <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-primary' />
                    Updating live quotes…
                  </span>
                ) : null}
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <ButtonGhost onClick={() => refreshAll()} className='text-sm'>
                Refresh all
              </ButtonGhost>

              <Tooltip
                content={
                  <span>Toggle live updates: 1s (Live ON) / 8s (Live OFF)</span>
                }
              >
                <ButtonGhost
                  onClick={() =>
                    // toggle between 1s live updates and 8s low-frequency
                    d.setInstrumentPollMs?.(
                      d.instrumentPollMs === 1000 ? 8000 : 1000
                    )
                  }
                  className='text-sm'
                >
                  {d.instrumentPollMs === 1000 ? 'Live: ON' : 'Live: OFF'}
                </ButtonGhost>
              </Tooltip>
              <ButtonGhost
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
                className='text-sm'
              >
                {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
              </ButtonGhost>
            </div>
          </div>

          <div className='flex gap-1 overflow-x-auto border-t border-border px-4 py-2 md:hidden'>
            {(
              [
                ['overview', 'Overview'],
                ['token', 'Token'],
                ['performance', 'Stats'],
                ['activity', 'Logs'],
                ...(isAdmin ? [['admin', 'Admin']] : []),
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type='button'
                onClick={() => setSection(id as MainSection)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  section === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <main className='flex-1 space-y-6 px-4 py-6 md:px-8'>
          {globalError && <Alert tone='error'>{globalError}</Alert>}
          {globalSuccess && <Alert tone='success'>{globalSuccess}</Alert>}

          {section === 'overview' && (
            <>
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <Kpi
                  label={isAdmin ? 'Users' : 'Instruments'}
                  value={isAdmin ? userCount : instrumentStates.length}
                  hint={isAdmin ? 'In this deployment' : 'Configured symbols'}
                />
                <Kpi
                  label='Active'
                  value={activeInstrumentCount}
                  hint='Automation enabled'
                />
                <Kpi
                  label='Open positions'
                  value={openPositionCount}
                  hint='From Deriv portfolio'
                />
                <Kpi
                  label='Net P/L'
                  value={analytics ? formatMoney(analytics.netProfit) : '—'}
                  hint='Closed trades'
                />
              </div>

              <Panel title='Connection & account'>
                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                  <MiniStat
                    label='MongoDB'
                    value={health?.mongo.connected ? 'OK' : 'Down'}
                  />
                  <MiniStat
                    label='Token'
                    value={
                      tokenStatus?.configured
                        ? `Deriv ••••${tokenStatus.tokenLast4}`
                        : 'Not set'
                    }
                  />
                  <MiniStat
                    label='Trades (log)'
                    value={String(logSummary?.totalTrades ?? 0)}
                  />
                  <MiniStat
                    label='Win rate'
                    value={
                      analytics
                        ? `${(analytics.winRate * 100).toFixed(1)}%`
                        : '—'
                    }
                  />
                  <MiniStat
                    label='Open (log)'
                    value={String(logSummary?.openTrades ?? 0)}
                  />
                </div>

                <div className='mt-4 rounded-xl border border-border bg-background/50 p-4'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <p className='text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground'>
                        Deriv selection
                      </p>
                      <p className='mt-1 text-sm text-foreground'>
                        {derivAccountStatusText}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                        connectedDerivAccountId === preferredDerivAccountId &&
                        preferredDerivAccountId
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {preferredDerivAccountId
                        ? connectedDerivAccountId === preferredDerivAccountId
                          ? 'Match'
                          : 'Waiting'
                        : 'No selection'}
                    </span>
                  </div>

                  <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    <div className='rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3'>
                      <p className='text-[10px] uppercase tracking-[0.12em] text-emerald-300/80'>
                        Selected
                      </p>
                      <p className='mt-1 text-base font-semibold text-emerald-200'>
                        {preferredDerivAccountId ?? 'Not selected'}
                      </p>
                    </div>
                    <div className='rounded-lg border border-amber-500/20 bg-amber-500/5 p-3'>
                      <p className='text-[10px] uppercase tracking-[0.12em] text-amber-300/80'>
                        Connected
                      </p>
                      <p className='mt-1 text-base font-semibold text-amber-200'>
                        {connectedDerivAccountId ?? 'Not connected'}
                      </p>
                    </div>
                  </div>
                </div>
              </Panel>

              <div className='mt-4'>
                <button
                  type='button'
                  onClick={async () => {
                    try {
                      await fetchDerivAccounts();
                      setShowDerivAccountsModal(true);
                    } catch (e) {
                      // ignore
                    }
                  }}
                  className='rounded-md border px-3 py-2 text-sm'
                >
                  Check accounts
                </button>
              </div>

              <Panel
                title='Instruments'
                actions={
                  <div className='flex flex-wrap gap-2'>
                    <ButtonPrimary
                      className='px-3 py-2 text-xs'
                      onClick={() => setShowAddInstrument((prev) => !prev)}
                    >
                      {showAddInstrument ? 'Hide form' : 'Add instrument'}
                    </ButtonPrimary>
                    <ButtonGhost
                      className='px-3 py-2 text-xs'
                      disabled={addDefaultsMutation.isPending}
                      onClick={() => addDefaultsMutation.mutate()}
                    >
                      {addDefaultsMutation.isPending
                        ? 'Adding…'
                        : 'Add defaults'}
                    </ButtonGhost>
                  </div>
                }
              >
                {showAddInstrument && (
                  <div className='mb-6 grid gap-3 rounded-xl border border-border bg-background/50 p-4 md:grid-cols-2 xl:grid-cols-4'>
                    <SelectField
                      label='Broker'
                      value={newInstrumentBroker}
                      onChange={(value) => {
                        const nextBroker = value as 'deriv_ws' | 'capital';
                        const fallbackAsset = 'Synthetic Indices';
                        const nextAsset =
                          nextBroker === 'capital' ? 'Forex' : fallbackAsset;
                        const nextTimeFrame =
                          TIMEFRAME_OPTIONS_BY_BROKER[nextBroker][0].value;
                        const brokerSymbols =
                          SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[nextBroker] ?? {};
                        const symbols =
                          nextBroker === 'capital'
                            ? capitalMarkets
                                .filter(
                                  (market) =>
                                    String(
                                      market.instrumentType || ''
                                    ).toUpperCase() === 'CURRENCIES'
                                )
                                .map((market) => market.epic)
                            : (brokerSymbols[nextAsset] ??
                              SYMBOL_OPTIONS_BY_BROKER_AND_CLASS.deriv_ws[
                                'Synthetic Indices'
                              ] ??
                              []);

                        setNewInstrument((prev) => ({
                          ...prev,
                          brokerType: nextBroker,
                          assetClass: nextAsset,
                          symbol: symbols[0] ?? prev.symbol,
                          timeFrame: nextTimeFrame,
                          positionSize:
                            nextBroker === 'capital' ? 100 : prev.positionSize,
                        }));
                      }}
                      options={BROKER_OPTIONS.map((b) => ({
                        value: b.value,
                        label: b.label,
                      }))}
                    />
                    <SelectField
                      label='Asset class'
                      value={newInstrumentAssetClass}
                      onChange={(value) => {
                        const nextAsset = value as
                          | 'Synthetic Indices'
                          | 'Forex'
                          | 'Stocks'
                          | 'Commodities'
                          | 'Indices'
                          | 'Crypto';
                        const brokerSymbols =
                          SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[
                            newInstrumentBroker
                          ] ?? {};
                        const symbols =
                          newInstrumentBroker === 'capital'
                            ? capitalMarkets
                                .filter((market) => {
                                  const type = String(
                                    market.instrumentType || ''
                                  ).toUpperCase();
                                  if (nextAsset === 'Forex')
                                    return type === 'CURRENCIES';
                                  if (nextAsset === 'Commodities')
                                    return type === 'COMMODITIES';
                                  if (nextAsset === 'Indices')
                                    return type === 'INDICES';
                                  if (nextAsset === 'Stocks')
                                    return type === 'SHARES';
                                  if (nextAsset === 'Crypto')
                                    return type === 'CRYPTOCURRENCIES';
                                  return false;
                                })
                                .map((market) => market.epic)
                            : (brokerSymbols[nextAsset] ??
                              SYMBOL_OPTIONS_BY_BROKER_AND_CLASS.deriv_ws[
                                'Synthetic Indices'
                              ] ??
                              []);

                        setNewInstrument((prev) => ({
                          ...prev,
                          assetClass: nextAsset,
                          symbol: symbols[0] ?? prev.symbol,
                        }));
                      }}
                      options={ASSET_CLASS_OPTIONS.map((a) => ({
                        value: a.value,
                        label: a.label,
                      }))}
                    />
                    <SelectField
                      label='Symbol'
                      value={newInstrument.symbol}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({ ...prev, symbol: value }))
                      }
                      options={newInstrumentSymbols.map((s) => ({
                        value: s,
                        label: s,
                      }))}
                    />
                    <NumberField
                      label='Short EMA'
                      value={newInstrument.shortEmaPeriod}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          shortEmaPeriod: value,
                        }))
                      }
                    />
                    <NumberField
                      label='Long EMA'
                      value={newInstrument.longEmaPeriod}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          longEmaPeriod: value,
                        }))
                      }
                    />
                    <SelectField
                      label='Timeframe'
                      value={newInstrument.timeFrame}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          timeFrame: value,
                        }))
                      }
                      options={[
                        ...TIMEFRAME_OPTIONS_BY_BROKER[newInstrumentBroker],
                      ]}
                    />
                    <NumberField
                      label='History depth'
                      value={newInstrument.historyDepth}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          historyDepth: value,
                        }))
                      }
                    />
                    <NumberField
                      label={
                        newInstrumentBroker === 'capital'
                          ? 'Size (units)'
                          : 'Stake'
                      }
                      value={newInstrument.positionSize}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          positionSize: value,
                        }))
                      }
                    />
                    <SelectField
                      label='Execution mode'
                      value={newInstrument.strategy ?? 'fixed_isolated_stake'}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          strategy: value as 'fixed_isolated_stake',
                        }))
                      }
                      options={[
                        {
                          value: 'fixed_isolated_stake',
                          label: 'Fixed Stake',
                        },
                      ]}
                    />
                    {newInstrumentBroker !== 'capital' ? (
                      <NumberField
                        label='Multiplier'
                        value={newInstrument.multiplier}
                        onChange={(value) =>
                          setNewInstrument((prev) => ({
                            ...prev,
                            multiplier: value,
                          }))
                        }
                      />
                    ) : null}
                    <NumberField
                      label='Stop loss (USD, 0=off)'
                      value={newInstrument.stopLossAmount ?? 0}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          stopLossAmount: value,
                        }))
                      }
                    />
                    <NumberField
                      label='Take profit (USD, 0=off)'
                      value={newInstrument.takeProfitAmount ?? 0}
                      onChange={(value) =>
                        setNewInstrument((prev) => ({
                          ...prev,
                          takeProfitAmount: value,
                        }))
                      }
                    />
                    <div className='flex items-end md:col-span-2 xl:col-span-4'>
                      <ButtonPrimary
                        className='w-full'
                        disabled={addInstrumentMutation.isPending}
                        onClick={() =>
                          addInstrumentMutation.mutate({
                            ...newInstrument,
                            strategy: 'fixed_isolated_stake',
                          })
                        }
                      >
                        {addInstrumentMutation.isPending ? 'Saving…' : 'Create'}
                      </ButtonPrimary>
                    </div>
                  </div>
                )}

                <InstrumentBoard
                  rows={instrumentStates}
                  meta={instrumentStateMeta}
                  busy={busyInstrument}
                  onToggle={(symbol) => toggleInstrumentMutation.mutate(symbol)}
                  onClose={(symbol) => closePositionMutation.mutate(symbol)}
                  onRemove={(symbol) => removeInstrumentMutation.mutate(symbol)}
                  capitalMarkets={capitalMarkets}
                  onUpdateInstrument={async (
                    symbol,
                    updates
                  ): Promise<void> => {
                    await updateInstrumentMutation.mutateAsync({
                      symbol,
                      updates,
                    });
                  }}
                  updatePendingSymbol={
                    updateInstrumentMutation.isPending
                      ? (updateInstrumentMutation.variables?.symbol ?? null)
                      : null
                  }
                />
              </Panel>
            </>
          )}

          {section === 'token' && (
            <Panel
              title='Broker credentials'
              actions={
                tokenStatus?.configured || tokenStatus?.capitalConfigured ? (
                  <span className='text-xs text-muted-foreground'>
                    Updated {formatDate(tokenStatus.updatedAt)}
                  </span>
                ) : null
              }
            >
              <div className='mb-5 grid gap-3 sm:grid-cols-2'>
                <div className='rounded-xl border border-border bg-background/40 p-3'>
                  <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
                    Deriv
                  </p>
                  <p className='mt-2 text-sm font-medium text-foreground'>
                    {tokenStatus?.configured
                      ? 'Deriv live ready'
                      : 'Deriv not ready'}
                  </p>
                </div>
                <div className='rounded-xl border border-border bg-background/40 p-3'>
                  <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
                    Capital API
                  </p>
                  <p className='mt-2 text-sm font-medium text-foreground'>
                    Capital API configured
                  </p>
                  <p className='mt-1 text-[11px] text-muted-foreground'>
                    Direct API broker path.
                  </p>
                </div>
              </div>

              <div className='grid gap-6 lg:grid-cols-2'>
                <div className='rounded-xl border border-border bg-background/40 p-4'>
                  <h3 className='mb-3 text-sm font-semibold text-foreground'>
                    Deriv
                  </h3>
                  <div className='mb-3 flex items-center gap-2'>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        tokenStatus?.derivConnected
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tokenStatus?.derivConnected
                        ? 'Connected'
                        : 'Not configured'}
                    </span>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Paste a token with trading permissions. It is encrypted and
                    stored per account.
                  </p>
                  <div className='mt-4 space-y-3'>
                    <input
                      type='password'
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder='Deriv API token'
                      className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring'
                    />
                    {tokenStatus?.configured && (
                      <p className='text-xs text-muted-foreground'>
                        Stored token: ••••{tokenStatus.tokenLast4}
                      </p>
                    )}
                  </div>
                </div>

                <div className='rounded-xl border border-border bg-background/40 p-4'>
                  <h3 className='mb-3 text-sm font-semibold text-foreground'>
                    Capital API
                  </h3>
                  <div className='mb-3 flex items-center gap-2'>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        tokenStatus?.capitalConfigured
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {tokenStatus?.capitalConfigured
                        ? 'Configured'
                        : 'Not configured'}
                    </span>
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Store Capital API credentials for the direct broker path.
                    They are encrypted and stored per account.
                  </p>
                  <div className='mt-4 grid gap-3'>
                    <input
                      type='email'
                      value={capitalCredentials.identifier}
                      onChange={(e) =>
                        setCapitalCredentials((prev) => ({
                          ...prev,
                          identifier: e.target.value,
                        }))
                      }
                      placeholder='Capital identifier / email'
                      className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring'
                    />
                    <input
                      type='password'
                      value={capitalCredentials.apiKey}
                      onChange={(e) =>
                        setCapitalCredentials((prev) => ({
                          ...prev,
                          apiKey: e.target.value,
                        }))
                      }
                      placeholder='Capital API key'
                      className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring'
                    />
                    <input
                      type='password'
                      value={capitalCredentials.password}
                      onChange={(e) =>
                        setCapitalCredentials((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder='Capital password / secret'
                      className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring'
                    />
                    <select
                      value={capitalCredentials.accountType}
                      onChange={(e) =>
                        setCapitalCredentials((prev) => ({
                          ...prev,
                          accountType: e.target.value,
                        }))
                      }
                      className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring'
                    >
                      <option value='demo'>Demo</option>
                      <option value='live'>Live</option>
                    </select>
                    {tokenStatus?.capitalConfigured && (
                      <p className='text-xs text-muted-foreground'>
                        Stored Capital key: ••••{tokenStatus.capitalApiKeyLast4}
                        {tokenStatus.capitalAccountType
                          ? ` • ${tokenStatus.capitalAccountType}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className='mt-5 flex flex-wrap gap-2'>
                <ButtonPrimary
                  disabled={
                    (!tokenInput &&
                      !capitalCredentials.apiKey &&
                      !capitalCredentials.identifier &&
                      !capitalCredentials.password) ||
                    saveTokenMutation.isPending
                  }
                  onClick={() =>
                    saveTokenMutation.mutate({
                      derivToken: tokenInput.trim() || undefined,
                      capitalApiKey:
                        capitalCredentials.apiKey.trim() || undefined,
                      capitalIdentifier:
                        capitalCredentials.identifier.trim() || undefined,
                      capitalPassword:
                        capitalCredentials.password.trim() || undefined,
                      capitalAccountType: capitalCredentials.accountType,
                    })
                  }
                >
                  {saveTokenMutation.isPending ? 'Saving…' : 'Save credentials'}
                </ButtonPrimary>
                <ButtonGhost
                  disabled={
                    (!tokenStatus?.configured &&
                      !tokenStatus?.capitalConfigured) ||
                    deleteTokenMutation.isPending
                  }
                  onClick={() => deleteTokenMutation.mutate()}
                >
                  Remove all
                </ButtonGhost>
              </div>
              <div className='mt-4'>
                <button
                  type='button'
                  disabled={isCheckingAccounts}
                  onClick={async () => {
                    try {
                      setIsCheckingAccounts(true);
                      await fetchDerivAccounts();
                      setShowDerivAccountsModal(true);
                    } catch (e) {
                      // ignore
                    } finally {
                      setIsCheckingAccounts(false);
                    }
                  }}
                  className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {isCheckingAccounts ? (
                    <>
                      <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                      Checking…
                    </>
                  ) : (
                    'Check accounts'
                  )}
                </button>
              </div>
            </Panel>
          )}

          {/* Accounts modal (simple) */}
          {/* keep modal next to overview for visibility */}
          {section === 'overview' && showDerivAccountsModal && (
            <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
              <div className='w-full max-w-2xl rounded-lg bg-card p-6'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-lg font-semibold'>Deriv accounts</h3>
                  <button
                    onClick={() => {
                      setShowDerivAccountsModal(false);
                    }}
                    className='text-sm text-muted-foreground'
                  >
                    Close
                  </button>
                </div>
                <div className='mt-4 space-y-3'>
                  {isCheckingAccounts ? (
                    <div className='flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground'>
                      <span className='inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent' />
                      Loading Deriv accounts…
                    </div>
                  ) : (derivAccounts || []).length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      No accounts found.
                    </p>
                  ) : (
                    (derivAccounts ?? []).map((a: DerivAccountRow) => {
                      const isCurrent =
                        a.account_id === tokenStatus?.preferredDerivAccountId;
                      const isConnected =
                        a.account_id ===
                        tokenStatus?.runtimeConnected?.accountId;
                      return (
                        <div
                          key={a.account_id}
                          className={`flex items-center justify-between rounded-lg p-3 border ${
                            isCurrent
                              ? 'border-emerald-400 bg-emerald-600/5'
                              : 'border-border'
                          }`}
                        >
                          <div>
                            <p className='font-medium flex items-center gap-3'>
                              <span>{a.account_id}</span>
                              <span className='text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground'>
                                {a.account_type}
                              </span>
                              {isCurrent && (
                                <span className='ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400'>
                                  <svg
                                    width='12'
                                    height='12'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    xmlns='http://www.w3.org/2000/svg'
                                  >
                                    <path
                                      d='M20 6L9 17l-5-5'
                                      stroke='currentColor'
                                      strokeWidth='2'
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                    />
                                  </svg>
                                  Preferred
                                </span>
                              )}
                              {isConnected && (
                                <span className='ml-2 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400'>
                                  <svg
                                    width='12'
                                    height='12'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    xmlns='http://www.w3.org/2000/svg'
                                  >
                                    <circle
                                      cx='12'
                                      cy='12'
                                      r='6'
                                      stroke='currentColor'
                                      strokeWidth='2'
                                    />
                                  </svg>
                                  Connected
                                </span>
                              )}
                            </p>
                            <p className='text-xs text-muted-foreground mt-1'>
                              Balance: {a.balance} {a.currency}
                            </p>
                          </div>
                          <div className='flex gap-2'>
                            <button
                              onClick={() => {
                                if (!isCurrent) {
                                  saveTokenMutation.mutate({
                                    preferredDerivAccountId: a.account_id,
                                  });
                                }
                                setShowDerivAccountsModal(false);
                              }}
                              className={`rounded-md px-3 py-1 text-sm ${isCurrent ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-200'}`}
                            >
                              {isCurrent ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {section === 'performance' && (
            <>
              <Panel title='Analytics snapshot'>
                <AnalyticsPanel analytics={analytics} logSummary={logSummary} />
              </Panel>
              <Panel title='Per-instrument stats'>
                <PerInstrumentTable rows={analytics?.bySymbol || []} />
              </Panel>
              <Panel title='Latest closed trades'>
                <LatestTradesTable
                  rows={analytics?.latest || []}
                  page={d.tradesPage}
                  pageSize={d.tradesPageSize}
                  setPage={d.setTradesPage}
                  total={analytics?.closedTrades ?? null}
                />
              </Panel>
            </>
          )}

          {section === 'activity' && (
            <Panel title='Recent events'>
              <RecentActivityTable rows={logs} />
            </Panel>
          )}

          {section === 'admin' && isAdmin && (
            <div className='grid gap-6 xl:grid-cols-2'>
              <Panel title='System'>
                <div className='grid gap-2 sm:grid-cols-2'>
                  <MiniStat
                    label='Database'
                    value={health?.mongo.connected ? 'Connected' : 'Offline'}
                  />
                  <MiniStat
                    label='Bootstrap admin'
                    value={
                      health?.auth.bootstrapAdminConfigured ? 'OK' : 'Missing'
                    }
                  />
                  <MiniStat
                    label='JWT secret'
                    value={
                      health?.auth.usingFallbackJwtSecret
                        ? 'Fallback'
                        : 'Custom'
                    }
                  />
                  <MiniStat
                    label='Token encryption'
                    value={
                      health?.auth.usingFallbackEncryptionKey
                        ? 'Fallback'
                        : 'Custom'
                    }
                  />
                  <MiniStat
                    label='Instruments (all users)'
                    value={String(health?.trading.totalInstruments ?? 0)}
                  />
                  <MiniStat
                    label='Active (all users)'
                    value={String(health?.trading.activeInstruments ?? 0)}
                  />
                </div>
              </Panel>

              <Panel title='Create user'>
                <div className='space-y-3'>
                  <TextField
                    label='Email'
                    value={createUserForm.email}
                    placeholder='new@example.com'
                    onChange={(value) =>
                      setCreateUserForm((prev) => ({ ...prev, email: value }))
                    }
                  />
                  <label className='flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground'>
                    <input
                      type='checkbox'
                      checked={createUserForm.generatePassword}
                      onChange={(event) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          generatePassword: event.target.checked,
                        }))
                      }
                      className='h-4 w-4 rounded border-input accent-primary'
                    />
                    <span>Generate password automatically</span>
                  </label>
                  {!createUserForm.generatePassword && (
                    <TextField
                      label='Password'
                      type='password'
                      value={createUserForm.password}
                      placeholder='Set a temporary password'
                      onChange={(value) =>
                        setCreateUserForm((prev) => ({
                          ...prev,
                          password: value,
                        }))
                      }
                    />
                  )}
                  <SelectField
                    label='Role'
                    value={createUserForm.role}
                    onChange={(value) =>
                      setCreateUserForm((prev) => ({
                        ...prev,
                        role: value as 'user' | 'admin',
                      }))
                    }
                    options={[
                      { value: 'user', label: 'User' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                  />
                  <ButtonPrimary
                    className='w-full'
                    disabled={createUserMutation.isPending}
                    onClick={() => createUserMutation.mutate(createUserForm)}
                  >
                    {createUserMutation.isPending ? 'Creating…' : 'Create user'}
                  </ButtonPrimary>
                </div>
              </Panel>

              <Panel
                title='Accounts'
                className='xl:col-span-2'
                actions={
                  <span className='text-xs text-muted-foreground'>
                    {adminUsers.length} users
                  </span>
                }
              >
                <div className='space-y-2'>
                  {adminUsers.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>No users.</p>
                  ) : (
                    adminUsers.map((user) => (
                      <AdminUserRow
                        key={user.id}
                        user={user}
                        onDelete={() => deleteUserMutation.mutate(user.id)}
                        deleting={deleteUserMutation.isPending}
                        onResetPassword={(password) =>
                          resetPasswordMutation.mutate({
                            userId: user.id,
                            password,
                          })
                        }
                        resetting={
                          resetPasswordMutation.isPending &&
                          resetPasswordMutation.variables?.userId === user.id
                        }
                      />
                    ))
                  )}
                </div>
              </Panel>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AnalyticsPanel({
  analytics,
  logSummary,
}: {
  analytics?: AnalyticsSummary;
  logSummary?: LogSummary;
}) {
  const ls = logSummary;
  return (
    <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
      <MiniStat label='Total trades' value={String(ls?.totalTrades ?? 0)} />
      <MiniStat label='Open trades' value={String(ls?.openTrades ?? 0)} />
      <MiniStat
        label='Profit factor'
        value={
          analytics?.profitFactor == null
            ? '—'
            : analytics.profitFactor.toFixed(2)
        }
      />
      <MiniStat
        label='Win rate'
        value={analytics ? `${(analytics.winRate * 100).toFixed(1)}%` : '—'}
      />
      <MiniStat
        label='Gross profit'
        value={analytics ? formatMoney(analytics.grossProfit) : '—'}
      />
      <MiniStat
        label='Gross loss'
        value={analytics ? formatMoney(analytics.grossLoss) : '—'}
      />
    </div>
  );
}

function LatestTradesTable({
  rows,
  page,
  pageSize,
  setPage,
  total,
}: {
  rows: AnalyticsSummary['latest'];
  page: number;
  pageSize: number;
  setPage: (n: number) => void;
  total: number | null;
}) {
  if (!rows || rows.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No closed trades yet.</p>
    );
  }
  return (
    <div>
      <div className='overflow-x-auto'>
        <table className='w-full text-left text-sm'>
          <thead className='text-xs text-muted-foreground'>
            <tr>
              <th className='pb-2 font-medium'>Symbol</th>
              <th className='pb-2 font-medium'>Date</th>
              <th className='pb-2 font-medium'>Contract</th>
              <th className='pb-2 text-right font-medium'>Buy</th>
              <th className='pb-2 text-right font-medium'>Sold</th>
              <th className='pb-2 text-right font-medium'>P/L</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {rows.map((row) => (
              <tr key={`${row.contract_id ?? 'na'}-${row.createdAt}`}>
                <td className='py-2.5'>{row.symbol ?? '—'}</td>
                <td className='py-2.5 text-xs text-muted-foreground'>
                  {formatDate(row.createdAt)}
                </td>
                <td className='py-2.5 font-mono text-xs text-muted-foreground'>
                  {row.contract_id ?? '—'}
                </td>
                <td className='py-2.5 text-right tabular-nums'>
                  {formatMoney(row.buy_price)}
                </td>
                <td className='py-2.5 text-right tabular-nums'>
                  {formatMoney(row.sold_for)}
                </td>
                <td
                  className={`py-2.5 text-right font-medium tabular-nums ${
                    (row.profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatMoney(row.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='mt-2 flex items-center justify-between text-sm'>
        <div className='text-muted-foreground'>
          Page {page} {total ? `of ${Math.ceil(total / pageSize)}` : ''}
        </div>
        <div className='flex gap-2'>
          <button
            className='rounded border px-2 py-1 text-xs'
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <button
            className='rounded border px-2 py-1 text-xs'
            onClick={() => setPage(page + 1)}
            disabled={Boolean(total) && page * pageSize >= (total ?? 0)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function PerInstrumentTable({ rows }: { rows: AnalyticsSummary['bySymbol'] }) {
  if (!rows || rows.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>No instrument stats yet.</p>
    );
  }
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-left text-sm'>
        <thead className='text-xs text-muted-foreground'>
          <tr>
            <th className='pb-2 font-medium'>Symbol</th>
            <th className='pb-2 text-right font-medium'>Closed</th>
            <th className='pb-2 text-right font-medium'>Win rate</th>
            <th className='pb-2 text-right font-medium'>Net P/L</th>
            <th className='pb-2 text-right font-medium'>Gross profit</th>
            <th className='pb-2 text-right font-medium'>Gross loss</th>
            <th className='pb-2 text-right font-medium'>Profit factor</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {rows.map((r) => (
            <tr key={String(r.symbol)}>
              <td className='py-2.5'>{r.symbol ?? '—'}</td>
              <td className='py-2.5 text-right tabular-nums'>
                {String(r.closedTrades ?? 0)}
              </td>
              <td className='py-2.5 text-right tabular-nums'>
                {typeof r.winRate === 'number'
                  ? `${(r.winRate * 100).toFixed(1)}%`
                  : '—'}
              </td>
              <td className='py-2.5 text-right tabular-nums'>
                {formatMoney(r.netProfit ?? 0)}
              </td>
              <td className='py-2.5 text-right tabular-nums'>
                {formatMoney(r.grossProfit ?? 0)}
              </td>
              <td className='py-2.5 text-right tabular-nums'>
                {formatMoney(r.grossLoss ?? 0)}
              </td>
              <td className='py-2.5 text-right tabular-nums'>
                {r.profitFactor == null ? '—' : r.profitFactor.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentActivityTable({ rows }: { rows: LogEntry[] }) {
  if (rows.length === 0) {
    return <p className='text-sm text-muted-foreground'>No recent activity.</p>;
  }
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-left text-sm'>
        <thead className='text-xs text-muted-foreground'>
          <tr>
            <th className='pb-2 font-medium'>Type</th>
            <th className='pb-2 font-medium'>Broker</th>
            <th className='pb-2 font-medium'>Time</th>
            <th className='pb-2 font-medium'>Details</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {rows.slice(0, 16).map((row) => (
            <tr key={row._id}>
              <td className='py-2.5'>{row.type}</td>
              <td className='py-2.5'>
                <span
                  className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${
                    row.brokerType === 'capital'
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {row.brokerType === 'capital' ? 'Capital.com' : 'Deriv'}
                </span>
              </td>
              <td className='py-2.5 text-muted-foreground'>
                {formatDate(row.createdAt)}
              </td>
              <td className='max-w-md py-2.5'>
                <code className='break-all text-xs text-muted-foreground'>
                  {JSON.stringify(row).slice(0, 160)}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminUserRow({
  user,
  onDelete,
  deleting,
  onResetPassword,
  resetting,
}: {
  user: AdminUser;
  onDelete?: () => void;
  deleting?: boolean;
  onResetPassword?: (password: string) => void;
  resetting?: boolean;
}) {
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [draftPassword, setDraftPassword] = useState('');

  return (
    <div className='flex flex-col gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <div className='flex items-center gap-2'>
          <p className='font-medium'>{user.email}</p>
          {user.role === 'admin' && (
            <span className='rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-200'>
              Protected
            </span>
          )}
        </div>
        <p className='text-xs text-muted-foreground'>
          {user.role} · joined {formatDate(user.createdAt)}
        </p>
      </div>
      <div className='flex flex-col items-end gap-2'>
        <div className='text-right text-xs text-muted-foreground'>
          <p>
            Token:{' '}
            {user.token.tokenLast4 ? `••••${user.token.tokenLast4}` : '—'}
          </p>
          <p>{formatDate(user.token.tokenUpdatedAt)}</p>
        </div>
        <div className='flex flex-wrap items-center justify-end gap-2'>
          {user.role !== 'admin' && (
            <>
              {showResetPassword ? (
                <>
                  <input
                    type='password'
                    value={draftPassword}
                    onChange={(event) => setDraftPassword(event.target.value)}
                    placeholder='New password'
                    className='w-40 rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  />
                  <button
                    type='button'
                    onClick={() => {
                      const password = draftPassword.trim();
                      if (!password) return;
                      onResetPassword?.(password);
                      setDraftPassword('');
                      setShowResetPassword(false);
                    }}
                    disabled={resetting || !draftPassword.trim()}
                    className='rounded-md bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {resetting ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      setShowResetPassword(false);
                      setDraftPassword('');
                    }}
                    className='rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground'
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type='button'
                  onClick={() => setShowResetPassword(true)}
                  className='rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 transition hover:bg-amber-500/20'
                >
                  Reset password
                </button>
              )}
              <button
                type='button'
                onClick={onDelete}
                disabled={deleting}
                className='rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium text-destructive transition hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
