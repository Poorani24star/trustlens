export const adminStats = {
  totalUsers:       1248,
  totalAnalyses:    3842,
  reportsGenerated: 2931,
  knowledgeSources: 156,
};

export const userBreakdown = [
  { role: 'Students',    count: 820,  color: 'bg-blue-500' },
  { role: 'Faculty',     count: 260,  color: 'bg-violet-500' },
  { role: 'Researchers', count: 160,  color: 'bg-emerald-500' },
  { role: 'Admins',      count: 8,    color: 'bg-amber-500' },
];

export const systemStatus = [
  { name: 'Error Detection',   status: 'operational' },
  { name: 'Copied Content',    status: 'operational' },
  { name: 'OCR Processing',    status: 'operational' },
  { name: 'Report Generation', status: 'operational' },
];

export const adminReportStats = {
  totalAnalyses:          3842,
  errorDetectionAnalyses: 2104,
  copiedContentAnalyses:  1738,
  reportsGenerated:       2931,
  reportsFailed:          47,
};
