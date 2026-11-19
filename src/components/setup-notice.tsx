export function SetupNotice() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h1 className="text-xl font-extrabold">Connect Supabase to start</h1>
        <p className="mt-2 text-sm text-muted">
          The app needs its database settings. Create a file called <code>.env.local</code> in the
          project folder (copy <code>.env.example</code>) and fill in:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted">Then stop and restart <code>npm run dev</code>.</p>
      </div>
    </div>
  );
}
