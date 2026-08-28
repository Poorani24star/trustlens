/**
 * Shared date utilities used by HistoryPage, ReportsPage, and any future list pages.
 * Do NOT duplicate these helpers in individual page components.
 */

/**
 * Returns true if `dateStr` falls within the given filter window.
 * @param {string} dateStr - ISO-compatible date string
 * @param {'all'|'today'|'7days'|'30days'} filter
 */
export function isWithinRange(dateStr, filter) {
  if (filter === 'all') return true;
  const itemDate = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'today') return itemDate >= startOfToday;
  if (filter === '7days') {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - 6);
    return itemDate >= d;
  }
  if (filter === '30days') {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - 29);
    return itemDate >= d;
  }
  return true;
}

/**
 * Returns a new sorted array of items by date field and optional name field.
 * @param {Array}  items  - array with `.date` and `.fileName` properties
 * @param {'newest'|'oldest'|'name-asc'|'name-desc'} order
 */
export function sortItems(items, order) {
  return [...items].sort((a, b) => {
    if (order === 'newest')    return new Date(b.date) - new Date(a.date);
    if (order === 'oldest')    return new Date(a.date) - new Date(b.date);
    if (order === 'name-asc')  return a.fileName.localeCompare(b.fileName);
    if (order === 'name-desc') return b.fileName.localeCompare(a.fileName);
    return 0;
  });
}
