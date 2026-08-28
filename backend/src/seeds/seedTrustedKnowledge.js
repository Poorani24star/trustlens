const { getDb, isFirebaseInitialized } = require('../config/firebaseAdmin');
const { createTextKnowledgeSource } = require('../services/knowledgeService');
const { TRUSTED_KNOWLEDGE_SEED } = require('./trustedKnowledgeSeedData');

/**
 * Seeds the TrustLens Firestore Knowledge Repository with trusted Computer Science entries.
 * Idempotent: Checks for existing entries by seedId or title + primary topic to prevent duplicates.
 */
async function seedTrustedKnowledge() {
  console.log('====================================================');
  console.log(' SEEDING TRUSTED COMPUTER SCIENCE KNOWLEDGE BASE    ');
  console.log('====================================================\n');

  if (!isFirebaseInitialized()) {
    console.error('❌ Firebase Admin SDK is not initialized.');
    process.exit(1);
  }

  const db = getDb();
  const collectionRef = db.collection('knowledgeSources');

  let addedCount = 0;
  let skippedCount = 0;
  let totalCount = TRUSTED_KNOWLEDGE_SEED.length;

  for (let i = 0; i < TRUSTED_KNOWLEDGE_SEED.length; i++) {
    const entry = TRUSTED_KNOWLEDGE_SEED[i];
    const primaryTopic = entry.topics[0];

    // Check duplicate by seedId OR (title + primary topic)
    let existingQuery = await collectionRef
      .where('title', '==', entry.title)
      .where('category', '==', primaryTopic)
      .get();

    if (existingQuery.empty) {
      // Secondary check by seedId
      const seedIdQuery = await collectionRef
        .where('seedId', '==', entry.seedId)
        .get();
      if (!seedIdQuery.empty) {
        existingQuery = seedIdQuery;
      }
    }

    if (!existingQuery.empty) {
      console.log(`  [SKIP] (${i + 1}/${totalCount}) "${entry.title}" already exists in ${primaryTopic}.`);
      skippedCount++;
      continue;
    }

    // Insert knowledge source using knowledgeService
    try {
      const result = await createTextKnowledgeSource('system_seed', {
        title: entry.title,
        category: primaryTopic,
        topics: entry.topics,
        sourceType: entry.sourceType,
        sourceOrganization: entry.sourceOrganization,
        sourceUrl: entry.sourceUrl,
        description: entry.description,
        text: entry.text,
        status: entry.status || 'active',
        seedId: entry.seedId,
      });

      // Also set seedId explicitly on the doc for future idempotency
      if (result.id && entry.seedId) {
        await collectionRef.doc(result.id).update({ seedId: entry.seedId });
      }

      console.log(`  [ADDED] (${i + 1}/${totalCount}) "${entry.title}" [${entry.topics.join(', ')}] (ID: ${result.id})`);
      addedCount++;
    } catch (err) {
      console.error(`  ❌ Failed to seed "${entry.title}":`, err.message);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(` SEEDING COMPLETED SUCCESSFULY!`);
  console.log(` Total inspected: ${totalCount}`);
  console.log(` Newly Added:     ${addedCount}`);
  console.log(` Skipped:         ${skippedCount}`);
  console.log('----------------------------------------------------');

  return { total: totalCount, added: addedCount, skipped: skippedCount };
}

// Execute script if run directly from command line
if (require.main === module) {
  seedTrustedKnowledge()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ Unhandled Seeding Error:', err);
      process.exit(1);
    });
}

module.exports = {
  seedTrustedKnowledge,
};
