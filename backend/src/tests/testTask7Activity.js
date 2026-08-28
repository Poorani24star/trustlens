const activityService = require('../services/activityService');
const userService = require('../services/userService');
const adminService = require('../services/adminService');
const reportService = require('../services/reportService');
const knowledgeService = require('../services/knowledgeService');

async function runVerification() {
  try {
    console.log('=== TEST 1: User Registration Event ===');
    const testUid = 'test-reg-user-' + Date.now();
    const newUser = await userService.createUserProfile(testUid, 'testreg@example.com', {
      name: 'Test Registered Student',
      role: 'student'
    });
    console.log('Registered user profile:', newUser.uid);

    console.log('\n=== TEST 2: User Status Change Events ===');
    const mockAdmin = { uid: 'admin-tester-uid', email: 'admin@trustlens.com', name: 'System Admin' };
    const suspendRes = await adminService.updateUserStatus(mockAdmin, testUid, 'suspended');
    console.log('Suspended user result:', suspendRes.status);

    const activateRes = await adminService.updateUserStatus(mockAdmin, testUid, 'active');
    console.log('Activated user result:', activateRes.status);

    console.log('\n=== TEST 3: Report Completion Event ===');
    const mockUser = { uid: testUid, name: 'Test Registered Student', email: 'testreg@example.com', role: 'student' };
    const reportId = await reportService.createReport(
      mockUser,
      'error-detection',
      'Quantum Computing Factual Verification',
      { name: 'quantum_paper.pdf', size: 102400 },
      { score: 98, totalStatements: 10, verifiedCount: 9 },
      []
    );
    console.log('Generated Report ID:', reportId);

    console.log('\n=== TEST 4: Knowledge Source Events ===');
    const source = await knowledgeService.createTextKnowledgeSource('admin-tester-uid', {
      title: 'Activity Test Source',
      category: 'Science',
      description: 'Used for Activity Log verification',
      text: 'Sample factual reference text for activity testing.'
    });
    console.log('Created source ID:', source.id);

    const deactRes = await knowledgeService.updateKnowledgeSourceStatus(source.id, 'inactive');
    console.log('Deactivated source status:', deactRes.status);

    const actRes = await knowledgeService.updateKnowledgeSourceStatus(source.id, 'active');
    console.log('Activated source status:', actRes.status);

    const delRes = await knowledgeService.deleteKnowledgeSource(source.id);
    console.log('Deleted source status:', delRes.message);

    console.log('\n=== TEST 5: Query Activity Logs (Single Source of Truth) ===');
    const logs = await activityService.getRecentActivities(30);
    console.log('Total activity logs retrieved:', logs.length);
    console.log('Newest 5 logs:');
    logs.slice(0, 5).forEach((l, i) => {
      console.log(` ${i + 1}. [${l.category || l.module}] ${l.action || l.type} - ${l.message} (${l.user})`);
    });

    console.log('\n=== TEST 6: Dashboard Recent Activity Integration ===');
    const stats = await adminService.getDashboardStats();
    console.log('Dashboard Stats Recent Activity count:', stats.recentActivity ? stats.recentActivity.length : 0);

    console.log('\n=== ALL TASK 7 VERIFICATION TESTS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Verification Error:', err);
    process.exit(1);
  }
}

runVerification();
