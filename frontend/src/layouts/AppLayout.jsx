import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/ui/Avatar';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';

const NAV = {
  PATIENT: [
    { to: '/patient/dashboard', label: 'Dashboard' },
    { to: '/patient/doctors', label: 'Doctors' },
    { to: '/patient/profile', label: 'Profile' },
  ],
  DOCTOR: [
    { to: '/doctor/dashboard', label: 'Dashboard' },
    { to: '/doctor/profile', label: 'Profile' },
    { to: '/doctor/availability', label: 'Availability' },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/doctors', label: 'Pending doctors' },
    { to: '/admin/verification-history', label: 'Verification history' },
  ],
};

function NavItems({ items, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-primary-50 text-primary-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Logo />
        <button
          type="button"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-4">
          <NavItems items={items} onNavigate={() => setOpen(false)} />
        </div>
      )}

      <div className="mx-auto flex max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
          <Logo />
          <div className="mt-8 flex-1">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {user?.role}
            </p>
            <NavItems items={items} />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name} src={user?.profilePhoto} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </aside>

        <main className="min-h-screen flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center justify-end gap-3 lg:hidden">
            <Avatar name={user?.name} src={user?.profilePhoto} size="sm" />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
