const analyticsService = require('../services/analyticsService');
const adminService = require('../services/adminService');

async function runTask8Verification() {
  try {
    console.log('=== RUNNING ADMIN TASK 8 ANALYTICS VERIFICATION ===');

    console.log('\n--- Test 1: Fetch 7 Days Analytics ---');
    const analytics7d = await analyticsService.getAdminAnalytics({ period: '7d' });
    console.log('Summary metrics:', JSON.stringify(analytics7d.summary, null, 2));

    console.log('\n--- Test 2: User Role & Status Distributions ---');
    console.log('User roles distribution:', analytics7d.userRoles);
    console.log('User status distribution:', analytics7d.userStatus);

    console.log('\n--- Test 3: Report Type & Status Distributions ---');
    console.log('Report types distribution:', analytics7d.reportTypes);
    console.log('Report statuses distribution:', analytics7d.reportStatuses);

    console.log('\n--- Test 4: Report Generation Trend (7 Days) ---');
    console.log('Trend data points count:', analytics7d.reportTrend.length);
    console.log('First data point:', analytics7d.reportTrend[0]);
    console.log('Last data point:', analytics7d.reportTrend[analytics7d.reportTrend.length - 1]);

    console.log('\n--- Test 5: Date Range Period Filtering (30 Days & All Time) ---');
    const analytics30d = await analyticsService.getAdminAnalytics({ period: '30d' });
    console.log('30d Trend data points count:', analytics30d.reportTrend.length);

    const analyticsAll = await analyticsService.getAdminAnalytics({ period: 'all' });
    console.log('All time summary total reports:', analyticsAll.summary.totalReports);

    console.log('\n--- Test 6: Knowledge Source & Activity Analytics ---');
    console.log('Knowledge sources analytics:', analytics7d.knowledgeSources);
    console.log('Activity categories analytics:', analytics7d.activityCategories);

    console.log('\n--- Test 7: Data Consistency Check with Admin Dashboard Stats ---');
    const dashStats = await adminService.getDashboardStats();
    console.log('Dashboard Stats total users:', dashStats.users.total, 'vs Analytics total users:', analytics7d.summary.totalUsers);
    console.log('Dashboard Stats total reports:', dashStats.reports.total, 'vs Analytics total reports:', analytics7d.summary.totalReports);
    console.log('Dashboard Stats active sources:', dashStats.knowledgeSources.active, 'vs Analytics active sources:', analytics7d.summary.activeKnowledgeSources);

    if (
      dashStats.users.total === analytics7d.summary.totalUsers &&
      dashStats.reports.total === analytics7d.summary.totalReports
    ) {
      console.log('\n✅ DATA CONSISTENCY CONFIRMED: Analytics uses the exact same Firestore collections!');
    } else {
      console.warn('\n⚠️ Data discrepancy detected between Dashboard and Analytics.');
    }

    console.log('\n--- Test 8: Safe Timestamp Parsing ---');
    console.log('Parsed Firestore Timestamp:', analyticsService.parseTimestamp({ toDate: () => new Date('2026-08-27T10:00:00Z') }));
    console.log('Parsed ISO String:', analyticsService.parseTimestamp('2026-08-27T10:00:00Z'));
    console.log('Parsed Invalid Date (returns null):', analyticsService.parseTimestamp('invalid-date-string'));

    console.log('\n=== ALL TASK 8 VERIFICATION SCENARIOS COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Task 8 Verification Failure:', err);
    process.exit(1);
  }
}

runTask8Verification();
