import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { useAuth } from '../hooks/useAuth';
import { dashboardPathForRole } from '../utils/format';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link to={dashboardPathForRole(user.role)}>
                <Button>Open workspace</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/register/patient">
                  <Button>Get started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary-700">
          Healthcare platform
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          A calm, professional workspace for patients, clinicians, and administrators.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
          MediAI connects people to verified doctors. Patient records stay with the patient.
          Doctor credentials are reviewed before they appear in the directory.
        </p>
        {!isAuthenticated && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register/patient">
              <Button size="lg">Register as patient</Button>
            </Link>
            <Link to="/register/doctor">
              <Button size="lg" variant="outline">
                Register as doctor
              </Button>
            </Link>
          </div>
        )}

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Patients',
              body: 'Maintain your profile and browse doctors who have already been verified by MediAI administrators.',
            },
            {
              title: 'Doctors',
              body: 'Submit credentials at registration. Access stays limited until an administrator approves your account.',
            },
            {
              title: 'Administrators',
              body: 'Review pending applications, approve or reject with a recorded reason, and inspect verification history.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
