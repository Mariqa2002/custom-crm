import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">That page doesn&apos;t exist.</p>
        <Link href="/" className="mt-4 inline-flex min-h-11 items-center font-semibold text-accent-text underline">
          Go to the Dashboard
        </Link>
      </div>
    </div>
  );
}
