import type { TradingDashboard } from '../../hooks/use-trading-dashboard';
import { Alert, ButtonPrimary, TextField } from './ui-primitives';

export function LoadingSession() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background text-muted-foreground'>
      <div className='text-center'>
        <div className='mx-auto h-9 w-9 animate-spin rounded-full border-2 border-muted border-t-primary' />
        <p className='mt-4 text-sm'>Loading session…</p>
      </div>
    </div>
  );
}

export function LoginScreen({
  loginForm,
  setLoginForm,
  loginMutation,
  globalError,
  globalSuccess,
}: Pick<
  TradingDashboard,
  | 'loginForm'
  | 'setLoginForm'
  | 'loginMutation'
  | 'globalError'
  | 'globalSuccess'
>) {
  return (
    <div className='min-h-screen overflow-hidden bg-[#07110f] text-[#f4f1e8]'>
      <div className='relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_0.85fr]'>
        <div className='relative flex flex-col justify-between px-6 py-8 md:px-12 md:py-10 lg:px-16'>
          <div className='relative z-10 flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-[#d9f99d] text-lg font-black text-[#07110f]'>
              P
            </div>
            <span className='text-sm font-bold uppercase tracking-[0.22em]'>
              Profit Pilot
            </span>
          </div>

          <div className='relative z-10 max-w-2xl py-16'>
            <p className='text-xs font-semibold uppercase tracking-[0.28em] text-[#b6d86b]'>
              Automated market intelligence
            </p>
            <h1 className='mt-5 max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-[#f4f1e8] md:text-7xl'>
              Let the signal do the watching.
            </h1>
            <p className='mt-6 max-w-lg text-base leading-relaxed text-[#a9b9ad]'>
              A focused command center for EMA strategies across Deriv and
              Capital.com. Configure instruments, follow live positions, and act
              when the market actually moves.
            </p>

            <div className='mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-[#28423a] pt-5'>
              <div>
                <p className='text-2xl font-semibold text-[#d9f99d]'>24/7</p>
                <p className='mt-1 text-[11px] uppercase tracking-[0.16em] text-[#71887a]'>
                  Monitoring
                </p>
              </div>
              <div>
                <p className='text-2xl font-semibold text-[#d9f99d]'>2</p>
                <p className='mt-1 text-[11px] uppercase tracking-[0.16em] text-[#71887a]'>
                  Brokers
                </p>
              </div>
              <div>
                <p className='text-2xl font-semibold text-[#d9f99d]'>EMA</p>
                <p className='mt-1 text-[11px] uppercase tracking-[0.16em] text-[#71887a]'>
                  Signal engine
                </p>
              </div>
            </div>
          </div>

          <div className='relative z-10 flex items-center gap-2 text-xs text-[#71887a]'>
            <span className='h-2 w-2 rounded-full bg-[#b6d86b]' />
            Your pilot desk, your instruments, your read on the market.
          </div>

          <div className='pointer-events-none absolute -bottom-24 -right-24 h-[28rem] w-[38rem] opacity-70 [background:repeating-linear-gradient(90deg,transparent_0,transparent_79px,#173329_80px),repeating-linear-gradient(0deg,transparent_0,transparent_79px,#173329_80px)]' />
          <div className='pointer-events-none absolute bottom-24 left-12 h-24 w-[75%] rotate-[-8deg] border-t-2 border-[#b6d86b]/50 [clip-path:polygon(0_80%,12%_55%,24%_70%,37%_25%,49%_48%,60%_15%,73%_40%,84%_5%,100%_22%,100%_30%,84%_14%,73%_50%,60%_25%,49%_58%,37%_35%,24%_80%,12%_65%,0_90%)]' />
        </div>

        <div className='flex items-center border-l border-[#1b342b] bg-[#0b1915] px-6 py-10 md:px-12'>
          <div className='w-full max-w-md'>
            <div className='mb-8'>
              <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[#71887a]'>
                Welcome back
              </p>
              <h2 className='mt-2 text-3xl font-semibold tracking-tight'>
                Enter Profit Pilot
              </h2>
              <p className='mt-2 text-sm text-[#8ea397]'>
                Pick up where your market watch left off.
              </p>
            </div>

            <div className='rounded-2xl border border-[#28423a] bg-[#10221b] p-6 shadow-2xl shadow-black/20 md:p-8'>
              {globalError && (
                <Alert tone='error' className='mb-5'>
                  {globalError}
                </Alert>
              )}
              {globalSuccess && (
                <Alert tone='success' className='mb-5'>
                  {globalSuccess}
                </Alert>
              )}

              <div className='space-y-4'>
                <TextField
                  label='Email'
                  value={loginForm.email}
                  placeholder='you@example.com'
                  onChange={(value) =>
                    setLoginForm((prev) => ({ ...prev, email: value }))
                  }
                />
                <TextField
                  label='Password'
                  type='password'
                  value={loginForm.password}
                  placeholder='Password'
                  onChange={(value) =>
                    setLoginForm((prev) => ({ ...prev, password: value }))
                  }
                />
                <ButtonPrimary
                  className='mt-2 w-full bg-[#d9f99d] text-[#07110f] hover:bg-[#c8ec82]'
                  disabled={loginMutation.isPending}
                  onClick={() => loginMutation.mutate(loginForm)}
                >
                  {loginMutation.isPending ? 'Opening workspace…' : 'Sign in'}
                </ButtonPrimary>
              </div>
            </div>
            <p className='mt-5 text-center text-xs text-[#71887a]'>
              Secure access to your personal Profit Pilot workspace.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
