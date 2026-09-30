export default function Select({
  label,
  id,
  error,
  hint,
  children,
  className = '',
  required,
  ...props
}) {
  return (
    <label className="block" htmlFor={id}>
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </span>
      )}
      <select
        id={id}
        className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0 ${
          error
            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
            : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'
        } disabled:bg-slate-50 ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1.5 block text-xs text-rose-600">{error}</span>}
      {!error && hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
