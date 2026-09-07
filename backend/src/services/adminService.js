const { getDb } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const { logActivity, getRecentActivities, serializeTimestamps } = require('./activityService');

const VALID_ROLES = ['student', 'faculty', 'researcher', 'faculty_researcher', 'admin'];
const VALID_STATUSES = ['active', 'suspended'];

/**
 * Aggregates dashboard statistics across users, reports, knowledgeSources, and activityLogs
 */
async function getDashboardStats() {
  const db = getDb();
  if (!db) {
    return {
      users: { total: 0, active: 0, suspended: 0, students: 0, faculty: 0, researchers: 0, admins: 0 },
      reports: { total: 0, errorDetection: 0, copiedContent: 0 },
      knowledgeSources: { total: 0, active: 0, inactive: 0 },
      recentActivity: [],
    };
  }

  // 1. Fetch User Stats
  const usersSnap = await db.collection('users').get();
  const userStats = {
    total: 0,
    active: 0,
    suspended: 0,
    students: 0,
    faculty: 0,
    researchers: 0,
    admins: 0,
  };

  const recentUsers = [];

  usersSnap.forEach(doc => {
    const u = doc.data();
    userStats.total++;

    if (u.status === 'suspended') {
      userStats.suspended++;
    } else {
      userStats.active++;
    }

    const normRole = (u.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (normRole === 'student') userStats.students++;
    else if (normRole === 'faculty') userStats.faculty++;
    else if (normRole === 'researcher') userStats.researchers++;
    else if (normRole === 'faculty_researcher') userStats.faculty++;
    else if (normRole === 'admin') userStats.admins++;
    else userStats.students++; // Fallback default safe categorization

    recentUsers.push({
      id: doc.id,
      name: u.name || u.email || 'User',
      role: normRole || 'student',
      createdAt: u.createdAt ? (typeof u.createdAt.toDate === 'function' ? u.createdAt.toDate() : new Date(u.createdAt)) : new Date(),
    });
  });

  // 2. Fetch Report Stats
  let reportsSnap = { docs: [], empty: true, forEach: () => {} };
  try {
    reportsSnap = await db.collection('reports').get();
  } catch (dbErr) {
    console.warn('[AdminService] Firestore reports fetch warning:', dbErr.message);
  }

  const reportStats = {
    total: 0,
    errorDetection: 0,
    copiedContent: 0,
    completed: 0,
    analyzing: 0,
    failed: 0,
  };

  const recentReports = [];
  const processedReportIds = new Set();

  reportsSnap.forEach(doc => {
    const r = doc.data();
    processedReportIds.add(doc.id);
    reportStats.total++;

    const type = (r.reportType || r.type || '').toLowerCase();
    if (type.includes('error')) reportStats.errorDetection++;
    else if (type.includes('copied') || type.includes('content')) reportStats.copiedContent++;

    const status = (r.status || 'completed').toLowerCase();
    if (status === 'completed') reportStats.completed++;
    else if (status === 'analyzing' || status === 'processing') reportStats.analyzing++;
    else if (status === 'failed') reportStats.failed++;

    recentReports.push({
      id: doc.id,
      title: r.title || r.fileName || r.originalName || 'Analysis Report',
      type: type.includes('copied') ? 'Copied Content' : 'Error Detection',
      status: r.status || 'completed',
      createdAt: r.createdAt ? (typeof r.createdAt.toDate === 'function' ? r.createdAt.toDate() : new Date(r.createdAt)) : new Date(),
    });
  });

  // Include session memory reports
  const reportService = require('./reportService');
  if (typeof reportService.getMemoryReports === 'function') {
    const memReports = reportService.getMemoryReports();
    for (const mr of memReports) {
      if (!processedReportIds.has(mr.id)) {
        processedReportIds.add(mr.id);
        reportStats.total++;
        const type = (mr.reportType || mr.type || '').toLowerCase();
        if (type.includes('error')) reportStats.errorDetection++;
        else if (type.includes('copied') || type.includes('content')) reportStats.copiedContent++;

        const status = (mr.status || 'completed').toLowerCase();
        if (status === 'completed') reportStats.completed++;
        else if (status === 'failed') reportStats.failed++;
        else reportStats.analyzing++;

        recentReports.push({
          id: mr.id,
          title: mr.title || 'Analysis Report',
          type: type.includes('copied') ? 'Copied Content' : 'Error Detection',
          status: mr.status || 'completed',
          createdAt: mr.createdAt ? new Date(mr.createdAt) : new Date(),
        });
      }
    }
  }

  // 3. Fetch Knowledge Source Stats
  const ksSnap = await db.collection('knowledgeSources').get();
  const ksStats = {
    total: 0,
    active: 0,
    inactive: 0,
  };

  ksSnap.forEach(doc => {
    const ks = doc.data();
    if (ks.status !== 'deleted') {
      ksStats.total++;
      if (ks.status === 'active' || ks.isActive === true) ksStats.active++;
      else ksStats.inactive++;
    }
  });

  // 4. Fetch Recent Activity
  let recentActivity = await getRecentActivities(10);

  // If no explicit activity logs exist yet, derive real system activities from recent reports & users
  if (!recentActivity || recentActivity.length === 0) {
    const derived = [];
    recentReports.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).forEach(r => {
      derived.push({
        id: `rep-${r.id}`,
        user: 'System User',
        role: 'faculty',
        action: `Generated ${r.type} Report`,
        module: r.type,
        datetime: r.createdAt.toLocaleString(),
        status: r.status,
      });
    });
    recentUsers.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).forEach(u => {
      derived.push({
        id: `usr-${u.id}`,
        user: u.name,
        role: u.role,
        action: 'Registered Account',
        module: 'Authentication',
        datetime: u.createdAt.toLocaleString(),
        status: 'completed',
      });
    });
    recentActivity = derived;
  } else {
    // Format explicit activity logs to match UI table expectations
    recentActivity = recentActivity.map(a => ({
      id: a.id,
      user: a.user || a.userName || a.actorId || 'User',
      role: a.role || 'user',
      action: a.action || a.message || 'System Activity',
      module: a.module || a.type || 'Platform',
      datetime: a.createdAt ? new Date(a.createdAt).toLocaleString() : 'Recently',
      status: a.status || 'completed',
    }));
  }

  return {
    users: userStats,
    reports: reportStats,
    knowledgeSources: ksStats,
    recentActivity,
  };
}

/**
 * Retrieves paginated list of users with role, status, and search filtering
 */
async function listUsers(filters = {}) {
  const db = getDb();
  if (!db) return { users: [], pagination: { hasMore: false, nextCursor: null } };

  if (filters.role && filters.role.toLowerCase() !== 'all' && !VALID_ROLES.includes(filters.role.toLowerCase())) {
    const err = new Error(`Invalid role filter. Allowed values: ${VALID_ROLES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (filters.status && filters.status.toLowerCase() !== 'all' && !VALID_STATUSES.includes(filters.status.toLowerCase())) {
    const err = new Error(`Invalid status filter. Allowed values: ${VALID_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const usersSnap = await db.collection('users').get();
  let users = [];

  usersSnap.forEach(doc => {
    const u = doc.data();
    users.push({
      userId: doc.id,
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'student',
      status: u.status || 'active',
      createdAt: serializeTimestamps(u.createdAt) || null,
      updatedAt: serializeTimestamps(u.updatedAt) || null,
    });
  });

  // Filter by role
  if (filters.role && filters.role.toLowerCase() !== 'all') {
    const targetRole = filters.role.toLowerCase();
    users = users.filter(u => {
      const r = (u.role || '').toLowerCase();
      if (targetRole === 'faculty') return r === 'faculty' || r === 'faculty_researcher' || r === 'researcher';
      return r === targetRole;
    });
  }

  // Filter by status
  if (filters.status && filters.status.toLowerCase() !== 'all') {
    const targetStatus = filters.status.toLowerCase();
    users = users.filter(u => (u.status || 'active').toLowerCase() === targetStatus);
  }

  // Search by name or email
  if (filters.search && typeof filters.search === 'string') {
    const searchLower = filters.search.toLowerCase().trim();
    users = users.filter(u => 
      (u.name && u.name.toLowerCase().includes(searchLower)) ||
      (u.email && u.email.toLowerCase().includes(searchLower))
    );
  }

  // Sort descending by createdAt
  users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  // Limit-based pagination
  const limit = filters.limit ? Math.min(parseInt(filters.limit, 10) || 10, 50) : 10;
  const cursorIndex = filters.cursor ? users.findIndex(u => u.userId === filters.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const paginatedUsers = users.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < users.length;
  const nextCursor = hasMore ? paginatedUsers[paginatedUsers.length - 1].userId : null;

  return {
    users: paginatedUsers,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Retrieves safe details for a specific user
 */
async function getUserDetails(userId) {
  const db = getDb();
  if (!db) {
    const err = new Error('Database not initialized');
    err.statusCode = 500;
    throw err;
  }

  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const u = userDoc.data();

  // Count user's reports
  const reportsSnap = await db.collection('reports').where('userId', '==', userId).get();
  let reportsCount = 0;
  let errorDetectionCount = 0;
  let copiedContentCount = 0;

  reportsSnap.forEach(rDoc => {
    reportsCount++;
    const rData = rDoc.data();
    if (rData.reportType === 'error-detection') errorDetectionCount++;
    if (rData.reportType === 'copied-content') copiedContentCount++;
  });

  return {
    userId: userDoc.id,
    name: u.name || '',
    email: u.email || '',
    role: u.role || 'student',
    status: u.status || 'active',
    createdAt: serializeTimestamps(u.createdAt) || null,
    lastLogin: serializeTimestamps(u.lastLogin) || serializeTimestamps(u.updatedAt) || null,
    reportStats: {
      totalReports: reportsCount,
      errorDetectionReports: errorDetectionCount,
      copiedContentReports: copiedContentCount,
    },
  };
}

/**
 * Updates user account status (active or suspended) with safety checks
 */
async function updateUserStatus(actorUser, targetUserId, newStatus) {
  const db = getDb();
  if (!db) {
    const err = new Error('Database not initialized');
    err.statusCode = 500;
    throw err;
  }

  if (!newStatus || !VALID_STATUSES.includes(newStatus.toLowerCase())) {
    const err = new Error(`Invalid status value. Allowed values: ${VALID_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const normalizedStatus = newStatus.toLowerCase();

  // 1. Admin Safety Lock: Prevent self-suspension
  if (actorUser.uid === targetUserId && normalizedStatus === 'suspended') {
    const err = new Error('Admin cannot suspend their own account');
    err.statusCode = 400;
    throw err;
  }

  const userRef = db.collection('users').doc(targetUserId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const targetData = userDoc.data();

  // 2. Admin Safety Lock: Prevent suspending the final active Admin
  if (targetData.role === 'admin' && normalizedStatus === 'suspended' && targetData.status !== 'suspended') {
    const usersSnap = await db.collection('users').get();
    let activeAdminCount = 0;

    usersSnap.forEach(doc => {
      const u = doc.data();
      if (u.role === 'admin' && u.status !== 'suspended') {
        activeAdminCount++;
      }
    });

    if (activeAdminCount <= 1) {
      const err = new Error('Cannot suspend the last remaining active Admin account');
      err.statusCode = 409;
      throw err;
    }
  }

  // Update Firestore user status
  await userRef.update({
    status: normalizedStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Log Administrative Activity (non-blocking)
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    const isSuspended = normalizedStatus === 'suspended';
    const action = isSuspended ? ACTIVITY_ACTIONS.USER_SUSPENDED : ACTIVITY_ACTIONS.USER_ACTIVATED;
    const targetName = targetData.name || targetData.email || targetUserId;
    const message = isSuspended
      ? `User account (${targetName}) was suspended by administrator.`
      : `User account (${targetName}) was activated by administrator.`;

    await logActivity({
      action,
      category: ACTIVITY_CATEGORIES.USER,
      message,
      actorId: actorUser.uid || 'admin',
      targetId: targetUserId,
      user: actorUser.name || actorUser.email || 'Admin',
      userName: actorUser.name || actorUser.email || 'Admin',
      role: 'admin',
      status: 'completed',
      metadata: {
        affectedUserId: targetUserId,
        affectedUserRole: targetData.role || 'user',
        previousStatus: targetData.status || 'unknown',
        newStatus: normalizedStatus,
      },
    });
  } catch (logErr) {
    console.error('[AdminService] Failed to log user status update activity:', logErr.message);
  }

  return {
    success: true,
    message: `User status successfully updated to ${normalizedStatus}`,
    userId: targetUserId,
    status: normalizedStatus,
  };
}

/**
 * Returns profile details of the authenticated Admin
 */
async function getAdminProfile(adminUser) {
  return {
    id: adminUser.uid,
    name: adminUser.name || 'Admin',
    email: adminUser.email || '',
    role: adminUser.role || 'admin',
    status: adminUser.status || 'active',
    createdAt: serializeTimestamps(adminUser.createdAt) || null,
  };
}
/**
 * Retrieves list of all system reports across all users with type, status, and search filters
 */
async function listSystemReports(filters = {}) {
  const db = getDb();
  if (!db) return { reports: [], pagination: { hasMore: false, nextCursor: null } };

  const reportsSnap = await db.collection('reports').get();
  const userCache = new Map();

  try {
    const usersSnap = await db.collection('users').get();
    usersSnap.forEach(uDoc => {
      userCache.set(uDoc.id, uDoc.data());
    });
  } catch (uErr) {
    console.warn('[AdminService] Bulk user cache warning:', uErr.message);
  }

  let reports = [];

  for (const doc of reportsSnap.docs) {
    const data = doc.data();
    let userName  = data.userName;
    let userEmail = data.userEmail;
    let userRole  = data.userRole;

    // Resolve owner details from users collection if missing
    if (data.userId && (!userName || !userEmail || !userRole)) {
      const cached = userCache.get(data.userId);
      if (cached) {
        userName  = userName  || cached.name  || 'User';
        userEmail = userEmail || cached.email || '';
        userRole  = userRole  || cached.role  || 'student';
      }
    }

    reports.push({
      id: doc.id,
      ...serializeTimestamps(data),
      userName: userName || 'Unknown User',
      userEmail: userEmail || '',
      userRole: userRole || 'student',
    });
  }

  // Include session memory reports
  const reportService = require('./reportService');
  if (typeof reportService.getMemoryReports === 'function') {
    const memReports = reportService.getMemoryReports();
    const existingIds = new Set(reports.map(r => r.id));
    for (const mr of memReports) {
      if (!existingIds.has(mr.id)) {
        existingIds.add(mr.id);
        reports.push({
          id: mr.id,
          ...serializeTimestamps(mr),
          userName: mr.userName || 'User',
          userEmail: mr.userEmail || '',
          userRole: mr.userRole || 'student',
        });
      }
    }
  }

  // Filter by report type
  if (filters.type && filters.type !== 'all') {
    const targetType = filters.type.toLowerCase().replace(/[\s_-]+/g, '');
    reports = reports.filter(r => {
      const rt = (r.reportType || r.type || '').toLowerCase().replace(/[\s_-]+/g, '');
      if (rt === targetType) return true;
      if (targetType.includes('error') && rt.includes('error')) return true;
      if ((targetType.includes('copied') || targetType.includes('content') || targetType.includes('plagiarism')) &&
          (rt.includes('copied') || rt.includes('content') || rt.includes('plagiarism'))) return true;
      return false;
    });
  }

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    const targetStatus = filters.status.toLowerCase();
    reports = reports.filter(r => (r.status || 'completed').toLowerCase() === targetStatus);
  }

  // Search by title, document name, user name, or user email
  if (filters.search && typeof filters.search === 'string') {
    const q = filters.search.toLowerCase().trim();
    reports = reports.filter(r => {
      const docName = r.document?.originalName || r.document?.fileName || '';
      return (
        (r.title && r.title.toLowerCase().includes(q)) ||
        (docName && docName.toLowerCase().includes(q)) ||
        (r.userName && r.userName.toLowerCase().includes(q)) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(q))
      );
    });
  }

  // Sort descending by createdAt
  reports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const limit = filters.limit ? Math.min(parseInt(filters.limit, 10) || 10, 50) : 10;
  const cursorIndex = filters.cursor ? reports.findIndex(r => r.id === filters.cursor) : -1;
  const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const paginatedReports = reports.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < reports.length;
  const nextCursor = hasMore ? paginatedReports[paginatedReports.length - 1].id : null;

  return {
    reports: paginatedReports,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Retrieves full report details for Admin (without ownership restrictions)
 */
async function getReportDetailsAdmin(reportId) {
  const db = getDb();
  if (!db) {
    const err = new Error('Database is not initialized');
    err.statusCode = 500;
    throw err;
  }

  const docRef = db.collection('reports').doc(reportId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }

  const data = doc.data();
  const report = {
    id: doc.id,
    ...serializeTimestamps(data),
  };

  // Fetch detailed subcollection findings or document pairs
  const reportType = (data.reportType || data.type || '').toLowerCase().replace('_', '-');
  if (reportType === 'error-detection') {
    const findingsSnap = await docRef.collection('findings').get();
    const findings = [];
    findingsSnap.forEach(fDoc => {
      findings.push(serializeTimestamps(fDoc.data()));
    });
    findings.sort((a, b) => (a.index || 0) - (b.index || 0));
    report.findings = findings;
  } else if (reportType === 'copied-content') {
    const pairsSnap = await docRef.collection('documentPairs').get();
    const documentPairs = [];
    pairsSnap.forEach(pDoc => {
      documentPairs.push(serializeTimestamps(pDoc.data()));
    });
    report.documentPairs = documentPairs;
  }

  return report;
}

module.exports = {
  getDashboardStats,
  listUsers,
  getUserDetails,
  updateUserStatus,
  getAdminProfile,
  listSystemReports,
  getReportDetailsAdmin,
};
