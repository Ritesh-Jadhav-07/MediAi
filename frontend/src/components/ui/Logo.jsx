export default function Logo({ compact = false, inverted = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
          inverted ? 'bg-white text-primary-700' : 'bg-primary-600 text-white'
        }`}
      >
        M
      </span>
      {!compact && (
        <span
          className={`text-lg font-semibold tracking-tight ${
            inverted ? 'text-white' : 'text-slate-900'
          }`}
        >
          Medi<span className={inverted ? 'text-primary-100' : 'text-primary-600'}>AI</span>
        </span>
      )}
    </div>
  );
}
