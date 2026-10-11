'use client';

import { useEffect, useState } from 'react';
import type {
  Mt5Account,
  Mt5Connector,
  Mt5PairingCode,
  Mt5WorkerStatus,
} from '../../api-client';
import { formatDate } from '../../lib/format';
import {
  Alert,
  ButtonGhost,
  ButtonPrimary,
  MiniStat,
  Panel,
  TextField,
} from './ui-primitives';

export interface Mt5AccountForm {
  label: string;
  login: string;
  password: string;
  server: string;
}

interface AccountStatusQuery {
  data?: Mt5WorkerStatus;
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

interface AccountConnectorQuery {
  data?: Mt5Connector[];
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export function Mt5AccountsPanel({
  accounts,
  statuses,
  connectorsByAccount,
  pairingCodes,
  pairingErrors,
  pairingCodePending,
  trackedPositionsByAccount,
  accountsLoading,
  accountsError,
  form,
  setForm,
  adding,
  removing,
  onAdd,
  onRemove,
  onRefresh,
  onRequestPairingCode,
  onRevokeConnector,
  revokingConnectorId,
}: {
  accounts: Mt5Account[];
  statuses: AccountStatusQuery[];
  connectorsByAccount: AccountConnectorQuery[];
  pairingCodes: Record<string, Mt5PairingCode | null>;
  pairingErrors: Record<string, string | null>;
  pairingCodePending: Record<string, boolean>;
  trackedPositionsByAccount: Record<string, number>;
  accountsLoading: boolean;
  accountsError: boolean;
  form: Mt5AccountForm;
  setForm: (update: (previous: Mt5AccountForm) => Mt5AccountForm) => void;
  adding: boolean;
  removing: boolean;
  onAdd: () => void;
  onRemove: (accountId: string) => void;
  onRefresh: () => void;
  onRequestPairingCode: (accountId: string) => void;
  onRevokeConnector: (accountId: string, connectorId: string) => void;
  revokingConnectorId: string | null;
}) {
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(
    null
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className='space-y-5'>
      <Panel
        title='MT5 accounts'
        actions={
          <ButtonGhost onClick={onRefresh} disabled={accountsLoading}>
            {accountsLoading ? 'Refreshing…' : 'Refresh'}
          </ButtonGhost>
        }
      >
        <p className='mb-4 text-sm text-muted-foreground'>
          Stored account settings are separate from live terminal status.
          Passwords and worker tokens are never shown here.
        </p>

        {accountsError ? (
          <Alert tone='error'>
            Could not load MT5 accounts. Check your connection and refresh.
          </Alert>
        ) : null}
        {accountsLoading ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            Loading MT5 accounts…
          </p>
        ) : null}
        {!accountsLoading && !accountsError && accounts.length === 0 ? (
          <p className='rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground'>
            No MT5 accounts are configured yet.
          </p>
        ) : null}

        <div className='divide-y divide-border'>
          {accounts.map((account, index) => {
            const statusQuery = statuses[index];
            const connectorQuery = connectorsByAccount[index];
            const status = statusQuery?.data;
            const pairingCode = pairingCodes[account.id];
            const pairingCodeExpired = pairingCode
              ? new Date(pairingCode.expiresAt).getTime() <= now
              : false;
            const pairingSecondsRemaining = pairingCode
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(pairingCode.expiresAt).getTime() - now) / 1000
                  )
                )
              : 0;
            const terminalConnected = status?.mt5.connected === true;
            const workerOnline = status?.state === 'online';
            const connectionLabel = statusQuery?.isError
              ? 'Status unavailable'
              : workerOnline && terminalConnected
                ? 'Connected'
                : workerOnline
                  ? 'Worker online · terminal unavailable'
                  : statusQuery?.isPending
                    ? 'Checking…'
                    : 'Disconnected';
            const expanded = expandedAccountId === account.id;

            return (
              <article key={account.id} className='py-4 first:pt-0 last:pb-0'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='truncate text-sm font-semibold text-foreground'>
                        {account.label || 'MT5 account'}
                      </h3>
                      <StatusBadge
                        label={connectionLabel}
                        tone={
                          workerOnline && terminalConnected ? 'good' : 'muted'
                        }
                      />
                      <StatusBadge
                        label={account.status || 'configured'}
                        tone='outline'
                      />
                    </div>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {account.broker || account.server} · login {account.login}
                    </p>
                  </div>
                  <div className='flex shrink-0 gap-2'>
                    <ButtonPrimary
                      disabled={pairingCodePending[account.id] === true}
                      onClick={() => {
                        setExpandedAccountId(account.id);
                        onRequestPairingCode(account.id);
                      }}
                    >
                      {pairingCodePending[account.id]
                        ? 'Creating code…'
                        : pairingCode && !pairingCodeExpired
                          ? 'Create fresh code'
                          : 'Pair connector'}
                    </ButtonPrimary>
                    <ButtonGhost
                      onClick={() => {
                        void statusQuery?.refetch();
                      }}
                      disabled={!statusQuery || statusQuery.isFetching}
                    >
                      {statusQuery?.isFetching ? 'Checking…' : 'Refresh status'}
                    </ButtonGhost>
                    <ButtonGhost
                      disabled={removing || workerOnline}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remove ${account.label || 'this MT5 account'}?`
                          )
                        ) {
                          onRemove(account.id);
                        }
                      }}
                    >
                      {removing
                        ? 'Removing…'
                        : workerOnline
                          ? 'Stop worker to remove'
                          : 'Remove'}
                    </ButtonGhost>
                  </div>
                </div>

                <button
                  type='button'
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedAccountId(expanded ? null : account.id)
                  }
                  className='mt-3 text-xs font-medium text-primary hover:underline'
                >
                  {expanded ? 'Hide details' : 'View details'}
                </button>

                {expanded ? (
                  <div className='mt-3 space-y-3'>
                    <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                      <MiniStat label='Stored server' value={account.server} />
                      <MiniStat label='Stored login' value={account.login} />
                      <MiniStat
                        label='Worker connection'
                        value={
                          statusQuery?.isError
                            ? 'Unavailable'
                            : status?.state || 'Checking'
                        }
                      />
                      <MiniStat
                        label='Tracked open instrument positions'
                        value={String(
                          trackedPositionsByAccount[account.id] ?? 0
                        )}
                      />
                    </div>
                    <div>
                      <p className='mb-2 text-xs font-semibold uppercase text-muted-foreground'>
                        Live terminal data
                      </p>
                      {statusQuery?.isError ? (
                        <p className='text-sm text-muted-foreground'>
                          Live status could not be retrieved. The account
                          remains configured; worker connectivity is unknown.
                        </p>
                      ) : status?.mt5.state === 'available' ? (
                        <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                          <MiniStat
                            label='Balance'
                            value={formatLiveValue(
                              status.mt5.balance,
                              status.mt5.currency
                            )}
                          />
                          <MiniStat
                            label='Equity'
                            value={formatLiveValue(
                              status.mt5.equity,
                              status.mt5.currency
                            )}
                          />
                          <MiniStat
                            label='Currency'
                            value={status.mt5.currency || '—'}
                          />
                          <MiniStat
                            label='Trade mode'
                            value={formatTradeMode(status.mt5.tradeMode)}
                          />
                          <MiniStat
                            label='Terminal'
                            value={
                              status.mt5.connected
                                ? 'Connected'
                                : 'Disconnected'
                            }
                          />
                          <MiniStat
                            label='Trading allowed'
                            value={
                              status.mt5.tradeAllowed == null
                                ? 'Unknown'
                                : status.mt5.tradeAllowed
                                  ? 'Yes'
                                  : 'No'
                            }
                          />
                          <MiniStat
                            label='Last live check'
                            value={formatDate(status.mt5.checkedAt)}
                          />
                        </div>
                      ) : (
                        <p className='text-sm text-muted-foreground'>
                          {statusQuery?.isPending
                            ? 'Checking live terminal status…'
                            : status?.mt5.reason === 'worker_offline'
                              ? 'The local worker is offline. Start it to retrieve live account information.'
                              : status?.mt5.reason ||
                                'No live terminal data is available.'}
                        </p>
                      )}
                    </div>
                    <div className='border-t border-border pt-3'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                          <p className='text-xs font-semibold uppercase text-muted-foreground'>
                            Paired devices
                          </p>
                          <p className='mt-1 text-xs text-muted-foreground'>
                            Pair only through the official Profit Pilot
                            Connector. The temporary code is not a device
                            credential.
                          </p>
                        </div>
                      </div>

                      {pairingErrors[account.id] ? (
                        <Alert tone='error' className='mt-3'>
                          {pairingErrors[account.id]}
                        </Alert>
                      ) : null}

                      {pairingCode ? (
                        <div
                          className={`mt-3 rounded-lg border p-3 ${
                            pairingCodeExpired
                              ? 'border-border bg-muted/40'
                              : 'border-primary/40 bg-primary/5'
                          }`}
                          aria-live='polite'
                        >
                          {pairingCodeExpired ? (
                            <p className='text-sm font-medium text-muted-foreground'>
                              This pairing code has expired. Request a fresh
                              code to continue.
                            </p>
                          ) : (
                            <>
                              <p className='text-xs text-muted-foreground'>
                                Temporary pairing code · expires in{' '}
                                {formatCountdown(pairingSecondsRemaining)}
                              </p>
                              <p className='mt-2 select-all font-mono text-xl font-semibold tracking-[0.12em] text-foreground'>
                                {pairingCode.code.match(/.{1,4}/g)?.join(' ')}
                              </p>
                              <p className='mt-2 text-xs text-muted-foreground'>
                                Enter this code in the official Profit Pilot
                                Connector before it expires. Generating a code
                                does not mean a device is connected.
                              </p>
                            </>
                          )}
                        </div>
                      ) : null}

                      <div className='mt-3'>
                        {connectorQuery?.isPending ? (
                          <p className='text-sm text-muted-foreground'>
                            Loading paired devices…
                          </p>
                        ) : connectorQuery?.isError ? (
                          <div className='space-y-2'>
                            <p className='text-sm text-destructive'>
                              Paired devices could not be loaded.
                            </p>
                            <ButtonGhost
                              onClick={() => void connectorQuery.refetch()}
                              disabled={connectorQuery.isFetching}
                            >
                              {connectorQuery.isFetching
                                ? 'Retrying…'
                                : 'Retry device list'}
                            </ButtonGhost>
                          </div>
                        ) : connectorQuery?.data?.length ? (
                          <div className='divide-y divide-border'>
                            {connectorQuery.data.map((connector) => (
                              <div
                                key={connector.id}
                                className='flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between'
                              >
                                <div className='flex flex-wrap items-center gap-2'>
                                  <span className='text-sm font-medium text-foreground'>
                                    {connector.name}
                                  </span>
                                  <StatusBadge
                                    label={
                                      connector.revoked
                                        ? 'Revoked'
                                        : connector.online
                                          ? 'Online'
                                          : 'Offline'
                                    }
                                    tone={
                                      connector.online && !connector.revoked
                                        ? 'good'
                                        : 'muted'
                                    }
                                  />
                                  <span className='text-xs text-muted-foreground'>
                                    Last seen {formatDate(connector.lastSeenAt)}
                                  </span>
                                </div>
                                {!connector.revoked ? (
                                  <ButtonGhost
                                    disabled={
                                      revokingConnectorId === connector.id
                                    }
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Revoke ${connector.name}? This will disconnect it and prevent it from reconnecting.`
                                        )
                                      ) {
                                        onRevokeConnector(
                                          account.id,
                                          connector.id
                                        );
                                      }
                                    }}
                                  >
                                    {revokingConnectorId === connector.id
                                      ? 'Revoking…'
                                      : 'Revoke'}
                                  </ButtonGhost>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className='text-sm text-muted-foreground'>
                            No devices paired to this account.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title='Configure an MT5 account'>
        <p className='mb-4 text-sm text-muted-foreground'>
          Credentials are submitted to the authenticated backend and are not
          displayed after saving.
        </p>
        <div className='grid gap-3 sm:grid-cols-2'>
          <TextField
            label='Account label'
            value={form.label}
            placeholder='Demo account'
            onChange={(label) =>
              setForm((previous) => ({ ...previous, label }))
            }
          />
          <TextField
            label='Login number'
            value={form.login}
            placeholder='MT5 login'
            onChange={(login) =>
              setForm((previous) => ({ ...previous, login }))
            }
          />
          <TextField
            label='Broker server'
            value={form.server}
            placeholder='Broker-Demo'
            onChange={(server) =>
              setForm((previous) => ({ ...previous, server }))
            }
          />
          <TextField
            label='Password'
            type='password'
            value={form.password}
            placeholder='MT5 account password'
            onChange={(password) =>
              setForm((previous) => ({ ...previous, password }))
            }
          />
        </div>
        <div className='mt-4 flex justify-end'>
          <ButtonPrimary
            disabled={!form.login || !form.password || !form.server || adding}
            onClick={onAdd}
          >
            {adding ? 'Saving…' : 'Add account'}
          </ButtonPrimary>
        </div>
      </Panel>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'good' | 'muted' | 'outline';
}) {
  const styles = {
    good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    muted: 'border-border bg-muted text-muted-foreground',
    outline: 'border-border text-muted-foreground',
  };

  return (
    <span
      className={`rounded-md border px-2 py-1 text-[10px] font-medium uppercase ${styles[tone]}`}
    >
      {label}
    </span>
  );
}

function formatLiveValue(value: number | null, currency: string | null) {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || ''}`.trim();
}

function formatTradeMode(mode: number | null) {
  if (mode === null) return 'Unknown';
  if (mode === 0) return 'Demo';
  if (mode === 1) return 'Contest';
  if (mode === 2) return 'Real';
  return `Other (${mode})`;
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
