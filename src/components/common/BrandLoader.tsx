type BrandLoaderProps = {
  fullScreen?: boolean;
};

export function BrandLoader({
  fullScreen = false,
}: BrandLoaderProps) {
  return (
    <div className={fullScreen ? "flex min-h-screen items-center justify-center px-4" : "flex min-h-[60vh] items-center justify-center px-4"}>
      <div className="brand-loader-card glass w-full max-w-sm rounded-2xl px-6 py-8 text-center">
        <div className="brand-card-sweep" aria-hidden />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900/70">
          <span className="brand-logo-text text-xl font-bold tracking-wider">FX</span>
        </div>
        <p className="brand-logo-text mt-4 text-base font-semibold uppercase tracking-[0.3em]">TRADE FX</p>
      </div>
    </div>
  );
}