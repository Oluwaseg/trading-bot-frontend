'use client';

import { useState } from 'react';
import type { Mt5Account, Mt5WorkerStatus } from '../../api-client';
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

export function Mt5AccountsPanel({
  accounts,
  statuses,
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
}: {
  accounts: Mt5Account[];
  statuses: AccountStatusQuery[];
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
}) {
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(
    null
  );

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
            const status = statusQuery?.data;
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
