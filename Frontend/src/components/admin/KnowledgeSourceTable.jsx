import { CheckCircle, Clock, Archive, XCircle, Eye, Trash2, Power } from 'lucide-react';
import Button from '../Button';

const STATUS_CONFIG = {
  active:   { icon: <CheckCircle className="w-3 h-3" aria-hidden="true" />, cls: 'bg-green-50 text-green-700 border-green-200',  label: '✓ Active'         },
  inactive: { icon: <XCircle     className="w-3 h-3" aria-hidden="true" />, cls: 'bg-slate-100 text-slate-600 border-slate-300', label: 'Inactive'         },
  pending:  { icon: <Clock       className="w-3 h-3" aria-hidden="true" />, cls: 'bg-amber-50 text-amber-700 border-amber-200',  label: '⏳ Pending Review' },
  archived: { icon: <Archive     className="w-3 h-3" aria-hidden="true" />, cls: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Archived'         },
};

export default function KnowledgeSourceTable({ sources, onView, onToggleStatus, onDelete }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-6 py-12 text-center">
        <p className="text-sm text-slate-500">No knowledge sources found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Knowledge sources table">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Source Name', 'Category', 'Type', 'Status', 'Last Updated', 'Actions'].map(h => (
                <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sources.map(s => {
              const st = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.active;
              const isActive = s.status === 'active';

              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex flex-col">
                      <span>{s.name || s.title}</span>
                      {s.fileName && <span className="text-xs text-slate-400 font-normal">{s.fileName}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{s.domain || s.category}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap capitalize">{s.type || s.sourceType}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>
                      {st.icon}{st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{s.addedDate || s.lastUpdated}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView && onView(s)}
                        aria-label={`View source details: ${s.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className={isActive
                          ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                          : 'text-green-700 border-green-200 hover:bg-green-50'}
                        onClick={() => onToggleStatus && onToggleStatus(s)}
                        aria-label={`${isActive ? 'Deactivate' : 'Activate'} source: ${s.name}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        {isActive ? 'Deactivate' : 'Activate'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => onDelete && onDelete(s)}
                        aria-label={`Delete source: ${s.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
