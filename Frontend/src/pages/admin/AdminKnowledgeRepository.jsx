import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Search, BookOpen, CheckCircle, Clock, Archive, XCircle, X, FileText, Globe } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import KnowledgeSourceTable from '../../components/admin/KnowledgeSourceTable';
import AddSourceModal from '../../components/admin/AddSourceModal';
import AdminStatCard from '../../components/admin/AdminStatCard';
import Button from '../../components/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { 
  getKnowledgeSources, 
  uploadKnowledgeDocument, 
  addKnowledgeText, 
  updateKnowledgeSourceStatus,
  deleteKnowledgeSource 
} from '../../services/knowledgeSourceService';

function SourceDetailsModal({ source, onClose }) {
  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-elevated w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              {source.sourceUrl ? <Globe className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">{source.name || source.title}</h3>
              <p className="text-xs text-slate-400">ID: {source.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium">Domain</span>
            <span className="text-slate-900 font-semibold mt-0.5 block">{source.domain || 'Computer Science'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium">Topic / Category</span>
            <span className="text-slate-900 font-semibold mt-0.5 block">{Array.isArray(source.topics) ? source.topics.join(', ') : (source.category || 'Computer Science')}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium">Source Type</span>
            <span className="text-slate-900 font-semibold mt-0.5 block capitalize">{source.type || source.sourceType}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-400 block font-medium">Status</span>
            <span className={`font-bold mt-0.5 block ${source.status === 'active' ? 'text-green-700' : 'text-amber-700'}`}>
              {source.status ? source.status.toUpperCase() : 'ACTIVE'}
            </span>
          </div>
        </div>

        {source.description && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</h4>
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">{source.description}</p>
          </div>
        )}

        {source.sourceUrl && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Source URL</h4>
            <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block truncate">
              {source.sourceUrl}
            </a>
          </div>
        )}

        {source.textPreview && (
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Extracted Text Preview</h4>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto italic">
              &ldquo;{source.textPreview}&rdquo;
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminKnowledgeRepository() {
  const showToast = useToast();
  const addBtnRef = useRef(null);

  const [sources, setSources]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getKnowledgeSources({ status: 'all' });
      const formatted = data.map(s => ({
        id: s.id || s.sourceId,
        title: s.title || s.name || s.originalName || 'Knowledge Source',
        name: s.title || s.name || s.originalName || 'Knowledge Source',
        domain: s.domain || 'Computer Science',
        topics: Array.isArray(s.topics) && s.topics.length > 0 ? s.topics : [s.category || 'Computer Science'],
        category: s.category || (Array.isArray(s.topics) ? s.topics[0] : 'Computer Science'),
        type: s.sourceType || s.type || 'Official Documentation',
        sourceType: s.sourceType || s.type || 'Official Documentation',
        sourceOrganization: s.sourceOrganization || null,
        status: s.status || 'active',
        description: s.description || '',
        fileName: s.fileName || s.originalName || null,
        sourceUrl: s.sourceUrl || null,
        textPreview: s.textPreview || (s.extractedText ? s.extractedText.substring(0, 150) + '...' : ''),
        addedDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
        addedBy: s.createdBy || 'Admin',
      }));
      setSources(formatted);
    } catch (err) {
      showToast(err.message || 'Failed to load knowledge sources', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  async function handleAdd(sourceData) {
    try {
      if (sourceData.file) {
        await uploadKnowledgeDocument(sourceData.file, {
          title: sourceData.name || sourceData.file.name,
          category: sourceData.topics?.[0] || sourceData.category || 'Computer Science',
          topics: sourceData.topics,
          sourceType: sourceData.sourceType,
          sourceOrganization: sourceData.sourceOrganization,
          description: sourceData.description || '',
          sourceUrl: sourceData.url || null,
          status: sourceData.status || 'active',
        });
      } else {
        await addKnowledgeText({
          title: sourceData.name,
          category: sourceData.topics?.[0] || sourceData.category || 'Computer Science',
          topics: sourceData.topics,
          sourceType: sourceData.sourceType,
          sourceOrganization: sourceData.sourceOrganization,
          description: sourceData.description || '',
          sourceUrl: sourceData.url || null,
          text: sourceData.text || sourceData.description || sourceData.name,
          status: sourceData.status || 'active',
        });
      }
      showToast('Knowledge source added successfully.', 'success');
      fetchSources();
    } catch (err) {
      showToast(err.message || 'Failed to add knowledge source', 'error');
    }
  }

  async function handleToggleStatus(source) {
    const isActivating = source.status !== 'active';
    const confirmMessage = isActivating
      ? `Activate Knowledge Source "${source.name}"? This source will become available for Error Detection.`
      : `Deactivate Knowledge Source "${source.name}"? This source will no longer be used by Error Detection.`;

    if (!window.confirm(confirmMessage)) return;

    const newStatus = isActivating ? 'active' : 'inactive';
    try {
      await updateKnowledgeSourceStatus(source.id, newStatus);
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, status: newStatus } : s));
      showToast(`Knowledge source ${isActivating ? 'activated' : 'deactivated'}.`, 'success');
    } catch (err) {
      showToast(err.message || `Failed to update status for ${source.name}`, 'error');
    }
  }

  async function handleDelete(source) {
    if (!window.confirm(`Delete Knowledge Source "${source.name}"? Deleting this knowledge source will permanently remove it from the trusted knowledge repository. This action cannot be undone.`)) return;

    try {
      await deleteKnowledgeSource(source.id);
      setSources(prev => prev.filter(s => s.id !== source.id));
      showToast('Knowledge source deleted successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete knowledge source', 'error');
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sources.filter(s => {
      if (q) {
        const matchesName = (s.name || '').toLowerCase().includes(q);
        const matchesCategory = (s.category || '').toLowerCase().includes(q);
        const matchesType = (s.type || '').toLowerCase().includes(q);
        const matchesDesc = (s.description || '').toLowerCase().includes(q);
        const matchesFile = (s.fileName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesType && !matchesDesc && !matchesFile) return false;
      }
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [sources, search, statusFilter]);

  const liveSummary = {
    total:         sources.length,
    active:        sources.filter(s => s.status === 'active').length,
    inactive:      sources.filter(s => s.status === 'inactive').length,
    pendingReview: sources.filter(s => s.status === 'pending').length,
    archived:      sources.filter(s => s.status === 'archived').length,
  };

  const SUMMARY_CARDS = [
    { label: 'Total Sources',  value: liveSummary.total,         icon: <BookOpen    className="w-5 h-5" />, accent: 'text-blue-600',    bg: 'bg-blue-50'    },
    { label: 'Active Sources', value: liveSummary.active,        icon: <CheckCircle className="w-5 h-5" />, accent: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inactive / Pending', value: liveSummary.inactive + liveSummary.pendingReview, icon: <Clock className="w-5 h-5" />, accent: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Archived',       value: liveSummary.archived,      icon: <Archive     className="w-5 h-5" />, accent: 'text-slate-500',   bg: 'bg-slate-100'  },
  ];

  return (
    <AdminLayout pageTitle="Knowledge Repository">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Trusted Knowledge Repository</h2>
            <p className="text-sm text-slate-500 mt-0.5">Manage trusted sources used for document verification.</p>
          </div>
          <Button ref={addBtnRef} onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Trusted Source
          </Button>
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          Only sources reviewed and approved by an administrator with status <strong>Active</strong> are used by Error Detection for factual verification.
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_CARDS.map(c => <AdminStatCard key={c.label} {...c} />)}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 flex flex-wrap gap-3 items-end">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search sources by title, category, type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Search knowledge sources"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="src-status-filter" className="text-xs font-medium text-slate-500">Status</label>
            <select id="src-status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending Review</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {(search !== '' || statusFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear Filters</Button>
          )}
        </div>

        <p className="text-xs text-slate-400" aria-live="polite" aria-atomic="true">
          {loading
            ? 'Loading knowledge sources...'
            : filtered.length === 0
            ? 'No knowledge sources match your search or filter criteria.'
            : `${filtered.length} ${filtered.length === 1 ? 'source' : 'sources'}`}
        </p>

        <KnowledgeSourceTable 
          sources={filtered} 
          onView={source => setSelectedSource(source)}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
        />
      </div>

      {showModal && (
        <AddSourceModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
          triggerRef={addBtnRef}
        />
      )}

      {selectedSource && (
        <SourceDetailsModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}
    </AdminLayout>
  );
}
