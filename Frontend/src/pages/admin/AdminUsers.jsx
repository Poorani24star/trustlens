import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import UserTable from '../../components/admin/UserTable';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import Button from '../../components/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { useAuth } from '../../context/AuthContext';
import { listUsers, updateUserStatus, getUserDetails } from '../../services/adminService';

const PAGE_SIZE = 10;

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const showToast = useToast();
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [page, setPage]                 = useState(1);
  const triggerRef                      = useRef(null);

  const fetchUsersList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers({
        role: roleFilter,
        status: statusFilter,
        search,
      });
      // Ensure each user has `id` mapped for the table component
      const formatted = data.map(u => ({
        id: u.userId || u.id,
        ...u,
      }));
      setUsers(formatted);
    } catch (err) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, showToast]);

  useEffect(() => {
    fetchUsersList();
  }, [fetchUsersList]);

  async function handleView(user, btnRef) {
    triggerRef.current = btnRef;
    try {
      const details = await getUserDetails(user.id || user.userId);
      setSelectedUser({
        id: details.userId,
        ...details,
      });
    } catch (err) {
      setSelectedUser(user);
    }
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const res = await updateUserStatus(id, newStatus);
      if (res && res.success) {
        setUsers(prev => prev.map(u => (u.id === id || u.userId === id) ? { ...u, status: newStatus } : u));
        if (selectedUser && (selectedUser.id === id || selectedUser.userId === id)) {
          setSelectedUser(prev => ({ ...prev, status: newStatus }));
        }
        const label = newStatus === 'active' ? 'activated' : 'suspended';
        showToast(`User account ${label} successfully.`, newStatus === 'active' ? 'success' : 'info');
      }
    } catch (err) {
      showToast(err.message || 'Status update failed', 'error');
    }
  }

  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const paginated  = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function setFilter(setter) { return v => { setter(v); setPage(1); }; }

  const isFiltered = search !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  return (
    <AdminLayout pageTitle="User Management">
      <div className="max-w-6xl mx-auto space-y-6">

        <div>
          <h2 className="text-xl font-bold text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">View and manage TrustLens users.</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Search users"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="role-filter" className="text-xs font-medium text-slate-500">Role</label>
            <select id="role-filter" value={roleFilter} onChange={e => setFilter(setRoleFilter)(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="researcher">Researcher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="status-filter" className="text-xs font-medium text-slate-500">Status</label>
            <select id="status-filter" value={statusFilter} onChange={e => setFilter(setStatusFilter)(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); setPage(1); }}>
              Clear Filters
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-400" aria-live="polite" aria-atomic="true">
          {loading
            ? 'Loading users...'
            : users.length === 0
            ? 'No users found'
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, users.length)} of ${users.length} ${users.length === 1 ? 'user' : 'users'}`}
        </p>

        <UserTable users={paginated} onView={handleView} />

        {totalPages > 1 && (
          <nav aria-label="Users pagination" className="flex items-center justify-center gap-1 pt-2">
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

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          currentUser={currentUser}
          onClose={() => setSelectedUser(null)}
          onStatusChange={handleStatusChange}
          triggerRef={triggerRef}
        />
      )}
    </AdminLayout>
  );
}
