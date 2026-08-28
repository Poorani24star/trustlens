import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasPermission, normalizeRole } from '../config/rolePermissions';
import Logo from '../components/Logo';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import UserDashboard from '../pages/UserDashboard';
import ErrorDetectionUpload from '../pages/ErrorDetectionUpload';
import CopiedContentUpload from '../pages/CopiedContentUpload';
import ProfilePage from '../pages/ProfilePage';
import ReportsHistoryPage from '../pages/ReportsHistoryPage';
import ReportDetailPage from '../pages/ReportDetailPage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminDashboardPage from '../pages/admin/AdminDashboard';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminActivity from '../pages/admin/AdminActivity';
import AdminKnowledgeRepository from '../pages/admin/AdminKnowledgeRepository';
import AdminReports from '../pages/admin/AdminReports';
import AdminAnalytics from '../pages/admin/AdminAnalytics';
import AdminProfile from '../pages/admin/AdminProfile';

/** Shown while auth session is being read on mount — prevents flash of wrong UI. */
function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4" role="status" aria-label="Loading TrustLens">
      <Logo size="lg" />
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading your account...
      </div>
    </div>
  );
}

function AccessDenied({ title = 'Access Denied', message = 'You do not have permission to access this page.', isSuspended = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);
  const targetDashboard = userRole === 'admin' ? '/admin/dashboard' : '/dashboard';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
      <span className={`w-12 h-12 rounded-full flex items-center justify-center ${isSuspended ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-500'}`} aria-hidden="true">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </span>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
      {!isSuspended && (
        <button
          onClick={() => navigate(targetDashboard, { replace: true })}
          className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          Return to Dashboard
        </button>
      )}
    </div>
  );
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (user) {
    if (user.status === 'suspended' || user.status === 'inactive') {
      return <AccessDenied title="Account Suspended" message="Your account has been suspended. Please contact the administrator." isSuspended={true} />;
    }
    const role = normalizeRole(user.role);
    return <Navigate to={role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return children;
}

/** Protects normal user routes — redirects admin to their own dashboard. */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.status === 'suspended' || user.status === 'inactive') {
    return <AccessDenied title="Account Suspended" message="Your account has been suspended. Please contact the administrator." isSuspended={true} />;
  }

  const role = normalizeRole(user.role);
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return children;
}

/** Protects admin-only routes — non-admins see AccessDenied. */
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.status === 'suspended' || user.status === 'inactive') {
    return <AccessDenied title="Account Suspended" message="Your account has been suspended. Please contact the administrator." isSuspended={true} />;
  }

  const role = normalizeRole(user.role);
  if (role !== 'admin') return <AccessDenied title="Access Denied" message="You do not have administrative permission to access this page." />;

  return children;
}

/** Redirects if the role lacks the required permission. */
function RoleProtectedRoute({ children, permission }) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.status === 'suspended' || user.status === 'inactive') {
    return <AccessDenied title="Account Suspended" message="Your account has been suspended. Please contact the administrator." isSuspended={true} />;
  }

  if (!hasPermission(user.role, permission)) {
    return <AccessDenied title="Feature Unavailable" message="This feature is not permitted for your current user role." />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />

      {/* Admin routes — admin role only */}
      <Route path="/admin"                      element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard"            element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/users"                element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/activity"             element={<AdminRoute><AdminActivity /></AdminRoute>} />
      <Route path="/admin/knowledge-repository" element={<AdminRoute><AdminKnowledgeRepository /></AdminRoute>} />
      <Route path="/admin/reports"              element={<AdminRoute><AdminReports /></AdminRoute>} />
      <Route path="/admin/reports/:id"          element={<AdminRoute><ReportDetailPage /></AdminRoute>} />
      <Route path="/admin/analytics"            element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
      <Route path="/admin/profile"              element={<AdminRoute><AdminProfile /></AdminRoute>} />

      {/* Error Detection */}
      <Route path="/error-detection"        element={<ProtectedRoute><ErrorDetectionUpload /></ProtectedRoute>} />

      {/* Copied Content — faculty + researcher only */}
      <Route path="/copied-content"        element={<RoleProtectedRoute permission="copiedContent"><CopiedContentUpload /></RoleProtectedRoute>} />

      <Route path="/reports-history" element={<ProtectedRoute><ReportsHistoryPage /></ProtectedRoute>} />
      <Route path="/history"         element={<Navigate to="/reports-history" replace />} />
      <Route path="/reports"         element={<Navigate to="/reports-history" replace />} />
      <Route path="/reports/:id"     element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
      <Route path="/profile"         element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      {/* 404 — must be last */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
