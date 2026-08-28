import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function NotFoundPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
      <div className="mb-8">
        <Logo size="lg" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-10 py-12 max-w-md w-full space-y-4">
        <p className="text-7xl font-bold text-slate-200 select-none" aria-hidden="true">404</p>
        <h1 className="text-xl font-bold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <button
          onClick={() => navigate(dashboardPath, { replace: true })}
          className="mt-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors"
        >
          {user ? 'Back to Dashboard' : 'Go to Home'}
        </button>
      </div>
    </div>
  );
}
