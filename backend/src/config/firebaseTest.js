const { getDb, isFirebaseInitialized, getInitError } = require('./firebaseAdmin');

/**
 * Tests Firebase Admin SDK initialization and Firestore connectivity.
 * Perform a lightweight read operation (listCollections) to confirm connection.
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testFirestoreConnection() {
  if (!isFirebaseInitialized()) {
    return {
      success: false,
      message: getInitError() || 'Firebase credentials not configured.'
    };
  }

  try {
    const db = getDb();
    if (!db) {
      return {
        success: false,
        message: 'Firestore database instance not available.'
      };
    }

    // Lightweight connection check — list top-level collections
    await db.listCollections();

    return {
      success: true,
      message: 'Firebase and Firestore are connected successfully'
    };
  } catch (err) {
    console.error('[Firebase Test] Connection test failed:', err.message);
    return {
      success: false,
      message: 'Unable to connect to Firebase: ' + (err.message || 'Unknown error')
    };
  }
}

module.exports = {
  testFirestoreConnection,
};
