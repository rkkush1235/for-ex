import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.25em] text-zinc-400">TradeHub Pro</p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">
        Real-Time Forex, Crypto, Gold & Silver Trading Platform
      </h1>
      <p className="mt-4 max-w-3xl text-zinc-300">
        Built on Firebase with shared market polling, realtime snapshots, professional trading UI,
        and full wallet + admin workflows for Indian users in INR ₹.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/signup"
          className="rounded-xl bg-emerald-500 px-5 py-3 font-medium text-zinc-900"
        >
          Create Account
        </Link>
        <Link href="/login" className="rounded-xl border border-zinc-700 px-5 py-3">
          Login
        </Link>
        <Link href="/dashboard" className="rounded-xl border border-zinc-700 px-5 py-3">
          Open Dashboard
        </Link>
      </div>
    </div>
  );
}
