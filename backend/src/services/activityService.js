const { getDb } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');
const { ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('../constants/activityConstants');

/**
 * Converts Firestore Timestamps to ISO 8601 string
 */
function serializeTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }

  const serialized = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val.toDate === 'function') {
      serialized[key] = val.toDate().toISOString();
    } else if (val && typeof val === 'object') {
      serialized[key] = serializeTimestamps(val);
    } else {
      serialized[key] = val;
    }
  }
  return serialized;
}

/**
 * Logs an activity event to the activityLogs collection.
 * Wrapped safely in try/catch to guarantee activity logging failures NEVER crash main business operations.
 */
async function logActivity(dataOrAction, actorId, targetId, message) {
  try {
    const db = getDb();
    if (!db) {
      console.warn('[ActivityService] Database not initialized; skipping activity log.');
      return null;
    }

    let logDoc = {};

    if (typeof dataOrAction === 'object' && dataOrAction !== null) {
      const {
        action,
        type,
        category,
        message: msg,
        actorId: actId,
        targetId: tgtId,
        user,
        userName,
        role,
        status,
        metadata,
      } = dataOrAction;

      const resolvedAction = action || type || 'SYSTEM_EVENT';
      logDoc = {
        action: resolvedAction,
        type: resolvedAction,
        category: category || ACTIVITY_CATEGORIES.SYSTEM,
        message: msg || '',
        actorId: actId || 'system',
        targetId: tgtId || null,
        user: user || userName || 'System User',
        role: role || 'system',
        status: status || 'completed',
        metadata: metadata || {},
        createdAt: FieldValue.serverTimestamp(),
      };
    } else {
      const resolvedAction = dataOrAction || 'SYSTEM_EVENT';
      logDoc = {
        action: resolvedAction,
        type: resolvedAction,
        category: ACTIVITY_CATEGORIES.SYSTEM,
        message: message || '',
        actorId: actorId || 'system',
        targetId: targetId || null,
        user: 'System User',
        role: 'system',
        status: 'completed',
        metadata: {},
        createdAt: FieldValue.serverTimestamp(),
      };
    }

    const docRef = await db.collection('activityLogs').add(logDoc);
    return docRef.id;
  } catch (err) {
    console.error('[ActivityService] Failed to record activity log (non-blocking):', err.message);
    return null;
  }
}

/**
 * Retrieves recent activity logs sorted by createdAt descending
 */
async function getRecentActivities(limit = 20, category = null) {
  try {
    const db = getDb();
    if (!db) return [];

    let query = db.collection('activityLogs');
    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }

    const snapshot = await query.get();
    const logs = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const serialized = serializeTimestamps(data);
      logs.push({
        id: doc.id,
        ...serialized,
        user: serialized.user || serialized.userName || serialized.actorId || 'System User',
        role: serialized.role || 'system',
        action: serialized.action || serialized.message || serialized.type || 'System Event',
        type: serialized.action || serialized.type || 'System Event',
        module: serialized.category || 'Platform',
        datetime: serialized.createdAt ? new Date(serialized.createdAt).toLocaleString() : 'Recently',
        status: serialized.status || 'completed',
      });
    });

    // Sort memory-side by createdAt descending
    logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const maxLimit = Math.min(parseInt(limit, 10) || 20, 100);
    return logs.slice(0, maxLimit);
  } catch (err) {
    console.error('[ActivityService] Failed to retrieve activity logs:', err.message);
    return [];
  }
}

module.exports = {
  logActivity,
  getRecentActivities,
  serializeTimestamps,
  ACTIVITY_ACTIONS,
  ACTIVITY_CATEGORIES,
};

