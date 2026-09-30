import { titleCaseStatus } from '../../utils/format';

const tones = {
  PENDING: 'bg-amber-50 text-amber-800 ring-amber-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-800 ring-sky-200',
  INFO_REQUIRED: 'bg-orange-50 text-orange-800 ring-orange-200',
  VERIFIED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 ring-rose-200',
  SUSPENDED: 'bg-slate-100 text-slate-700 ring-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  DISABLED: 'bg-slate-100 text-slate-700 ring-slate-200',
  PATIENT: 'bg-primary-50 text-primary-800 ring-primary-200',
  DOCTOR: 'bg-secondary-50 text-secondary-800 ring-secondary-200',
  ADMIN: 'bg-slate-800 text-white ring-slate-800',
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function Badge({ children, status, className = '' }) {
  const tone = (status && tones[status]) || tones.default;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tone} ${className}`}
    >
      {children ?? titleCaseStatus(status)}
    </span>
  );
}
