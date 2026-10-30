import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Laptop, Loader2, XCircle } from 'lucide-react';
import { ApiError, deviceAuthApi, DeviceRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

type State =
  | { kind: 'enter' }
  | { kind: 'loading' }
  | { kind: 'confirm'; request: DeviceRequest }
  | { kind: 'working'; request: DeviceRequest }
  | { kind: 'approved'; clientName: string }
  | { kind: 'denied' }
  | { kind: 'error'; message: string };

const card = 'w-full max-w-md bg-[#111418] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8 space-y-5';

// "Sign in with Loopin": the desktop app (or CLI) shows a code and opens this page.
// Approving gives that app access to this account until it's revoked on the Profile page.
export function Connect() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [state, setState] = useState<State>(params.get('code') ? { kind: 'loading' } : { kind: 'enter' });

  const lookUp = async (value: string) => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'confirm', request: await deviceAuthApi.describe(value) });
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Could not check that code' });
    }
  };

  useEffect(() => {
    const fromLink = params.get('code');
    if (fromLink) void lookUp(fromLink);
    // Only on first load: later lookups come from the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const respond = async (approve: boolean) => {
    if (state.kind !== 'confirm') return;
    const { request } = state;
    setState({ kind: 'working', request });
    try {
      if (approve) {
        await deviceAuthApi.approve(request.userCode);
        setState({ kind: 'approved', clientName: request.clientName });
      } else {
        await deviceAuthApi.deny(request.userCode);
        setState({ kind: 'denied' });
      }
    } catch (err) {
      setState({ kind: 'error', message: err instanceof ApiError ? err.message : 'Something went wrong' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0B0D10] text-[#ECEAE4]">
      <div className={card}>
        <div className="flex items-center gap-3">
          <Laptop className="text-[#5EE6B0]" size={22} />
          <h1 className="text-lg font-bold">Connect an app</h1>
        </div>

        {state.kind === 'enter' && (
          <form
            className="space-y-4"
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); if (code.trim()) void lookUp(code.trim()); }}
          >
            <p className="text-sm text-[#8A9099]">Enter the code shown in the Loopin app.</p>
            <label htmlFor="connect-code" className="block text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
              Code
            </label>
            <input
              id="connect-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WXYZ-BCDF"
              autoFocus
              className="w-full px-3 py-2.5 bg-[#161A1F] border border-[rgba(255,255,255,0.08)] rounded-lg font-mono tracking-widest text-center uppercase focus:outline-none focus:border-[#5EE6B0]"
            />
            <button type="submit" className="w-full py-2.5 bg-[#5EE6B0] text-black font-bold rounded-lg text-sm">
              Continue
            </button>
          </form>
        )}

        {state.kind === 'loading' && (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#5EE6B0]" /></div>
        )}

        {(state.kind === 'confirm' || state.kind === 'working') && (
          <div className="space-y-5">
            <p className="text-sm text-[#ECEAE4]">
              <strong>{state.request.clientName}</strong> wants to access your Loopin account
              {user ? <> (<span className="text-[#8A9099]">{user.email}</span>)</> : null}.
            </p>
            <div className="text-center font-mono text-2xl tracking-[0.3em] py-3 rounded-lg bg-[#161A1F] border border-[rgba(255,255,255,0.06)]">
              {state.request.userCode}
            </div>
            <p className="text-xs text-[#8A9099]">
              Only approve if this code matches the one in your app. It will be able to see your projects and
              tasks and link commits as you, until you remove it from your Profile.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => void respond(false)}
                disabled={state.kind === 'working'}
                className="flex-1 py-2.5 rounded-lg text-sm border border-[rgba(255,255,255,0.1)] text-[#ECEAE4] disabled:opacity-50"
              >
                Deny
              </button>
              <button
                onClick={() => void respond(true)}
                disabled={state.kind === 'working'}
                className="flex-1 py-2.5 rounded-lg text-sm bg-[#5EE6B0] text-black font-bold disabled:opacity-50"
              >
                {state.kind === 'working' ? 'Working…' : 'Approve'}
              </button>
            </div>
          </div>
        )}

        {state.kind === 'approved' && (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto text-[#5EE6B0]" size={36} />
            <p className="text-sm"><strong>{state.clientName}</strong> is now signed in. You can go back to the app.</p>
          </div>
        )}

        {state.kind === 'denied' && (
          <div className="space-y-3 text-center">
            <XCircle className="mx-auto text-[#8A9099]" size={36} />
            <p className="text-sm">Declined. The app was not given access.</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-red-400">{state.message}</p>
            <button
              onClick={() => { setCode(''); setState({ kind: 'enter' }); }}
              className="w-full py-2.5 rounded-lg text-sm border border-[rgba(255,255,255,0.1)]"
            >
              Enter a code
            </button>
          </div>
        )}

        <Link to="/home" className="block text-center text-xs text-[#5B616A] hover:text-[#8A9099]">Back to Loopin</Link>
      </div>
    </div>
  );
}
