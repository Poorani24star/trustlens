import { useNavigate } from 'react-router-dom';
import Button from '../Button';

function TypeBadge({ type }) {
  const isError = type === 'error-detection';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
        ${isError ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'}`}
    >
      {isError ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
        </svg>
      )}
      {isError ? 'Error Detection' : 'Copied Content'}
    </span>
  );
}

function FileIcon({ type }) {
  const isZip = type === 'copied-content';
  return (
    <span
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
        ${isZip ? 'bg-indigo-50 text-indigo-500' : 'bg-blue-50 text-blue-500'}`}
      aria-hidden="true"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </span>
  );
}

function EmptyState({ onErrorDetection, onCopiedContent }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <span className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4" aria-hidden="true">
        <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </span>
      <p className="text-sm font-semibold text-slate-700">No analyses yet.</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">
        Start by uploading a document or comparing multiple documents.
      </p>
      <div className="flex flex-wrap gap-3 mt-5 justify-center">
        <Button size="sm" onClick={onErrorDetection}>Check a Document</Button>
        <Button size="sm" variant="secondary" onClick={onCopiedContent}>Compare Documents</Button>
      </div>
    </div>
  );
}

export default function ActivityList({ items = [] }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <EmptyState
        onErrorDetection={() => navigate('/error-detection')}
        onCopiedContent={() => navigate('/copied-content')}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" aria-label="Recent activity">
          <thead>
            <tr className="border-b border-slate-100">
              <th scope="col" className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-3 pr-4">File</th>
              <th scope="col" className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-3 pr-4">Type</th>
              <th scope="col" className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-3 pr-4">Result</th>
              <th scope="col" className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-3 pr-4">Date</th>
              <th scope="col" className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide pb-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-3">
                    <FileIcon type={item.type} />
                    <span className="font-medium text-slate-800 truncate max-w-[180px]" title={item.fileName}>
                      {item.fileName}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 pr-4"><TypeBadge type={item.type} /></td>
                <td className="py-3.5 pr-4 text-slate-600">{item.result}</td>
                <td className="py-3.5 pr-4 text-slate-400 whitespace-nowrap">{item.date}</td>
                <td className="py-3.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(item.id ? `/reports/${item.id}` : (item.type === 'error-detection' ? '/error-detection' : '/copied-content'))}
                    aria-label={`View results for ${item.fileName}`}
                  >
                    View Results
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="sm:hidden space-y-3" role="list" aria-label="Recent activity">
        {items.map(item => (
          <li key={item.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileIcon type={item.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.fileName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.date}</p>
              </div>
              <TypeBadge type={item.type} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">{item.result}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.id ? `/reports/${item.id}` : (item.type === 'error-detection' ? '/error-detection' : '/copied-content'))}
                aria-label={`View results for ${item.fileName}`}
              >
                View Results
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
