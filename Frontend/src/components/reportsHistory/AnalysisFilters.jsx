import { Search } from 'lucide-react';
import Button from '../Button';

export default function AnalysisFilters({
  search, onSearch,
  typeFilter, onTypeFilter,
  statusFilter, onStatusFilter,
  dateFilter, onDateFilter,
  sortOrder, onSortOrder,
  isFiltered, onClear,
  showCopiedContent,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search reports or documents..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          aria-label="Search reports or documents"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Analysis Type */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-type" className="text-xs font-medium text-slate-500">Analysis Type</label>
          <select
            id="rh-type"
            value={typeFilter}
            onChange={e => onTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All</option>
            <option value="error-detection">Error Detection</option>
            {showCopiedContent && <option value="copied-content">Copied Content</option>}
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-status" className="text-xs font-medium text-slate-500">Status</label>
          <select
            id="rh-status"
            value={statusFilter}
            onChange={e => onStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Date */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-date" className="text-xs font-medium text-slate-500">Date</label>
          <select
            id="rh-date"
            value={dateFilter}
            onChange={e => onDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rh-sort" className="text-xs font-medium text-slate-500">Sort</label>
          <select
            id="rh-sort"
            value={sortOrder}
            onChange={e => onSortOrder(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>
        </div>

        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={onClear} className="self-end">
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
