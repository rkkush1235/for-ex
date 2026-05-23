export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="skeleton h-10 w-48 rounded-xl" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="skeleton h-28 rounded-xl" />
        <div className="skeleton h-28 rounded-xl" />
        <div className="skeleton h-28 rounded-xl" />
        <div className="skeleton h-28 rounded-xl" />
      </div>
    </div>
  );
}
