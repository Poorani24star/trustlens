import { Search, X } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'error-detection', label: 'Error Detection' },
  { value: 'copied-content', label: 'Copied Content' },
];

const DATE_OPTIONS = [
  { value: 'all', label: 'All Dates' },
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
];

const selectClass =
  'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 ' +
  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors';

export default function HistoryFilters({
  search, onSearch,
  typeFilter, onTypeFilter,
  dateFilter, onDateFilter,
  statusFilter, onStatusFilter,
  sortOrder, onSortOrder,
  isFiltered, onClear,
}) {
  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search your analysis history..."
          aria-label="Search analysis history"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900
            placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100
            transition-colors"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600
              focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="sr-only" htmlFor="filter-type">Filter by type</label>
        <select id="filter-type" value={typeFilter} onChange={e => onTypeFilter(e.target.value)} className={selectClass}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="sr-only" htmlFor="filter-date">Filter by date</label>
        <select id="filter-date" value={dateFilter} onChange={e => onDateFilter(e.target.value)} className={selectClass}>
          {DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className="sr-only" htmlFor="filter-status">Filter by status</label>
        <select id="filter-status" value={statusFilter} onChange={e => onStatusFilter(e.target.value)} className={selectClass}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Spacer pushes sort + clear to the right on wider screens */}
        <div className="flex-1 hidden sm:block" aria-hidden="true" />

        <label className="sr-only" htmlFor="sort-order">Sort order</label>
        <select id="sort-order" value={sortOrder} onChange={e => onSortOrder(e.target.value)} className={selectClass}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {isFiltered && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white
              text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50
              transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Clear all filters and search"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
