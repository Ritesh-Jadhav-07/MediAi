import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f8] px-5 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        The address you opened is not part of MediAI. Return home or sign in to your workspace.
      </p>
      <Link to="/" className="mt-6">
        <Button>Back to MediAI</Button>
      </Link>
    </div>
  );
}
