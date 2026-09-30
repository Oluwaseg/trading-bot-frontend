'use client';

import { useState } from 'react';
import type {
  CapitalMarket,
  InstrumentConfig,
  InstrumentState,
} from '../../api-client';
import {
  ASSET_CLASS_OPTIONS,
  BROKER_OPTIONS,
  SYMBOL_OPTIONS_BY_BROKER_AND_CLASS,
  TIMEFRAME_OPTIONS_BY_BROKER,
} from '../../lib/trading-constants';
import {
  ButtonDangerOutline,
  ButtonGhost,
  ButtonPrimary,
  MiniStat,
  NumberField,
  SelectField,
} from './ui-primitives';

export function InstrumentBoard({
  rows,
  meta,
  busy,
  onToggle,
  onClose,
  onRemove,
  onUpdateInstrument,
  onGenerateWebhook,
  generatingWebhook,
  updatePendingSymbol,
  capitalMarkets,
}: {
  rows: InstrumentState[];
  meta: Array<{
    isFetching: boolean;
    isError: boolean;
    errorMessage?: string | null;
    errorStatusCode?: number | null;
  }>;
  busy: boolean;
  onToggle: (symbol: string) => void;
  onClose: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onUpdateInstrument: (
    symbol: string,
    updates: Partial<InstrumentConfig>
  ) => Promise<void>;
  onGenerateWebhook: (instrumentId: string) => void;
  generatingWebhook: boolean;
  updatePendingSymbol: string | null;
  capitalMarkets: CapitalMarket[];
}) {
  if (rows.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        No instruments yet. Add one from the form above.
      </p>
    );
  }

  return (
    <div className='space-y-3'>
      {rows.map((instrument, index) => (
        <InstrumentRow
          key={instrument.symbol}
          instrument={instrument}
          syncing={meta[index]?.isFetching ?? false}
          failed={meta[index]?.isError ?? false}
          errorMessage={meta[index]?.errorMessage ?? null}
          errorStatusCode={meta[index]?.errorStatusCode ?? null}
          busy={busy}
          updatePending={updatePendingSymbol === instrument.symbol}
          onToggle={() => onToggle(instrument.symbol)}
          onClose={() => onClose(instrument.symbol)}
          onRemove={() => onRemove(instrument.symbol)}
          onSaveEdit={(updates) =>
            onUpdateInstrument(instrument.symbol, updates)
          }
          onGenerateWebhook={() =>
            onGenerateWebhook(instrument.config.id || '')
          }
          generatingWebhook={generatingWebhook}
          capitalMarkets={capitalMarkets}
        />
      ))}
    </div>
  );
}

function InstrumentRow({
  instrument,
  syncing,
  failed,
  errorMessage,
  errorStatusCode,
  busy,
  updatePending,
  onToggle,
  onClose,
  onRemove,
  onSaveEdit,
  onGenerateWebhook,
  generatingWebhook,
  capitalMarkets,
}: {
  instrument: InstrumentState;
  syncing: boolean;
  failed: boolean;
  errorMessage: string | null;
  errorStatusCode: number | null;
  busy: boolean;
  updatePending: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRemove: () => void;
  onSaveEdit: (updates: Partial<InstrumentConfig>) => Promise<void>;
  onGenerateWebhook: () => void;
  generatingWebhook: boolean;
  capitalMarkets: CapitalMarket[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<InstrumentConfig>>({});

  const openEdit = () => {
    const c = instrument.config;
    setDraft({
      brokerType: c.brokerType ?? 'deriv_ws',
      assetClass: c.assetClass ?? 'Synthetic Indices',
      symbol: c.symbol,
      mt5AccountId: c.mt5AccountId ?? null,
      shortEmaPeriod: c.shortEmaPeriod,
      longEmaPeriod: c.longEmaPeriod,
      timeFrame: c.timeFrame,
      historyDepth: c.historyDepth,
      positionSize: c.positionSize,
      strategy: c.strategy ?? 'fixed_isolated_stake',
      recoverySizePerCurrency:
        c.recoverySizePerCurrency ?? (c.brokerType === 'deriv_ws' ? 1 : 0),
      maxRecoverySize:
        c.maxRecoverySize ??
        (c.brokerType === 'deriv_ws'
          ? Math.max(35, c.positionSize)
          : c.positionSize),
      multiplier: c.multiplier,
      stopLossAmount: c.stopLossAmount ?? 0,
      takeProfitAmount: 0,
      trailingStopActivationAmount: c.trailingStopActivationAmount ?? 0,
      trailingStopDistanceAmount: c.trailingStopDistanceAmount ?? 0,
      trailingProfitActivationAmount: c.trailingProfitActivationAmount ?? 0,
      trailingProfitGivebackAmount: c.trailingProfitGivebackAmount ?? 0,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft({});
  };

  const submitEdit = async () => {
    try {
      await onSaveEdit({
        brokerType: draft.brokerType,
        assetClass: draft.assetClass,
        symbol: draft.symbol,
        mt5AccountId:
          draft.mt5AccountId ?? instrument.config.mt5AccountId ?? null,
        shortEmaPeriod: draft.shortEmaPeriod,
        longEmaPeriod: draft.longEmaPeriod,
        timeFrame: draft.timeFrame,
        historyDepth: draft.historyDepth,
        positionSize: draft.positionSize,
        strategy: draft.strategy ?? 'fixed_isolated_stake',
        recoverySizePerCurrency:
          draft.recoverySizePerCurrency ??
          (draft.brokerType === 'deriv_ws' ? 1 : 0),
        maxRecoverySize:
          draft.maxRecoverySize ??
          (draft.brokerType === 'deriv_ws'
            ? Math.max(35, Number(draft.positionSize ?? 10))
            : draft.positionSize),
        multiplier: draft.multiplier,
        stopLossAmount: draft.stopLossAmount,
        takeProfitAmount: 0,
        trailingStopActivationAmount: draft.trailingStopActivationAmount ?? 0,
        trailingStopDistanceAmount: draft.trailingStopDistanceAmount ?? 0,
        trailingProfitActivationAmount:
          draft.trailingProfitActivationAmount ?? 0,
        trailingProfitGivebackAmount: draft.trailingProfitGivebackAmount ?? 0,
      });
      setEditing(false);
      setDraft({});
    } catch {
      /* mutation error: global alert + keep form open */
    }
  };

  const open = instrument.openPosition;
  const trend = instrument.signal?.state ?? '—';
  const signal = instrument.signal?.signal ?? '—';
  const rateLimited =
    !!errorMessage &&
    /rate limit|requests per second|too many requests|429/i.test(errorMessage);
  const marketClosed =
    instrument.config.brokerType === 'capital' &&
    (errorStatusCode === 423 ||
      /market .*closed|trading hours/i.test(errorMessage || ''));
  const strategyLabel =
    instrument.config.strategy === 'fixed_isolated_stake'
      ? 'Fixed Stake'
      : instrument.config.strategy === 'aggressive_single_loss_multiplier'
        ? 'Aggressive Recovery'
        : 'Standard Deficit';

  const strategyBadgeClass = 'bg-slate-500/15 text-slate-200';
  const editBroker =
    draft.brokerType ?? instrument.config.brokerType ?? 'deriv_ws';
  const requestedEditAsset =
    draft.assetClass ?? instrument.config.assetClass ?? 'Synthetic Indices';
  const editAsset =
    (editBroker === 'capital' || editBroker === 'mt5') &&
    requestedEditAsset === 'Synthetic Indices'
      ? 'Forex'
      : requestedEditAsset;
  const capitalSymbols = capitalMarkets
    .filter((market) => {
      const type = String(market.instrumentType || '').toUpperCase();
      if (editAsset === 'Forex') return type === 'CURRENCIES';
      if (editAsset === 'Commodities') return type === 'COMMODITIES';
      if (editAsset === 'Indices') return type === 'INDICES';
      if (editAsset === 'Stocks') return type === 'SHARES';
      if (editAsset === 'Crypto') return type === 'CRYPTOCURRENCIES';
      return false;
    })
    .map((market) => market.epic);
  const editSymbols =
    editBroker === 'capital'
      ? capitalSymbols
      : (SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[editBroker]?.[editAsset] ?? []);
  const editAssetOptions =
    editBroker === 'capital' || editBroker === 'mt5'
      ? ASSET_CLASS_OPTIONS.filter(
          (option) => option.value !== 'Synthetic Indices'
        )
      : ASSET_CLASS_OPTIONS.filter(
          (option) => option.value === 'Synthetic Indices'
        );

  return (
    <div
      className={`rounded-xl border bg-card/60 p-4 transition ${
        open
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h3 className='text-lg font-semibold tracking-tight'>
              {instrument.symbol}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                instrument.config.enabled
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {instrument.config.enabled ? 'Active' : 'Paused'}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${strategyBadgeClass}`}
            >
              {strategyLabel}
            </span>
            {syncing && (
              <span className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
                <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-primary' />
                Syncing
              </span>
            )}
            {rateLimited && (
              <span className='rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200'>
                Rate-limited / Backoff
              </span>
            )}
            {marketClosed && !syncing && (
              <span className='rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200'>
                Market closed
              </span>
            )}
            {!rateLimited && !marketClosed && failed && !syncing && (
              <span className='text-[11px] text-destructive'>
                Live data error
              </span>
            )}
          </div>
          <p className='mt-1 font-mono text-xs text-muted-foreground'>
            EMA {instrument.config.shortEmaPeriod}/
            {instrument.config.longEmaPeriod} • {instrument.config.timeFrame}
          </p>
          {instrument.historyNotice ? (
            <p
              className={`mt-2 text-xs ${
                instrument.historyNotice.tolerated
                  ? 'text-muted-foreground'
                  : 'text-amber-200'
              }`}
            >
              {instrument.historyNotice.message}
            </p>
          ) : null}
          {!open && signal === 'NEUTRAL' && !marketClosed ? (
            <p className='mt-2 text-xs text-muted-foreground'>
              No fresh crossover yet. Monitoring for a BUY or SELL signal.
            </p>
          ) : null}

          <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7'>
            <MiniStat label='Trend' value={trend} />
            <MiniStat label='Signal' value={signal} />
            <MiniStat
              label={
                instrument.config.brokerType === 'capital'
                  ? 'Size'
                  : instrument.config.brokerType === 'mt5'
                    ? 'Volume'
                    : 'Stake'
              }
              value={
                instrument.config.brokerType === 'capital'
                  ? `${instrument.config.positionSize} units`
                  : instrument.config.brokerType === 'mt5'
                    ? `${instrument.config.positionSize} lots`
                    : `$${instrument.config.positionSize}`
              }
            />
            <MiniStat
              label='Strategy'
              value={
                instrument.config.strategy === 'fixed_isolated_stake'
                  ? 'Fixed'
                  : instrument.config.strategy ===
                      'aggressive_single_loss_multiplier'
                    ? 'Aggressive'
                    : 'Standard'
              }
            />
            {instrument.config.brokerType === 'capital' ? (
              <MiniStat label='Sizing' value='Units' />
            ) : (
              <MiniStat
                label='Lev.'
                value={`${instrument.config.multiplier}x`}
              />
            )}
            <MiniStat
              label='Risk settings'
              value={`${instrument.config.stopLossAmount ?? 0} / ${instrument.config.trailingStopDistanceAmount ?? 0} / ${instrument.config.trailingProfitGivebackAmount ?? 0}`}
            />
          </div>

          <div className='mt-4 rounded-lg border border-border/80 bg-background/40 px-3 py-2.5 text-sm'>
            {open ? (
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
                    <span className='font-medium text-foreground'>
                      Open: {open.signal}{' '}
                      {instrument.config.brokerType === 'capital' && open.size
                        ? `${open.size} units @ `
                        : '@ '}
                      {instrument.config.brokerType === 'capital'
                        ? open.buy_price
                        : `$${open.buy_price}`}
                    </span>
                    <span className='font-mono text-xs text-muted-foreground'>
                      #{open.contract_id}
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Loss limit {instrument.config.stopLossAmount || 'off'} ·
                    Trail SL{' '}
                    {instrument.config.trailingStopDistanceAmount || 'off'} ·
                    Trail TP activation{' '}
                    {instrument.config.trailingProfitActivationAmount || 'off'}
                    {instrument.config.trailingProfitGivebackAmount
                      ? ` · giveback ${instrument.config.trailingProfitGivebackAmount}`
                      : ''}
                    {open.profit != null
                      ? ` · P/L ${open.profit >= 0 ? '+' : ''}${Number(open.profit).toFixed(2)}`
                      : ''}
                    {open.bid_price != null
                      ? ` · value ${instrument.config.brokerType === 'capital' ? Number(open.bid_price).toFixed(5) : `$${Number(open.bid_price).toFixed(2)}`}`
                      : ''}
                  </p>
                </div>
                <ButtonPrimary
                  className='bg-destructive text-destructive-foreground hover:opacity-90 sm:shrink-0'
                  disabled={busy || updatePending}
                  onClick={onClose}
                >
                  Sell / close
                </ButtonPrimary>
              </div>
            ) : (
              <span className='text-muted-foreground'>No open position</span>
            )}
          </div>
        </div>

        <div className='flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch'>
          <ButtonGhost
            className='lg:min-w-[7rem]'
            disabled={busy || updatePending}
            onClick={onToggle}
          >
            {instrument.config.enabled ? 'Pause' : 'Resume'}
          </ButtonGhost>
          {instrument.config.signalSource === 'tradingview' &&
          instrument.config.id ? (
            <ButtonGhost
              className='lg:min-w-[7rem]'
              disabled={generatingWebhook}
              onClick={onGenerateWebhook}
            >
              {generatingWebhook ? 'Generating…' : 'Webhook URL'}
            </ButtonGhost>
          ) : null}
          <ButtonGhost
            className='lg:min-w-[7rem]'
            disabled={busy || updatePending || editing}
            onClick={openEdit}
          >
            Edit
          </ButtonGhost>
          <ButtonPrimary
            className='bg-destructive text-destructive-foreground hover:opacity-90 lg:min-w-[7rem]'
            disabled={busy || updatePending || !open}
            onClick={onClose}
          >
            {open ? 'Sell / close' : 'No position'}
          </ButtonPrimary>
          <ButtonDangerOutline
            className='lg:min-w-[7rem]'
            disabled={busy || updatePending}
            onClick={onRemove}
          >
            Remove
          </ButtonDangerOutline>
        </div>
      </div>

      {editing && (
        <div className='mt-4 border-t border-border pt-4'>
          <p className='mb-3 text-sm font-medium text-foreground'>
            Edit settings — saved to the server on apply
          </p>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <SelectField
              label='Broker'
              value={editBroker}
              onChange={(value) => {
                const nextBroker = value as NonNullable<
                  InstrumentConfig['brokerType']
                >;
                const nextAsset =
                  nextBroker === 'capital' || nextBroker === 'mt5'
                    ? 'Forex'
                    : 'Synthetic Indices';
                const nextTimeFrame =
                  TIMEFRAME_OPTIONS_BY_BROKER[nextBroker][0].value;
                const nextSymbols =
                  nextBroker === 'capital'
                    ? capitalMarkets
                        .filter(
                          (market) =>
                            String(
                              market.instrumentType || ''
                            ).toUpperCase() === 'CURRENCIES'
                        )
                        .map((market) => market.epic)
                    : (SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[nextBroker]?.[
                        nextAsset
                      ] ?? []);
                setDraft((prev) => ({
                  ...prev,
                  brokerType: nextBroker,
                  assetClass: nextAsset,
                  symbol: nextSymbols[0] ?? prev.symbol,
                  timeFrame: nextTimeFrame,
                  positionSize:
                    nextBroker === 'capital'
                      ? 100
                      : nextBroker === 'mt5'
                        ? 0.01
                        : 10,
                  recoverySizePerCurrency: nextBroker === 'deriv_ws' ? 1 : 0,
                  maxRecoverySize:
                    nextBroker === 'deriv_ws'
                      ? 35
                      : nextBroker === 'capital'
                        ? 100
                        : 0.01,
                }));
              }}
              options={BROKER_OPTIONS.map((broker) => ({
                value: broker.value,
                label: broker.label,
              }))}
            />
            <SelectField
              label='Asset class'
              value={editAsset}
              onChange={(value) => {
                const nextAsset = value as NonNullable<
                  InstrumentConfig['assetClass']
                >;
                const nextSymbols =
                  editBroker === 'capital'
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
                          if (nextAsset === 'Stocks') return type === 'SHARES';
                          if (nextAsset === 'Crypto')
                            return type === 'CRYPTOCURRENCIES';
                          return false;
                        })
                        .map((market) => market.epic)
                    : (SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[editBroker]?.[
                        nextAsset
                      ] ?? []);
                setDraft((prev) => ({
                  ...prev,
                  assetClass: nextAsset,
                  symbol: nextSymbols[0] ?? prev.symbol,
                }));
              }}
              options={editAssetOptions.map((asset) => ({
                value: asset.value,
                label: asset.label,
              }))}
            />
            <SelectField
              label='Symbol'
              value={draft.symbol ?? instrument.symbol}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, symbol: value }))
              }
              options={
                editSymbols.length > 0
                  ? editSymbols.map((symbol) => ({
                      value: symbol,
                      label: symbol,
                    }))
                  : [
                      {
                        value: draft.symbol ?? instrument.symbol,
                        label: draft.symbol ?? instrument.symbol,
                      },
                    ]
              }
            />
            <NumberField
              label='Short EMA'
              value={draft.shortEmaPeriod ?? 1}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, shortEmaPeriod: value }))
              }
            />
            <NumberField
              label='Long EMA'
              value={draft.longEmaPeriod ?? 10}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, longEmaPeriod: value }))
              }
            />
            <SelectField
              label='Timeframe'
              value={draft.timeFrame ?? '1m'}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, timeFrame: value }))
              }
              options={[...TIMEFRAME_OPTIONS_BY_BROKER[editBroker]]}
            />
            <NumberField
              label='History depth'
              value={draft.historyDepth ?? 300}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, historyDepth: value }))
              }
            />
            <NumberField
              label={
                instrument.config.brokerType === 'capital'
                  ? 'Size (units)'
                  : editBroker === 'mt5'
                    ? 'Volume (lots)'
                    : 'Stake'
              }
              value={draft.positionSize ?? 10}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, positionSize: value }))
              }
            />
            <SelectField
              label='Strategy'
              value={draft.strategy ?? 'fixed_isolated_stake'}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  strategy: value as NonNullable<InstrumentConfig['strategy']>,
                }))
              }
              options={[
                {
                  value: 'fixed_isolated_stake',
                  label: 'Fixed Stake',
                },
                {
                  value: 'standard_accumulative_deficit',
                  label: 'Standard Accumulative Deficit',
                },
                {
                  value: 'aggressive_single_loss_multiplier',
                  label: 'Aggressive Recovery',
                },
              ]}
            />
            {draft.strategy !== 'fixed_isolated_stake' ? (
              <>
                <NumberField
                  label='Native size per 1 account-currency loss'
                  value={draft.recoverySizePerCurrency ?? 0}
                  onChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      recoverySizePerCurrency: value,
                    }))
                  }
                />
                <NumberField
                  label='Maximum native size'
                  value={draft.maxRecoverySize ?? draft.positionSize ?? 10}
                  onChange={(value) =>
                    setDraft((prev) => ({ ...prev, maxRecoverySize: value }))
                  }
                />
              </>
            ) : null}
            {editBroker !== 'capital' ? (
              <NumberField
                label='Multiplier'
                value={draft.multiplier ?? 100}
                onChange={(value) =>
                  setDraft((prev) => ({ ...prev, multiplier: value }))
                }
              />
            ) : null}
            <NumberField
              label='Hard loss limit (account currency, 0=off)'
              value={draft.stopLossAmount ?? 0}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, stopLossAmount: value }))
              }
            />
            <NumberField
              label='Trailing stop activation (account currency, 0=from entry)'
              value={draft.trailingStopActivationAmount ?? 0}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  trailingStopActivationAmount: value,
                }))
              }
            />
            <NumberField
              label='Trailing stop distance (0=off)'
              value={draft.trailingStopDistanceAmount ?? 0}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  trailingStopDistanceAmount: value,
                }))
              }
            />
            <NumberField
              label='Trailing profit activation (account currency, 0=off)'
              value={draft.trailingProfitActivationAmount ?? 0}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  trailingProfitActivationAmount: value,
                }))
              }
            />
            <NumberField
              label='Trailing take-profit giveback (account currency, 0=off)'
              value={draft.trailingProfitGivebackAmount ?? 0}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  trailingProfitGivebackAmount: value,
                }))
              }
            />
          </div>
          <div className='mt-4 flex flex-wrap gap-2'>
            <ButtonPrimary disabled={updatePending} onClick={submitEdit}>
              {updatePending ? 'Saving…' : 'Save changes'}
            </ButtonPrimary>
            <ButtonGhost disabled={updatePending} onClick={cancelEdit}>
              Cancel
            </ButtonGhost>
          </div>
        </div>
      )}
    </div>
  );
}
