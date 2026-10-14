'use client';

import { useEffect, useRef, useState } from 'react';
import type { InstrumentConfig, InstrumentState } from '../../api-client';
import {
  MT5_ASSET_CLASS_OPTIONS,
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
  busySymbols,
  onToggle,
  onSetAutomatedEntries,
  onClose,
  onUpdatePositionProtection,
  onRemove,
  onUpdateInstrument,
  onEnableAsEma,
}: {
  rows: InstrumentState[];
  meta: Array<{
    isFetching: boolean;
    isError: boolean;
    errorMessage?: string | null;
    errorStatusCode?: number | null;
  }>;
  busySymbols: string[];
  onToggle: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>
  ) => void;
  onSetAutomatedEntries: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>,
    enabled: boolean
  ) => void;
  onClose: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>
  ) => void;
  onUpdatePositionProtection: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>,
    payload: {
      contractId: string;
      stopLoss?: number | null;
      takeProfit?: number | null;
    }
  ) => Promise<void>;
  onRemove: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>
  ) => Promise<void>;
  onUpdateInstrument: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>,
    updates: Partial<InstrumentConfig>
  ) => Promise<void>;
  onEnableAsEma: (
    symbol: string,
    brokerType: NonNullable<InstrumentConfig['brokerType']>
  ) => void;
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
          key={`mt5:${instrument.symbol}`}
          instrument={instrument}
          syncing={meta[index]?.isFetching ?? false}
          failed={meta[index]?.isError ?? false}
          errorMessage={meta[index]?.errorMessage ?? null}
          errorStatusCode={meta[index]?.errorStatusCode ?? null}
          busy={busySymbols.includes(`mt5:${instrument.symbol}`)}
          onToggle={() => onToggle(instrument.symbol, 'mt5')}
          onSetAutomatedEntries={(enabled) =>
            onSetAutomatedEntries(instrument.symbol, 'mt5', enabled)
          }
          onClose={() => onClose(instrument.symbol, 'mt5')}
          onUpdatePositionProtection={(payload) =>
            onUpdatePositionProtection(instrument.symbol, 'mt5', payload)
          }
          onRemove={() => onRemove(instrument.symbol, 'mt5')}
          onSaveEdit={(updates) =>
            onUpdateInstrument(instrument.symbol, 'mt5', updates)
          }
          onEnableAsEma={() => onEnableAsEma(instrument.symbol, 'mt5')}
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
  onToggle,
  onSetAutomatedEntries,
  onClose,
  onUpdatePositionProtection,
  onRemove,
  onSaveEdit,
  onEnableAsEma,
}: {
  instrument: InstrumentState;
  syncing: boolean;
  failed: boolean;
  errorMessage: string | null;
  errorStatusCode: number | null;
  busy: boolean;
  onToggle: () => void;
  onSetAutomatedEntries: (enabled: boolean) => void;
  onClose: () => void;
  onUpdatePositionProtection: (payload: {
    contractId: string;
    stopLoss?: number | null;
    takeProfit?: number | null;
  }) => Promise<void>;
  onRemove: () => Promise<void>;
  onSaveEdit: (updates: Partial<InstrumentConfig>) => Promise<void>;
  onEnableAsEma: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<Partial<InstrumentConfig>>({});

  const openEdit = () => {
    const c = instrument.config;
    setDraft({
      brokerType: 'mt5',
      assetClass: c.assetClass ?? 'Forex',
      symbol: c.symbol,
      mt5AccountId: c.mt5AccountId ?? null,
      shortEmaPeriod: c.shortEmaPeriod,
      longEmaPeriod: c.longEmaPeriod,
      timeFrame: c.timeFrame,
      historyDepth: c.historyDepth,
      positionSize: c.positionSize,
      strategy: c.strategy ?? 'fixed_isolated_stake',
      recoverySizePerCurrency: c.recoverySizePerCurrency ?? 0,
      maxRecoverySize: c.maxRecoverySize ?? c.positionSize,
      multiplier: c.multiplier,
      trailingStopDistanceAmount: c.trailingStopDistanceAmount ?? 0,
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
        ...((draft.strategy ?? 'fixed_isolated_stake') !==
        'fixed_isolated_stake'
          ? {
              recoverySizePerCurrency: draft.recoverySizePerCurrency ?? 0,
              maxRecoverySize: draft.maxRecoverySize ?? draft.positionSize,
            }
          : {}),
        multiplier: draft.multiplier,
        trailingStopDistanceAmount: draft.trailingStopDistanceAmount ?? 0,
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
    errorStatusCode === 423 ||
    /market .*closed|trading hours/i.test(errorMessage || '');
  const strategyLabel =
    instrument.config.strategy === 'fixed_isolated_stake'
      ? 'Fixed Stake'
      : instrument.config.strategy === 'aggressive_single_loss_multiplier'
        ? 'Aggressive Recovery'
        : 'Standard Deficit';

  const strategyBadgeClass = 'bg-slate-500/15 text-slate-200';
  const editBroker = 'mt5';
  const requestedEditAsset =
    draft.assetClass ?? instrument.config.assetClass ?? 'Forex';
  const editAsset = MT5_ASSET_CLASS_OPTIONS.some(
    (option) => option.value === requestedEditAsset
  )
    ? requestedEditAsset
    : (MT5_ASSET_CLASS_OPTIONS[0]?.value ?? 'Forex');
  const editSymbols =
    SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[editBroker]?.[editAsset] ?? [];
  const editAssetOptions = MT5_ASSET_CLASS_OPTIONS;

  return (
    <div
      className={`rounded-xl border bg-card/60 p-4 transition ${
        open
          ? 'border-primary/40 ring-1 ring-primary/20'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
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
            {instrument.positionSyncPending && (
              <span className='text-[11px] text-muted-foreground'>
                Confirming position
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
          {instrument.config.signalSourceReviewRequired ? (
            <p className='mt-2 text-xs text-amber-200'>
              This automation is paused for signal-source review. Enabling it
              will activate its configured EMA signals.
            </p>
          ) : null}
          {!open && signal === 'NEUTRAL' && !marketClosed ? (
            <p className='mt-2 text-xs text-muted-foreground'>
              No fresh crossover yet. Monitoring for a BUY or SELL signal.
            </p>
          ) : null}

          <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6'>
            <MiniStat label='Trend' value={trend} />
            <MiniStat label='Signal' value={signal} />
            <MiniStat
              label={
                instrument.config.brokerType === 'mt5' ? 'Volume' : 'Stake'
              }
              value={
                instrument.config.brokerType === 'mt5'
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
            <MiniStat label='Lev.' value={`${instrument.config.multiplier}x`} />
            <MiniStat
              label='Manual trail'
              value={
                instrument.config.trailingStopDistanceAmount
                  ? `${instrument.config.trailingStopDistanceAmount}`
                  : 'Off'
              }
            />
          </div>

          <div className='mt-4 rounded-lg border border-border/80 bg-background/40 px-3 py-2.5 text-sm'>
            {open ? (
              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-baseline gap-x-3 gap-y-1'>
                    <span className='font-medium text-foreground'>
                      Open: {open.signal} @ ${open.buy_price}
                    </span>
                    <span className='font-mono text-xs text-muted-foreground'>
                      #{open.contract_id}
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Trail SL{' '}
                    {instrument.config.trailingStopDistanceAmount || 'off'}
                    {open.profit != null
                      ? ` · P/L ${open.profit >= 0 ? '+' : ''}${Number(open.profit).toFixed(2)}`
                      : ''}
                    {open.trailingPeakProfit != null
                      ? ` · Peak +${Number(open.trailingPeakProfit).toFixed(2)}`
                      : ' · Peak not recorded'}
                    {open.trailingStopLevel != null
                      ? ` · Stop +${Number(open.trailingStopLevel).toFixed(2)}`
                      : ''}
                    {open.bid_price != null
                      ? ` · value $${Number(open.bid_price).toFixed(2)}`
                      : ''}
                  </p>
                  {Number(instrument.config.trailingStopDistanceAmount) > 0 ? (
                    <ManualTrailingBox
                      currentProfit={open.profit}
                      peakProfit={open.trailingPeakProfit}
                      stopLevel={open.trailingStopLevel}
                    />
                  ) : null}
                </div>
                <div className='flex flex-wrap items-start gap-3'>
                  <PositionProtectionControls
                    key={open.contract_id}
                    position={open}
                    busy={busy || (instrument.positionSyncPending ?? false)}
                    onSave={onUpdatePositionProtection}
                  />
                  <ButtonPrimary
                    className='bg-destructive text-destructive-foreground hover:opacity-90 sm:shrink-0'
                    disabled={busy || instrument.positionSyncPending}
                    onClick={onClose}
                  >
                    Sell / close
                  </ButtonPrimary>
                </div>
              </div>
            ) : (
              <span className='text-muted-foreground'>No open position</span>
            )}
          </div>
        </div>

        <div className='flex min-w-0 flex-wrap gap-2 xl:w-36 xl:shrink-0 xl:flex-col xl:items-stretch'>
          <label
            className='flex min-h-9 items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground'
            title='Controls new strategy entries only; position monitoring and risk exits continue when off.'
          >
            <input
              type='checkbox'
              checked={instrument.config.automatedEntriesEnabled === true}
              disabled={busy || instrument.config.signalSourceReviewRequired}
              onChange={(event) => onSetAutomatedEntries(event.target.checked)}
            />
            Automated Entries
          </label>
          <ButtonGhost
            className='xl:min-w-28'
            disabled={busy || instrument.config.signalSourceReviewRequired}
            onClick={onToggle}
          >
            {instrument.config.enabled ? 'Pause' : 'Resume'}
          </ButtonGhost>
          {instrument.config.signalSourceReviewRequired ? (
            <ButtonGhost
              className='xl:min-w-28'
              disabled={busy}
              onClick={onEnableAsEma}
            >
              Review and enable EMA
            </ButtonGhost>
          ) : null}
          <ButtonGhost
            className='xl:min-w-28'
            disabled={busy || editing}
            onClick={openEdit}
          >
            Edit
          </ButtonGhost>
          <ButtonPrimary
            className='bg-destructive text-destructive-foreground hover:opacity-90 xl:min-w-28'
            disabled={busy || !open}
            onClick={onClose}
          >
            {open ? 'Sell / close' : 'No position'}
          </ButtonPrimary>
          <ButtonDangerOutline
            className='xl:min-w-28'
            disabled={busy}
            onClick={() => setConfirmDelete(true)}
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
              label='Asset class'
              help='Groups MT5 symbols by market type.'
              value={editAsset}
              onChange={(value) => {
                const nextAsset = value as NonNullable<
                  InstrumentConfig['assetClass']
                >;
                const nextSymbols =
                  SYMBOL_OPTIONS_BY_BROKER_AND_CLASS[editBroker]?.[nextAsset] ??
                  [];
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
              help='The exact broker symbol to monitor and trade. Broker suffixes and naming may differ.'
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
              help='Number of candles used for the faster EMA. Lower values react more quickly to price changes.'
              value={draft.shortEmaPeriod ?? 1}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, shortEmaPeriod: value }))
              }
            />
            <NumberField
              label='Long EMA'
              help='Number of candles used for the slower EMA. Higher values smooth the trend signal.'
              value={draft.longEmaPeriod ?? 10}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, longEmaPeriod: value }))
              }
            />
            <SelectField
              label='Timeframe'
              help='Candle duration used to calculate the EMA signal. 10s (ticks) builds bars from tick history.'
              value={draft.timeFrame ?? '1m'}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, timeFrame: value }))
              }
              options={[...TIMEFRAME_OPTIONS_BY_BROKER[editBroker]]}
            />
            <NumberField
              label='History depth'
              help='How many recent candles the signal engine requests to calculate and validate its EMAs.'
              value={draft.historyDepth ?? 300}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, historyDepth: value }))
              }
            />
            <NumberField
              label='Volume (lots)'
              help='Starting MT5 trade volume in lots. Broker minimums and steps still apply.'
              value={draft.positionSize ?? 10}
              onChange={(value) =>
                setDraft((prev) => ({ ...prev, positionSize: value }))
              }
            />
            <SelectField
              label='Strategy'
              help='Fixed keeps every trade at its base size. Standard adds one scaled realized loss after a loss; Aggressive adds twice that amount. Wins reset to base.'
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
                  help='How many lots to add for each unit of realized account-currency loss.'
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
                  help='Upper limit for the resulting broker-native order size during recovery. Set a conservative limit for this instrument and account.'
                  value={draft.maxRecoverySize ?? draft.positionSize ?? 10}
                  onChange={(value) =>
                    setDraft((prev) => ({ ...prev, maxRecoverySize: value }))
                  }
                />
              </>
            ) : null}
            <NumberField
              label='Automatic trail distance (caps at breakeven)'
              help='Server-managed trailing exit. It starts at minus this distance, rises with peak P/L, and stops at breakeven; use the per-position manual stop to lock in profit.'
              value={draft.trailingStopDistanceAmount ?? 0}
              onChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  trailingStopDistanceAmount: value,
                }))
              }
            />
          </div>
          <div className='mt-4 flex flex-wrap gap-2'>
            <ButtonPrimary disabled={busy} onClick={submitEdit}>
              {busy ? 'Saving…' : 'Save changes'}
            </ButtonPrimary>
            <ButtonGhost disabled={busy} onClick={cancelEdit}>
              Cancel
            </ButtonGhost>
          </div>
        </div>
      )}
      {confirmDelete ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div
            role='dialog'
            aria-modal='true'
            aria-labelledby={`delete-instrument-title-${instrument.config.id ?? instrument.symbol}`}
            className='w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl'
          >
            <h3
              id={`delete-instrument-title-${instrument.config.id ?? instrument.symbol}`}
              className='text-base font-semibold text-foreground'
            >
              Delete {instrument.symbol}?
            </h3>
            <p className='mt-2 text-sm text-muted-foreground'>
              This removes the instrument from automated monitoring. This action
              cannot be undone.
              {open
                ? ' The open broker position will not be closed and will no longer be managed by this instrument.'
                : ''}
            </p>
            <div className='mt-5 flex justify-end gap-2'>
              <ButtonGhost
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </ButtonGhost>
              <ButtonDangerOutline
                disabled={busy}
                onClick={() => {
                  void onRemove()
                    .then(() => setConfirmDelete(false))
                    .catch(() => undefined);
                }}
              >
                {busy ? 'Deleting…' : 'Delete instrument'}
              </ButtonDangerOutline>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PositionProtectionControls({
  position,
  busy,
  onSave,
}: {
  position: NonNullable<InstrumentState['openPosition']>;
  busy: boolean;
  onSave: (payload: {
    contractId: string;
    stopLoss?: number | null;
    takeProfit?: number | null;
  }) => Promise<void>;
}) {
  const [stopLoss, setStopLoss] = useState<number | null>(
    position.protectionStopLoss ?? null
  );
  const [takeProfit, setTakeProfit] = useState<number | null>(
    position.protectionTakeProfit && position.protectionTakeProfit > 0
      ? position.protectionTakeProfit
      : null
  );
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<'stop' | 'target' | null>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const entryLevel = Number(position.buy_price);
  const currentLevel = Number(position.bid_price ?? position.buy_price);
  const stopLevel = stopLoss;
  const targetLevel = takeProfit;
  const levels = [entryLevel, currentLevel, stopLevel, targetLevel].filter(
    (value): value is number => value != null && Number.isFinite(value)
  );
  const rawMin = Math.min(...levels);
  const rawMax = Math.max(...levels);
  const padding = Math.max((rawMax - rawMin) * 0.2, 0.0001);
  const scaleMin = rawMin - padding;
  const scaleMax = rawMax + padding;
  const scaleSpan = scaleMax - scaleMin || 1;
  const markerPosition = (value: number) =>
    `${Math.min(100, Math.max(0, ((value - scaleMin) / scaleSpan) * 100))}%`;

  const moveLevel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !scaleRef.current) return;
    const bounds = scaleRef.current.getBoundingClientRect();
    if (bounds.width === 0) return;
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / bounds.width)
    );
    const value = Number((scaleMin + ratio * scaleSpan).toFixed(5));
    if (dragging === 'stop') setStopLoss(value);
    else setTakeProfit(value);
  };

  useEffect(() => {
    setStopLoss(position.protectionStopLoss ?? null);
    setTakeProfit(
      position.protectionTakeProfit && position.protectionTakeProfit > 0
        ? position.protectionTakeProfit
        : null
    );
  }, [position.protectionStopLoss, position.protectionTakeProfit]);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        contractId: position.contract_id,
        stopLoss,
        takeProfit,
      });
    } catch {
      // The dashboard mutation reports failures globally.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='min-w-0 flex-1 rounded-md border border-border/70 bg-background/50 p-3'>
      <div className='mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs'>
        <span className='font-semibold text-foreground'>Position levels</span>
        <span className='text-muted-foreground'>MT5 broker prices</span>
      </div>
      <div className='mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground'>
        <span>Entry {entryLevel.toFixed(5)}</span>
        <span>
          Current{' '}
          {position.profit != null
            ? `${position.profit >= 0 ? '+' : ''}${Number(position.profit).toFixed(2)}`
            : position.bid_price != null
              ? Number(position.bid_price).toFixed(5)
              : '—'}
        </span>
        <span>Stop {stopLoss == null ? 'off' : stopLoss.toFixed(5)}</span>
        <span>Target {takeProfit == null ? 'off' : takeProfit.toFixed(5)}</span>
      </div>
      <div
        ref={scaleRef}
        className='relative mx-2 mb-4 h-7 touch-none rounded border-y border-border/80 bg-muted/50'
        onPointerMove={moveLevel}
        onPointerUp={() => setDragging(null)}
        onPointerCancel={() => setDragging(null)}
        role='img'
        aria-label='MT5 position price and protection levels'
      >
        <span
          className='absolute inset-y-0 w-px bg-cyan-300'
          style={{ left: markerPosition(entryLevel) }}
          aria-hidden='true'
        />
        <span
          className='absolute inset-y-0 w-0.5 bg-white'
          style={{ left: markerPosition(currentLevel) }}
          aria-hidden='true'
        />
        {stopLevel != null ? (
          <button
            type='button'
            aria-label='Drag manual stop level'
            className='absolute top-0 z-10 h-7 w-3 -translate-x-1/2 cursor-grab touch-none bg-rose-400/80 active:cursor-grabbing'
            style={{ left: markerPosition(stopLevel) }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging('stop');
            }}
          />
        ) : null}
        {targetLevel != null ? (
          <button
            type='button'
            aria-label='Drag take-profit level'
            className='absolute top-0 z-10 h-7 w-3 -translate-x-1/2 cursor-grab touch-none bg-emerald-400/80 active:cursor-grabbing'
            style={{ left: markerPosition(targetLevel) }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging('target');
            }}
          />
        ) : null}
      </div>
      <div className='grid gap-2 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_auto] sm:items-end'>
        <div>
          <label className='mb-1.5 flex items-center gap-2 text-xs text-muted-foreground'>
            <input
              type='checkbox'
              checked={stopLoss !== null}
              onChange={(event) => setStopLoss(event.target.checked ? 0 : null)}
            />
            Hard stop price
          </label>
          {stopLoss !== null ? (
            <NumberField
              label='Price'
              value={stopLoss}
              onChange={(value) => setStopLoss(Math.max(0, value))}
            />
          ) : null}
        </div>
        <div>
          <label className='mb-1.5 flex items-center gap-2 text-xs text-muted-foreground'>
            <input
              type='checkbox'
              checked={takeProfit !== null}
              onChange={(event) =>
                setTakeProfit(event.target.checked ? 0 : null)
              }
            />
            Take-profit price
          </label>
          {takeProfit !== null ? (
            <NumberField
              label='Price'
              value={takeProfit}
              onChange={(value) => setTakeProfit(Math.max(0, value))}
            />
          ) : null}
        </div>
        <ButtonGhost disabled={busy || saving} onClick={() => void submit()}>
          {saving ? 'Applying…' : 'Apply levels'}
        </ButtonGhost>
      </div>
      <p className='mt-2 text-[10px] text-muted-foreground'>
        MT5 changes are sent as native broker price levels. Automatic trailing
        remains a separate server-managed rule.
      </p>
    </div>
  );
}

function ManualTrailingBox({
  currentProfit,
  peakProfit,
  stopLevel,
}: {
  currentProfit?: number | null;
  peakProfit?: number | null;
  stopLevel?: number | null;
}) {
  const current =
    currentProfit != null && Number.isFinite(Number(currentProfit))
      ? Number(currentProfit)
      : 0;
  const peak =
    peakProfit != null && Number.isFinite(Number(peakProfit))
      ? Number(peakProfit)
      : current;
  const stop =
    stopLevel != null && Number.isFinite(Number(stopLevel))
      ? Number(stopLevel)
      : 0;

  const formatSigned = (value: number) =>
    `${value > 0 ? '+' : ''}${value.toFixed(2)}`;

  return (
    <div className='mt-3 max-w-md rounded-md border border-border/70 bg-background/50 px-3 py-2'>
      <div className='flex items-center justify-between gap-2 text-[11px]'>
        <span className='font-medium text-foreground'>Manual trailing</span>
        <span className='text-muted-foreground'>live P/L</span>
      </div>
      <div className='mt-2 grid grid-cols-3 gap-2 text-[11px]'>
        <div className='rounded border border-border/70 bg-background px-2 py-1.5'>
          <div className='text-muted-foreground'>Current</div>
          <div className='font-medium text-emerald-200'>
            {formatSigned(current)}
          </div>
        </div>
        <div className='rounded border border-border/70 bg-background px-2 py-1.5'>
          <div className='text-muted-foreground'>Peak</div>
          <div className='font-medium text-cyan-200'>{formatSigned(peak)}</div>
        </div>
        <div className='rounded border border-border/70 bg-background px-2 py-1.5'>
          <div className='text-muted-foreground'>Stop</div>
          <div className='font-medium text-rose-200'>{formatSigned(stop)}</div>
        </div>
      </div>
    </div>
  );
}
