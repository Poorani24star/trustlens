import { useState, useEffect, useCallback } from 'react';
import { Users, FileText, CheckCircle2, BookOpen, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import AdminStatCard from '../../components/admin/AdminStatCard';
import { getAnalytics } from '../../services/analyticsService';

const PERIOD_OPTIONS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'All Time', value: 'all' },
];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalytics(period);
      setData(res);
    } catch (err) {
      console.warn('[AdminAnalytics] Unable to fetch analytics:', err.message);
      setError('Unable to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary || {
    totalUsers: 0,
    totalReports: 0,
    errorDetectionReports: 0,
    copiedContentReports: 0,
    completedReports: 0,
    failedReports: 0,
    activeKnowledgeSources: 0,
    totalActivities: 0,
  };

  const userRoles = data?.userRoles || { student: 0, faculty: 0, researcher: 0, admin: 0 };
  const userStatus = data?.userStatus || { active: 0, suspended: 0 };
  const reportTypes = data?.reportTypes || { errorDetection: 0, copiedContent: 0 };
  const reportStatuses = data?.reportStatuses || { completed: 0, analyzing: 0, failed: 0, pending: 0 };
  const trend = data?.reportTrend || [];
  const knowledgeSources = data?.knowledgeSources || { total: 0, active: 0, inactive: 0, byType: { document: 0, url: 0, text: 0 } };
  const activityCategories = data?.activityCategories || { USER: 0, REPORT: 0, KNOWLEDGE_SOURCE: 0, SYSTEM: 0 };

  const totalUserCount = Math.max(summary.totalUsers, 1);
  const totalReportCount = Math.max(summary.totalReports, 1);
  const maxTrendVal = Math.max(...trend.map(t => t.total), 1);

  return (
    <AdminLayout pageTitle="Analytics & Insights">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Page Header & Period Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Analytics & Insights</h2>
            <p className="text-sm text-slate-500 mt-0.5">Real-time system operational metrics and report generation trends.</p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="period-select" className="sr-only">Select time period</label>
            <select
              id="period-select"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
            >
              {PERIOD_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors disabled:opacity-50 shadow-sm"
              aria-label="Refresh analytics data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchAnalytics}
              className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <section aria-label="System Metrics Summary">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard label="Total Registered Users" value={loading ? '...' : summary.totalUsers} icon={<Users className="w-5 h-5" />} accent="text-blue-600" bg="bg-blue-50" />
            <AdminStatCard label="Total Analysis Reports" value={loading ? '...' : summary.totalReports} icon={<FileText className="w-5 h-5" />} accent="text-violet-600" bg="bg-violet-50" />
            <AdminStatCard label="Active Knowledge Sources" value={loading ? '...' : summary.activeKnowledgeSources} icon={<BookOpen className="w-5 h-5" />} accent="text-emerald-600" bg="bg-emerald-50" />
            <AdminStatCard label="Total Recorded Activities" value={loading ? '...' : summary.totalActivities} icon={<Activity className="w-5 h-5" />} accent="text-amber-600" bg="bg-amber-50" />
          </div>
        </section>

        {/* Report Generation Trend */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Report Generation Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological daily report count over selected period.</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-blue-500 inline-block" aria-hidden="true" /> Error Detection
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded bg-violet-500 inline-block" aria-hidden="true" /> Copied Content
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400">
              Loading analytics...
            </div>
          ) : trend.length === 0 || summary.totalReports === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              No report data available for this period.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-48 flex items-end justify-between gap-2 pt-6 border-b border-slate-100">
                {trend.map(t => {
                  const edHeight = maxTrendVal > 0 ? (t.errorDetection / maxTrendVal) * 100 : 0;
                  const ccHeight = maxTrendVal > 0 ? (t.copiedContent / maxTrendVal) * 100 : 0;
                  return (
                    <div key={t.dateKey} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        {/* Error Detection Bar */}
                        <div
                          className="w-1/2 max-w-[14px] bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                          style={{ height: `${Math.max(edHeight, t.errorDetection > 0 ? 8 : 2)}%` }}
                          title={`Error Detection: ${t.errorDetection}`}
                        />
                        {/* Copied Content Bar */}
                        <div
                          className="w-1/2 max-w-[14px] bg-violet-500 hover:bg-violet-600 rounded-t transition-all"
                          style={{ height: `${Math.max(ccHeight, t.copiedContent > 0 ? 8 : 2)}%` }}
                          title={`Copied Content: ${t.copiedContent}`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[45px]">{t.label}</span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-xs rounded px-2 py-1 shadow-lg z-10 whitespace-nowrap">
                        <p className="font-semibold">{t.label}</p>
                        <p className="text-blue-300">Error Detection: {t.errorDetection}</p>
                        <p className="text-violet-300">Copied Content: {t.copiedContent}</p>
                        <p className="text-slate-300 border-t border-slate-700 mt-1 pt-0.5 font-bold">Total: {t.total}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Distribution Grid */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* User Distribution */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">User Roles & Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">Distribution of platform accounts.</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role Breakdown</h4>
              <div className="space-y-3">
                {[
                  { label: 'Students', count: userRoles.student, color: 'bg-blue-500' },
                  { label: 'Faculty', count: userRoles.faculty, color: 'bg-violet-500' },
                  { label: 'Researchers', count: userRoles.researcher, color: 'bg-emerald-500' },
                  { label: 'Admins', count: userRoles.admin, color: 'bg-amber-500' },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{r.label}</span>
                      <span className="text-slate-900 font-semibold tabular-nums">{loading ? '...' : r.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${r.color} transition-all duration-300`} style={{ width: `${(r.count / totalUserCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Status</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-xs text-emerald-700 font-medium">Active Users</p>
                  <p className="text-xl font-bold text-emerald-900 mt-1 tabular-nums">{loading ? '...' : userStatus.active}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-xs text-red-700 font-medium">Suspended Users</p>
                  <p className="text-xl font-bold text-red-900 mt-1 tabular-nums">{loading ? '...' : userStatus.suspended}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Report Distribution */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Report Type & Execution Status</h3>
              <p className="text-xs text-slate-500 mt-0.5">Analysis report category and processing status.</p>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Report Category</h4>
              <div className="space-y-3">
                {[
                  { label: 'Error Detection Reports', count: reportTypes.errorDetection, color: 'bg-blue-500' },
                  { label: 'Copied Content Reports', count: reportTypes.copiedContent, color: 'bg-violet-500' },
                ].map(rt => (
                  <div key={rt.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{rt.label}</span>
                      <span className="text-slate-900 font-semibold tabular-nums">{loading ? '...' : rt.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${rt.color} transition-all duration-300`} style={{ width: `${(rt.count / totalReportCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Processing Status</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-center">
                  <p className="text-[11px] text-green-700 font-medium">Completed</p>
                  <p className="text-lg font-bold text-green-900 mt-0.5 tabular-nums">{loading ? '...' : reportStatuses.completed}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-center">
                  <p className="text-[11px] text-blue-700 font-medium">Analyzing</p>
                  <p className="text-lg font-bold text-blue-900 mt-0.5 tabular-nums">{loading ? '...' : reportStatuses.analyzing}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-[11px] text-red-700 font-medium">Failed</p>
                  <p className="text-lg font-bold text-red-900 mt-0.5 tabular-nums">{loading ? '...' : reportStatuses.failed}</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Knowledge Repository & Activity Breakdown */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Knowledge Repository Analytics */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Knowledge Repository Metrics</h3>
              <p className="text-xs text-slate-500 mt-0.5">Trusted sources used for factual verification.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Active Sources</p>
                <p className="text-lg font-bold text-emerald-600 mt-0.5 tabular-nums">{loading ? '...' : knowledgeSources.active}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Inactive Sources</p>
                <p className="text-lg font-bold text-slate-600 mt-0.5 tabular-nums">{loading ? '...' : knowledgeSources.inactive}</p>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sources by Format</p>
              <div className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100">
                <span>Document Uploads</span>
                <span className="font-semibold text-slate-900">{loading ? '...' : knowledgeSources.byType.document}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 py-1 border-b border-slate-100">
                <span>Web Reference URLs</span>
                <span className="font-semibold text-slate-900">{loading ? '...' : knowledgeSources.byType.url}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 py-1">
                <span>Direct Text Snippets</span>
                <span className="font-semibold text-slate-900">{loading ? '...' : knowledgeSources.byType.text}</span>
              </div>
            </div>
          </section>

          {/* Activity Category Breakdown */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">System Activity Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Recorded events by functional area.</p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                { label: 'User Activities', key: 'USER', color: 'bg-blue-500' },
                { label: 'Report Activities', key: 'REPORT', color: 'bg-violet-500' },
                { label: 'Knowledge Source Activities', key: 'KNOWLEDGE_SOURCE', color: 'bg-emerald-500' },
                { label: 'System Operations', key: 'SYSTEM', color: 'bg-amber-500' },
              ].map(cat => {
                const count = activityCategories[cat.key] || 0;
                const maxAct = Math.max(summary.totalActivities, 1);
                return (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{cat.label}</span>
                      <span className="text-slate-900 font-semibold tabular-nums">{loading ? '...' : count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${cat.color} transition-all duration-300`} style={{ width: `${(count / maxAct) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

      </div>
    </AdminLayout>
  );
}
