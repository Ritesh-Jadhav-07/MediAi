const variants = {
  error: 'bg-rose-50 text-rose-800 border-rose-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-sky-50 text-sky-800 border-sky-200',
};

export default function Alert({ variant = 'info', title, children, className = '' }) {
  if (!children && !title) return null;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${variants[variant]} ${className}`} role="alert">
      {title && <p className="font-medium">{title}</p>}
      {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
    </div>
  );
}
