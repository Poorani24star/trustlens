import { useState, useEffect, useCallback } from 'react';
import { Users, BarChart2, FileText, BookOpen, RefreshCw, AlertCircle } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import AdminStatCard from '../../components/admin/AdminStatCard';
import SystemStatus from '../../components/admin/SystemStatus';
import QuickActions from '../../components/admin/QuickActions';
import ActivityTable from '../../components/admin/ActivityTable';
import { useAuth } from '../../context/AuthContext';
import { getDashboardStats } from '../../services/adminService';

const STAT_CARDS_CONFIG = [
  { label: 'Total Users',            key: 'totalUsers',       icon: <Users     className="w-5 h-5" />, accent: 'text-blue-600',    bg: 'bg-blue-50'    },
  { label: 'Total Analyses',         key: 'totalAnalyses',    icon: <BarChart2 className="w-5 h-5" />, accent: 'text-violet-600',  bg: 'bg-violet-50'  },
  { label: 'Generated Reports',      key: 'reportsGenerated', icon: <FileText  className="w-5 h-5" />, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Active Knowledge Sources', key: 'knowledgeSources', icon: <BookOpen  className="w-5 h-5" />, accent: 'text-amber-600',   bg: 'bg-amber-50'   },
];

const DEFAULT_SYSTEM_STATUS = [
  { name: 'Error Detection',   status: 'operational' },
  { name: 'Copied Content',    status: 'operational' },
  { name: 'OCR Processing',    status: 'operational' },
  { name: 'Report Generation', status: 'operational' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Admin';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.warn('[AdminDashboard] Live stats fetch notice:', err.message);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cardValues = {
    totalUsers: stats?.users?.total || 0,
    totalAnalyses: stats?.reports?.total || 0,
    reportsGenerated: stats?.reports?.total || 0,
    knowledgeSources: stats?.knowledgeSources?.active ?? stats?.knowledgeSources?.total ?? 0,
  };

  const userBreakdown = [
    { role: 'Students',    count: stats?.users?.students || 0,    color: 'bg-blue-500' },
    { role: 'Faculty',     count: stats?.users?.faculty || 0,     color: 'bg-violet-500' },
    { role: 'Researchers', count: stats?.users?.researchers || 0, color: 'bg-emerald-500' },
    { role: 'Admins',      count: stats?.users?.admins || 0,      color: 'bg-amber-500' },
  ];

  const maxCount = Math.max(...userBreakdown.map(u => u.count), 1);

  const recentActivity = (stats?.recentActivity || []).slice(0, 5).map(a => ({
    id: a.id || String(Math.random()),
    user: a.user || a.userName || 'System User',
    role: a.role || 'admin',
    action: a.action || a.message || 'System Activity',
    module: a.module || a.type || 'Platform',
    datetime: a.datetime || (a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Recently'),
    status: a.status || 'completed',
  }));

  return (
    <AdminLayout pageTitle="Admin Dashboard">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Heading + Manual Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome back, {firstName}</h2>
            <p className="text-sm text-slate-500 mt-1">Monitor and manage the TrustLens platform live data.</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50"
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <p className="flex-1">{error}</p>
            <button
              onClick={fetchStats}
              className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section aria-labelledby="summary-heading">
          <h3 id="summary-heading" className="sr-only">Platform summary</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAT_CARDS_CONFIG.map(({ label, key, icon, accent, bg }) => (
              <AdminStatCard key={key} label={label} value={loading ? '...' : cardValues[key]} icon={icon} accent={accent} bg={bg} />
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* User breakdown */}
          <section aria-labelledby="user-breakdown-heading" className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-card p-6">
            <h3 id="user-breakdown-heading" className="text-base font-semibold text-slate-900 mb-5">User Breakdown</h3>
            <ul className="space-y-4" role="list">
              {userBreakdown.map(({ role, count, color }) => (
                <li key={role}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-700">{role}</span>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{loading ? '...' : count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden" role="presentation">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-300`}
                      style={{ width: loading ? '0%' : `${(count / maxCount) * 100}%` }}
                      aria-label={`${role}: ${count}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* System status */}
          <SystemStatus services={DEFAULT_SYSTEM_STATUS} />
        </div>

        {/* Quick actions */}
        <QuickActions />

        {/* Recent activity */}
        <section aria-labelledby="recent-activity-heading">
          <div className="flex items-center justify-between mb-4">
            <h3 id="recent-activity-heading" className="text-base font-semibold text-slate-700">Recent Activity</h3>
            <a href="/admin/activity" className="text-sm text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded">
              View all
            </a>
          </div>
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-12 text-center text-sm text-slate-400">
              Loading dashboard data...
            </div>
          ) : (
            <ActivityTable activities={recentActivity} />
          )}
        </section>

      </div>
    </AdminLayout>
  );
}
