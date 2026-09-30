export default function Spinner({ className = 'h-6 w-6' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-primary-600 ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
