const { FieldValue } = require('firebase-admin/firestore');
const { getDb, isFirebaseInitialized } = require('../config/firebaseAdmin');
const { extractDocumentText } = require('./extraction/documentExtractionService');
const { normalizeText } = require('./extraction/textNormalizationService');
const { SUPPORTED_DOMAIN, SUPPORTED_TOPICS, isSupportedTopic } = require('../constants/domainConstants');

/**
 * Controlled list of valid Knowledge Source Types
 */
const VALID_SOURCE_TYPES = [
  'Official Documentation',
  'Academic Textbook',
  'Research Paper',
  'Educational Resource',
  'Standard',
  'Technical Documentation',
  'Web Reference',
  'Document File',
  'Direct Text Input',
  'file',
  'text',
  'url'
];

/**
 * Validates and normalizes topic selection against centralized CS domain configuration
 */
function validateSourceTopics(topicsInput, fallbackCategory) {
  let rawTopics = [];
  if (Array.isArray(topicsInput)) {
    rawTopics = topicsInput;
  } else if (typeof topicsInput === 'string' && topicsInput.trim()) {
    rawTopics = [topicsInput.trim()];
  } else if (fallbackCategory) {
    rawTopics = Array.isArray(fallbackCategory) ? fallbackCategory : [fallbackCategory];
  }

  if (rawTopics.length === 0) {
    const err = new Error('At least one valid Computer Science topic must be selected.');
    err.statusCode = 400;
    throw err;
  }

  const validTopics = [];
  const invalidTopics = [];

  for (const t of rawTopics) {
    if (typeof t !== 'string' || !t.trim()) continue;
    const cleanTopic = t.trim();
    if (isSupportedTopic(cleanTopic)) {
      const officialMatch = SUPPORTED_TOPICS.find(st => st.toLowerCase() === cleanTopic.toLowerCase());
      if (officialMatch && !validTopics.includes(officialMatch)) {
        validTopics.push(officialMatch);
      }
    } else {
      invalidTopics.push(cleanTopic);
    }
  }

  if (invalidTopics.length > 0) {
    const err = new Error(`Invalid topic(s) provided: ${invalidTopics.join(', ')}. All topics must belong to supported Computer Science topics.`);
    err.statusCode = 400;
    throw err;
  }

  if (validTopics.length === 0) {
    const err = new Error('At least one valid Computer Science topic must be selected.');
    err.statusCode = 400;
    throw err;
  }

  return validTopics;
}

/**
 * Validates trusted knowledge text content
 */
function validateSourceContent(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    const err = new Error('Trusted knowledge content is required and cannot be empty.');
    err.statusCode = 400;
    throw err;
  }
  const clean = text.trim();
  if (clean.length < 10) {
    const err = new Error('Trusted knowledge content must be at least 10 characters long.');
    err.statusCode = 400;
    throw err;
  }
  return clean;
}

/**
 * Creates a knowledge source entry from an uploaded document file
 */
async function createFileKnowledgeSource(adminUid, file, metadata = {}) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }
  if (!file || !file.path) {
    const err = new Error('No uploaded file provided');
    err.statusCode = 400;
    throw err;
  }

  const { title, category, topics, sourceType, sourceOrganization, sourceUrl, description, status } = metadata;

  // Process file through text extraction pipeline
  const extractionResult = await extractDocumentText(file.path, file.originalname, file.mimetype);
  const extraction = extractionResult.extraction || {};
  const extractedText = validateSourceContent(extraction.text || '');

  const validatedTopics = validateSourceTopics(topics, category);
  const db = getDb();
  const now = FieldValue.serverTimestamp();

  const docData = {
    title: (title && title.trim()) ? title.trim() : file.originalname,
    domain: SUPPORTED_DOMAIN,
    topics: validatedTopics,
    category: validatedTopics[0],
    sourceType: sourceType && VALID_SOURCE_TYPES.includes(sourceType) ? sourceType : 'Document File',
    sourceOrganization: sourceOrganization ? sourceOrganization.trim() : null,
    description: description ? description.trim() : '',
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    sourceUrl: sourceUrl ? sourceUrl.trim() : null,
    extractedText,
    textLength: extractedText.length,
    extractionMethod: extraction.extractionMethod || 'file-text',
    requiresOcr: extraction.requiresOcr || false,
    status: (status === 'inactive') ? 'inactive' : 'active',
    version: 1,
    createdBy: adminUid || 'admin',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('knowledgeSources').add(docData);

  // Log activity
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    await logActivity({
      action: ACTIVITY_ACTIONS.KNOWLEDGE_SOURCE_CREATED,
      category: ACTIVITY_CATEGORIES.KNOWLEDGE_SOURCE,
      message: `Knowledge source "${docData.title}" was created and added to repository.`,
      actorId: adminUid || 'admin',
      targetId: docRef.id,
      user: 'Admin',
      userName: 'Admin',
      role: 'admin',
      status: 'completed',
      metadata: { category: docData.category, topics: docData.topics, domain: SUPPORTED_DOMAIN, sourceType: docData.sourceType },
    });
  } catch (logErr) {
    console.error('[KnowledgeService] Failed to log knowledge source creation activity:', logErr.message);
  }

  return {
    id: docRef.id,
    ...docData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Creates a knowledge source entry from direct text or web reference
 */
async function createTextKnowledgeSource(adminUid, metadata = {}) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }

  const { title, category, topics, sourceType, sourceOrganization, sourceUrl, description, text, status } = metadata;

  if (!title || typeof title !== 'string' || !title.trim()) {
    const err = new Error('Source title is required');
    err.statusCode = 400;
    throw err;
  }

  const cleanedText = validateSourceContent(text);
  const validatedTopics = validateSourceTopics(topics, category);

  const db = getDb();
  const now = FieldValue.serverTimestamp();

  const docData = {
    title: title.trim(),
    domain: SUPPORTED_DOMAIN,
    topics: validatedTopics,
    category: validatedTopics[0],
    sourceType: sourceType && VALID_SOURCE_TYPES.includes(sourceType) ? sourceType : (sourceUrl ? 'Web Reference' : 'Direct Text Input'),
    sourceOrganization: sourceOrganization ? sourceOrganization.trim() : null,
    sourceUrl: sourceUrl ? sourceUrl.trim() : null,
    description: description ? description.trim() : '',
    extractedText: cleanedText,
    textLength: cleanedText.length,
    extractionMethod: 'direct-input',
    requiresOcr: false,
    status: (status === 'inactive') ? 'inactive' : 'active',
    version: 1,
    createdBy: adminUid || 'admin',
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection('knowledgeSources').add(docData);

  // Log activity
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    await logActivity({
      action: ACTIVITY_ACTIONS.KNOWLEDGE_SOURCE_CREATED,
      category: ACTIVITY_CATEGORIES.KNOWLEDGE_SOURCE,
      message: `Knowledge source "${docData.title}" was created and added to repository.`,
      actorId: adminUid || 'admin',
      targetId: docRef.id,
      user: 'Admin',
      userName: 'Admin',
      role: 'admin',
      status: 'completed',
      metadata: { category: docData.category, topics: docData.topics, domain: SUPPORTED_DOMAIN, sourceType: docData.sourceType },
    });
  } catch (logErr) {
    console.error('[KnowledgeService] Failed to log knowledge source text creation activity:', logErr.message);
  }

  return {
    id: docRef.id,
    ...docData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Updates an existing knowledge source document by ID
 */
async function updateKnowledgeSource(sourceId, adminUid, updateData = {}) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }

  const db = getDb();
  const docRef = db.collection('knowledgeSources').doc(sourceId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const err = new Error('Knowledge source document not found');
    err.statusCode = 404;
    throw err;
  }

  const existing = doc.data();
  const updates = {
    updatedAt: FieldValue.serverTimestamp(),
    version: (existing.version || 1) + 1,
  };

  if (updateData.title !== undefined) {
    if (!updateData.title || typeof updateData.title !== 'string' || !updateData.title.trim()) {
      const err = new Error('Source title cannot be empty');
      err.statusCode = 400;
      throw err;
    }
    updates.title = updateData.title.trim();
  }

  if (updateData.topics !== undefined || updateData.category !== undefined) {
    const validatedTopics = validateSourceTopics(updateData.topics, updateData.category);
    updates.topics = validatedTopics;
    updates.category = validatedTopics[0];
  }

  if (updateData.text !== undefined || updateData.extractedText !== undefined) {
    const textVal = updateData.text !== undefined ? updateData.text : updateData.extractedText;
    const cleanText = validateSourceContent(textVal);
    updates.extractedText = cleanText;
    updates.textLength = cleanText.length;
  }

  if (updateData.sourceType !== undefined) {
    updates.sourceType = updateData.sourceType;
  }
  if (updateData.sourceOrganization !== undefined) {
    updates.sourceOrganization = updateData.sourceOrganization ? updateData.sourceOrganization.trim() : null;
  }
  if (updateData.sourceUrl !== undefined) {
    updates.sourceUrl = updateData.sourceUrl ? updateData.sourceUrl.trim() : null;
  }
  if (updateData.description !== undefined) {
    updates.description = updateData.description ? updateData.description.trim() : '';
  }
  if (updateData.status !== undefined) {
    const normStatus = (updateData.status || '').toLowerCase().trim();
    if (['active', 'inactive'].includes(normStatus)) {
      updates.status = normStatus;
    }
  }

  await docRef.update(updates);

  // Log activity
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    await logActivity({
      action: ACTIVITY_ACTIONS.KNOWLEDGE_SOURCE_UPDATED || 'KNOWLEDGE_SOURCE_UPDATED',
      category: ACTIVITY_CATEGORIES.KNOWLEDGE_SOURCE,
      message: `Knowledge source "${updates.title || existing.title}" was updated by administrator.`,
      actorId: adminUid || 'admin',
      targetId: sourceId,
      user: 'Admin',
      userName: 'Admin',
      role: 'admin',
      status: 'completed',
      metadata: { updatedFields: Object.keys(updates) },
    });
  } catch (logErr) {
    console.error('[KnowledgeService] Failed to log knowledge source update:', logErr.message);
  }

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  };
}

/**
 * Retrieves knowledge sources from Firestore with optional status and category filtering
 */
async function listKnowledgeSources({ status = 'active', category, topic } = {}) {
  if (!isFirebaseInitialized()) {
    return [];
  }

  const db = getDb();
  let query = db.collection('knowledgeSources');

  if (status && status !== 'all' && status !== 'any') {
    query = query.where('status', '==', status);
  }

  const filterTopic = topic || category;
  if (filterTopic && filterTopic.trim()) {
    query = query.where('category', '==', filterTopic.trim());
  }

  const snapshot = await query.get();
  const sources = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.status === 'deleted') return; // Exclude deleted sources

    const formattedTopics = Array.isArray(data.topics) && data.topics.length > 0
      ? data.topics
      : (data.category ? [data.category] : [SUPPORTED_DOMAIN]);

    sources.push({
      id: doc.id,
      title: data.title || data.name || data.originalName || 'Knowledge Source',
      name: data.title || data.name || data.originalName || 'Knowledge Source',
      domain: data.domain || SUPPORTED_DOMAIN,
      topics: formattedTopics,
      category: data.category || formattedTopics[0] || SUPPORTED_DOMAIN,
      description: data.description || '',
      sourceType: data.sourceType || 'Official Documentation',
      sourceOrganization: data.sourceOrganization || null,
      fileName: data.fileName || null,
      originalName: data.originalName || null,
      sourceUrl: data.sourceUrl || null,
      extractedText: data.extractedText || '',
      textLength: data.textLength || (data.extractedText ? data.extractedText.length : 0),
      textPreview: data.extractedText ? data.extractedText.substring(0, 150) + '...' : '',
      extractionMethod: data.extractionMethod || 'direct-input',
      requiresOcr: data.requiresOcr || false,
      status: data.status || 'active',
      version: data.version || 1,
      createdBy: data.createdBy || 'Admin',
      createdAt: data.createdAt ? (typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
      updatedAt: data.updatedAt ? (typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate().toISOString() : data.updatedAt) : null,
    });
  });

  return sources;
}

/**
 * Retrieves a single knowledge source document by ID
 */
async function getKnowledgeSourceById(sourceId) {
  if (!isFirebaseInitialized()) {
    return null;
  }

  const db = getDb();
  const doc = await db.collection('knowledgeSources').doc(sourceId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();
  const formattedTopics = Array.isArray(data.topics) && data.topics.length > 0
    ? data.topics
    : (data.category ? [data.category] : [SUPPORTED_DOMAIN]);

  return {
    id: doc.id,
    domain: SUPPORTED_DOMAIN,
    topics: formattedTopics,
    sourceType: 'Official Documentation',
    sourceOrganization: null,
    ...data,
  };
}

/**
 * Updates status of a knowledge source document (active, inactive, deleted)
 */
async function updateKnowledgeSourceStatus(sourceId, newStatus) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }

  const validStatuses = ['active', 'inactive', 'pending', 'archived', 'deleted'];
  const normStatus = (newStatus || '').toLowerCase().trim();
  if (!validStatuses.includes(normStatus)) {
    const err = new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const db = getDb();
  const docRef = db.collection('knowledgeSources').doc(sourceId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const err = new Error('Knowledge source document not found');
    err.statusCode = 404;
    throw err;
  }

  await docRef.update({
    status: normStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Log activity
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    const isActivated = normStatus === 'active';
    const isDeactivated = normStatus === 'inactive';
    const action = isActivated
      ? ACTIVITY_ACTIONS.KNOWLEDGE_SOURCE_ACTIVATED
      : isDeactivated
      ? ACTIVITY_ACTIONS.KNOWLEDGE_SOURCE_DEACTIVATED
      : 'KNOWLEDGE_SOURCE_STATUS_UPDATED';

    const sourceTitle = doc.data() ? (doc.data().title || doc.data().name || sourceId) : sourceId;
    const message = isActivated
      ? `Knowledge source "${sourceTitle}" was activated by administrator.`
      : isDeactivated
      ? `Knowledge source "${sourceTitle}" was deactivated by administrator.`
      : `Knowledge source "${sourceTitle}" status was changed to ${normStatus}.`;

    await logActivity({
      action,
      category: ACTIVITY_CATEGORIES.KNOWLEDGE_SOURCE,
      message,
      actorId: 'admin',
      targetId: sourceId,
      user: 'Admin',
      userName: 'Admin',
      role: 'admin',
      status: 'completed',
      metadata: { newStatus: normStatus },
    });
  } catch (logErr) {
    console.error('[KnowledgeService] Failed to log knowledge source status update:', logErr.message);
  }

  const updatedDoc = await docRef.get();
  return {
    id: updatedDoc.id,
    ...updatedDoc.data(),
  };
}

/**
 * Soft-deletes a knowledge source document by ID
 */
async function deleteKnowledgeSource(sourceId) {
  if (!isFirebaseInitialized()) {
    throw new Error('Database is not initialized');
  }

  const db = getDb();
  const docRef = db.collection('knowledgeSources').doc(sourceId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const err = new Error('Knowledge source document not found');
    err.statusCode = 404;
    throw err;
  }

  await docRef.update({
    status: 'deleted',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Log deletion activity
  try {
    const { logActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } = require('./activityService');
    const sourceTitle = doc.data() ? (doc.data().title || doc.data().name || sourceId) : sourceId;

    await logActivity({
      action: ACTIVITY_ACTIONS.KNOWLEDGE_SOURCE_DELETED,
      category: ACTIVITY_CATEGORIES.KNOWLEDGE_SOURCE,
      message: `Knowledge source "${sourceTitle}" was deleted by administrator.`,
      actorId: 'admin',
      targetId: sourceId,
      user: 'Admin',
      userName: 'Admin',
      role: 'admin',
      status: 'completed',
      metadata: { status: 'deleted' },
    });
  } catch (logErr) {
    console.error('[KnowledgeService] Failed to log knowledge source deletion:', logErr.message);
  }

  return { success: true, message: 'Knowledge source deleted successfully' };
}

module.exports = {
  createFileKnowledgeSource,
  createTextKnowledgeSource,
  updateKnowledgeSource,
  listKnowledgeSources,
  getKnowledgeSourceById,
  updateKnowledgeSourceStatus,
  deleteKnowledgeSource,
  validateSourceTopics,
  validateSourceContent,
};
