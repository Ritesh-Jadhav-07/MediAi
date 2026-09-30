import { initials } from '../../utils/format';

export default function Avatar({ name, src, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-800 ${sizes[size]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
