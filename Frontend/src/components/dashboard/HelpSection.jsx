import { useNavigate } from 'react-router-dom';

export default function HelpSection() {
  const navigate = useNavigate();

  return (
    <section aria-labelledby="help-heading" className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
      <h2 id="help-heading" className="text-sm font-semibold text-slate-700 mb-4">
        Not sure where to start?
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/error-detection')}
          className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-200 hover:bg-blue-50 transition-colors group focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Go to Error Detection — verify facts in your document"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-100 transition-colors" aria-hidden="true">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">Want to verify facts?</p>
            <p className="text-xs text-slate-500 mt-0.5">Use Error Detection →</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/copied-content')}
          className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-200 text-left hover:border-indigo-200 hover:bg-indigo-50 transition-colors group focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Go to Copied Content — compare multiple documents"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-100 transition-colors" aria-hidden="true">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">Want to compare assignments?</p>
            <p className="text-xs text-slate-500 mt-0.5">Use Copied Content →</p>
          </div>
        </button>
      </div>
    </section>
  );
}
