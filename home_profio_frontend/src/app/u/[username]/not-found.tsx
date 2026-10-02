import Link from "next/link";

// Same page for private and missing profiles: never reveal that a private profile exists.
export default function NotFound() {
  return (
    <main className="theme-mono flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="text-[28px] font-bold tracking-tight">This page isn&apos;t available</h1>
      <p className="mt-2 text-[15px] text-slate">The link may be wrong, or the profile isn&apos;t public.</p>
      <Link href="/" className="mt-8 rounded-lg bg-ink px-6 py-3 text-[15px] font-semibold text-paper">
        Go to Home Proofolio
      </Link>
    </main>
  );
}
