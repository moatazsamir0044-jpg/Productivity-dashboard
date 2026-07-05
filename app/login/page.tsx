import { LoginForm } from '@/components/ui/login-form';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-white">
          Productivity Dashboard
        </h1>
        <p className="mb-6 text-sm text-neutral-400">
          Sign in to manage your goals and plans.
        </p>
        {searchParams.error === 'auth_callback_failed' && (
          <p className="mb-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">
            Email confirmation failed. Try signing in, or request a new link.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
