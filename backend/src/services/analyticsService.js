const { getDb } = require('../config/firebaseAdmin');

/**
 * Safely parses varied timestamp representations (Firestore Timestamp, JS Date, ISO string)
 */
function parseTimestamp(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Formats a Date to YYYY-MM-DD key for daily grouping
 */
function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats YYYY-MM-DD key to short display label (e.g. "Aug 27")
 */
function formatDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculates analytics derived from Firestore users, reports, knowledgeSources, and activityLogs
 */
async function getAdminAnalytics({ period = '7d' } = {}) {
  const db = getDb();
  if (!db) {
    return {
      summary: {
        totalUsers: 0,
        totalReports: 0,
        errorDetectionReports: 0,
        copiedContentReports: 0,
        completedReports: 0,
        failedReports: 0,
        activeKnowledgeSources: 0,
        totalActivities: 0,
      },
      userRoles: { student: 0, faculty: 0, researcher: 0, admin: 0 },
      userStatus: { active: 0, suspended: 0 },
      reportTypes: { errorDetection: 0, copiedContent: 0 },
      reportStatuses: { completed: 0, analyzing: 0, failed: 0, pending: 0 },
      reportTrend: [],
      knowledgeSources: { total: 0, active: 0, inactive: 0, byType: { document: 0, url: 0, text: 0 } },
      activityCategories: { USER: 0, REPORT: 0, KNOWLEDGE_SOURCE: 0, SYSTEM: 0 },
      period,
    };
  }

  const normPeriod = (period || '7d').toLowerCase();
  const now = new Date();
  let daysCount = 7;
  let cutoffDate = null;

  if (normPeriod === '30d') {
    daysCount = 30;
    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (normPeriod === '90d') {
    daysCount = 90;
    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (normPeriod === 'all') {
    daysCount = 30; // Default trend window for "all time" is past 30 days
    cutoffDate = null;
  } else {
    // Default 7d
    daysCount = 7;
    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // 1. Fetch Users Data
  const usersSnap = await db.collection('users').get();
  const userRoles = { student: 0, faculty: 0, researcher: 0, admin: 0 };
  const userStatus = { active: 0, suspended: 0 };
  let totalUsers = 0;

  usersSnap.forEach(doc => {
    totalUsers++;
    const u = doc.data() || {};
    
    // Status
    if (u.status === 'suspended') {
      userStatus.suspended++;
    } else {
      userStatus.active++;
    }

    // Role
    const r = (u.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (r === 'student') userRoles.student++;
    else if (r === 'faculty') userRoles.faculty++;
    else if (r === 'researcher') userRoles.researcher++;
    else if (r === 'faculty_researcher') userRoles.faculty++;
    else if (r === 'admin') userRoles.admin++;
    else userRoles.student++; // Default fallback
  });

  // 2. Fetch Reports Data
  const reportsSnap = await db.collection('reports').get();
  let totalReports = 0;
  let errorDetectionReports = 0;
  let copiedContentReports = 0;
  let completedReports = 0;
  let failedReports = 0;
  let analyzingReports = 0;
  let pendingReports = 0;

  const reportTrendMap = new Map();

  // Pre-fill continuous daily keys for trend chart
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateKey = formatDateKey(d);
    reportTrendMap.set(dateKey, {
      dateKey,
      label: formatDateLabel(dateKey),
      total: 0,
      errorDetection: 0,
      copiedContent: 0,
    });
  }

  reportsSnap.forEach(doc => {
    totalReports++;
    const r = doc.data() || {};

    const rawType = (r.reportType || r.type || '').toLowerCase();
    const isCopied = rawType.includes('copied') || rawType.includes('content');
    if (isCopied) {
      copiedContentReports++;
    } else {
      errorDetectionReports++;
    }

    const status = (r.status || 'completed').toLowerCase();
    if (status === 'completed') completedReports++;
    else if (status === 'failed') failedReports++;
    else if (status === 'analyzing' || status === 'processing') analyzingReports++;
    else pendingReports++;

    // Trend grouping by createdAt timestamp
    const createdAt = parseTimestamp(r.createdAt);
    if (createdAt) {
      if (!cutoffDate || createdAt >= cutoffDate) {
        const dateKey = formatDateKey(createdAt);
        if (reportTrendMap.has(dateKey)) {
          const entry = reportTrendMap.get(dateKey);
          entry.total++;
          if (isCopied) entry.copiedContent++;
          else entry.errorDetection++;
        }
      }
    }
  });

  const reportTrend = Array.from(reportTrendMap.values());

  // 3. Fetch Knowledge Sources Data
  const ksSnap = await db.collection('knowledgeSources').get();
  let totalKs = 0;
  let activeKs = 0;
  let inactiveKs = 0;
  const byType = { document: 0, url: 0, text: 0 };

  ksSnap.forEach(doc => {
    const ks = doc.data() || {};
    if (ks.status !== 'deleted') {
      totalKs++;
      if (ks.status === 'active' || ks.isActive === true) {
        activeKs++;
      } else {
        inactiveKs++;
      }

      const st = (ks.sourceType || 'document').toLowerCase();
      if (st === 'url') byType.url++;
      else if (st === 'text' || st === 'direct-input') byType.text++;
      else byType.document++;
    }
  });

  // 4. Fetch Activity Logs Data
  const activitySnap = await db.collection('activityLogs').get();
  let totalActivities = 0;
  const activityCategories = { USER: 0, REPORT: 0, KNOWLEDGE_SOURCE: 0, SYSTEM: 0 };

  activitySnap.forEach(doc => {
    totalActivities++;
    const act = doc.data() || {};
    const cat = (act.category || 'SYSTEM').toUpperCase();
    if (activityCategories[cat] !== undefined) {
      activityCategories[cat]++;
    } else {
      activityCategories.SYSTEM++;
    }
  });

  return {
    summary: {
      totalUsers,
      totalReports,
      errorDetectionReports,
      copiedContentReports,
      completedReports,
      failedReports,
      activeKnowledgeSources: activeKs,
      totalActivities,
    },
    userRoles,
    userStatus,
    reportTypes: {
      errorDetection: errorDetectionReports,
      copiedContent: copiedContentReports,
    },
    reportStatuses: {
      completed: completedReports,
      analyzing: analyzingReports,
      failed: failedReports,
      pending: pendingReports,
    },
    reportTrend,
    knowledgeSources: {
      total: totalKs,
      active: activeKs,
      inactive: inactiveKs,
      byType,
    },
    activityCategories,
    period: normPeriod,
  };
}

module.exports = {
  getAdminAnalytics,
  parseTimestamp,
  formatDateKey,
  formatDateLabel,
};
