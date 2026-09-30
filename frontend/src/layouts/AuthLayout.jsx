import { Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-800 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <Link to="/">
            <Logo inverted />
          </Link>
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-100">
              Clinical access
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">
              Care coordination built for patients, doctors, and administrators.
            </h1>
            <p className="mt-4 text-sm leading-6 text-primary-50/90">
              MediAI keeps identity, verification, and records in one professional workspace. Doctor
              accounts stay pending until an administrator reviews credentials.
            </p>
          </div>
          <p className="text-xs text-primary-100/80">Secure JWT sessions · Role-based access</p>
        </aside>

        <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          <div className="mx-auto w-full max-w-md">
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-sm text-slate-500">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
