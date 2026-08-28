import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { SUPPORTED_TOPICS } from '../../constants/domainConstants';

const CATEGORIES = SUPPORTED_TOPICS;

export default function CategorySelect({ value, onChange, error }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="doc-category" className="text-sm font-medium text-slate-700">
          Document Category
        </label>

        {/* Tooltip trigger */}
        <div className="relative">
          <button
            type="button"
            aria-label="Why do I need to select a category?"
            aria-describedby="category-tooltip"
            onMouseEnter={() => setTooltipVisible(true)}
            onMouseLeave={() => setTooltipVisible(false)}
            onFocus={() => setTooltipVisible(true)}
            onBlur={() => setTooltipVisible(false)}
            className="text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
          </button>

          {tooltipVisible && (
            <div
              id="category-tooltip"
              role="tooltip"
              className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 px-3 py-2
                bg-slate-800 text-white text-xs rounded-lg shadow-elevated z-20 leading-relaxed"
            >
              Your category helps TrustLens identify relevant trusted reference sources.
              {/* Arrow */}
              <span
                className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0
                  border-l-4 border-r-4 border-t-4
                  border-l-transparent border-r-transparent border-t-slate-800"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-slate-500">
        Choose a category to help TrustLens verify your document.
      </p>

      {/* Select */}
      <select
        id="doc-category"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-describedby={error ? 'category-error' : undefined}
        aria-invalid={!!error}
        className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white text-slate-900
          transition-colors focus:outline-none focus:ring-2
          ${error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
          }
          ${!value ? 'text-slate-400' : 'text-slate-900'}`}
      >
        <option value="" disabled>Select a category</option>
        {CATEGORIES.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {error && (
        <p id="category-error" role="alert" className="text-xs text-red-600 flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}
    </div>
  );
}
