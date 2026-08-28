import { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import ActivityTable from '../../components/admin/ActivityTable';
import Button from '../../components/Button';
import { getActivity } from '../../services/adminService';

const PAGE_SIZE = 10;
const CATEGORIES = [
  { label: 'All Categories', value: 'all' },
  { label: 'User Activity', value: 'USER' },
  { label: 'Report Activity', value: 'REPORT' },
  { label: 'Knowledge Source', value: 'KNOWLEDGE_SOURCE' },
];

export default function AdminActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getActivity(100)
      .then(data => {
        const formatted = (data || []).map(a => ({
          id: a.id,
          user: a.user || a.userName || a.actorId || 'System User',
          role: a.role || 'system',
          action: a.message || a.action || a.type || 'System Activity',
          category: a.category || a.module || 'SYSTEM',
          module: a.category || a.module || 'Platform',
          status: a.status || 'completed',
          datetime: a.datetime || (a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Recently'),
        }));
        setActivities(formatted);
      })
      .catch(err => {
        console.warn('[AdminActivity] Unable to fetch activities:', err.message);
        setError('Unable to load activity logs. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activities.filter(a => {
      if (category !== 'all' && (a.category || '').toUpperCase() !== category.toUpperCase()) {
        return false;
      }
      if (q) {
        const matchesUser = (a.user || '').toLowerCase().includes(q);
        const matchesAction = (a.action || '').toLowerCase().includes(q);
        const matchesCategory = (a.category || '').toLowerCase().includes(q);
        const matchesRole = (a.role || '').toLowerCase().includes(q);
        if (!matchesUser && !matchesAction && !matchesCategory && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [activities, search, category]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <AdminLayout pageTitle="System Activity">
      <div className="max-w-6xl mx-auto space-y-6">

        <div>
          <h2 className="text-xl font-bold text-slate-900">System Activity</h2>
          <p className="text-sm text-slate-500 mt-0.5">Monitor real-time system activity and logs across TrustLens.</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search & Category Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search activity by message, user, or action..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Search activity"
            />
          </div>

          <div className="w-48">
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1); }}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Filter by category"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {(search !== '' || category !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setCategory('all'); setPage(1); }}>
              Reset Filters
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400" aria-live="polite" aria-atomic="true">
          {loading
            ? 'Loading activity logs...'
            : activities.length === 0
            ? 'No activity has been recorded yet.'
            : filtered.length === 0
            ? 'No activity matches your current filters.'
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`}
        </p>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-12 text-center text-sm text-slate-500">
            Loading activity logs...
          </div>
        ) : (
          <ActivityTable activities={paginated} />
        )}

        {totalPages > 1 && (
          <nav aria-label="Activity pagination" className="flex items-center justify-center gap-1 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">Previous</Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} aria-label={`Page ${n}`} aria-current={n === page ? 'page' : undefined}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600
                  ${n === page ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>{n}</button>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Next page">Next</Button>
          </nav>
        )}
      </div>
    </AdminLayout>
  );
}
