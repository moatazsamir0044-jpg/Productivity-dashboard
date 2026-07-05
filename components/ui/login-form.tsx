'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signIn, signUp, type AuthFormState } from '@/lib/auth/actions';

const initialState: AuthFormState = { error: null, message: null };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
    >
      {pending ? 'Working…' : label}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction] = useFormState(signIn, initialState);
  const [signUpState, signUpAction] = useFormState(signUp, initialState);

  const state = mode === 'signin' ? signInState : signUpState;
  const action = mode === 'signin' ? signInAction : signUpAction;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-neutral-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm text-neutral-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {state.error && (
        <p className="rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="rounded border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">
          {state.message}
        </p>
      )}

      <SubmitButton label={mode === 'signin' ? 'Sign in' : 'Create account'} />

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="w-full text-center text-sm text-neutral-400 hover:text-white"
      >
        {mode === 'signin'
          ? 'No account? Create one'
          : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}
