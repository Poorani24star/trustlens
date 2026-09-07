const assert = require('assert');
const { createReport, getUserReportStats } = require('../services/reportService');
const adminService = require('../services/adminService');

console.log('====================================================');
console.log(' TRUSTLENS: ADMIN REPORT SUMMARY DATA FIX TEST SUITE');
console.log('====================================================\n');

const testResults = [];
let passedCount = 0;

function recordTest(index, name, passed, details = '') {
  testResults.push({ index, name, passed, details });
  if (passed) passedCount++;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] TEST ${index}: ${name} -> ${details}`);
}

async function runAdminSummaryTestSuite() {
  const timestamp = Date.now();
  const studentUser = { uid: `student_sum_${timestamp}`, name: 'Alice Student', email: `student_${timestamp}@trustlens.edu`, role: 'student' };
  const facultyUser = { uid: `faculty_sum_${timestamp}`, name: 'Dr. Bob', email: `faculty_${timestamp}@trustlens.edu`, role: 'faculty' };
  const adminUser = { uid: `admin_sum_${timestamp}`, name: 'System Admin', email: `admin_${timestamp}@trustlens.edu`, role: 'admin' };

  // Create 1 Error Detection report by student
  const rep1Id = await createReport(
    studentUser,
    'error-detection',
    'Error Detection Test - Algorithms.pdf',
    { originalName: 'Algorithms.pdf' },
    { totalStatements: 2, supported: 2, incorrect: 0 },
    [{ index: 1, statement: 'Quicksort average time complexity is O(n log n).', classification: 'SUPPORTED' }]
  );

  // Create 1 Copied Content report by faculty
  const rep2Id = await createReport(
    facultyUser,
    'copied-content',
    'Copied Content Test - 2 Docs',
    [{ originalName: 'DocA.pdf' }, { originalName: 'DocB.pdf' }],
    { totalPairsCompared: 1, matchingPairs: 1, overallSimilarity: '90%' },
    [{ pairId: 'pair_1_2', overallMatchedContentPercentage: 90, matches: [{ matchType: 'exact_match', similarity: 90 }] }]
  );

  // --------------------------------------------------------------------------
  // TEST 1: adminService.getDashboardStats() returns real system totals (> 0)
  // --------------------------------------------------------------------------
  try {
    const stats = await adminService.getDashboardStats();
    const repStats = stats.reports;
    const passed = repStats.total >= 2 &&
                   repStats.errorDetection >= 1 &&
                   repStats.copiedContent >= 1 &&
                   repStats.completed >= 2;

    recordTest(1, 'Admin Dashboard Aggregated Statistics', passed,
      `Total Reports: ${repStats.total}, Error Detection: ${repStats.errorDetection}, Copied Content: ${repStats.copiedContent}, Completed: ${repStats.completed}`);
  } catch (err) {
    recordTest(1, 'Admin Dashboard Aggregated Statistics', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: adminService.listSystemReports() lists all system reports
  // --------------------------------------------------------------------------
  try {
    const res = await adminService.listSystemReports({ limit: 500 });
    const hasRep1 = res.reports.some(r => r.id === rep1Id);
    const hasRep2 = res.reports.some(r => r.id === rep2Id);
    const passed = res.reports.length >= 2 && hasRep1 && hasRep2;

    recordTest(2, 'Admin System Reports Listing Across All Users', passed,
      `Retrieved ${res.reports.length} system reports (Included rep1: ${hasRep1}, rep2: ${hasRep2})`);
  } catch (err) {
    recordTest(2, 'Admin System Reports Listing Across All Users', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Student personal stats isolation (Only student's own reports)
  // --------------------------------------------------------------------------
  try {
    const studentStats = await getUserReportStats(studentUser.uid);
    const passed = studentStats.totalReports === 1 &&
                   studentStats.errorDetectionReports === 1 &&
                   studentStats.copiedContentReports === 0;

    recordTest(3, 'Student Report Stats Isolation', passed,
      `Student Own Reports: ${studentStats.totalReports} (Error Detection: ${studentStats.errorDetectionReports}, Copied: ${studentStats.copiedContentReports})`);
  } catch (err) {
    recordTest(3, 'Student Report Stats Isolation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Faculty personal stats isolation (Only faculty's own reports)
  // --------------------------------------------------------------------------
  try {
    const facultyStats = await getUserReportStats(facultyUser.uid);
    const passed = facultyStats.totalReports === 1 &&
                   facultyStats.errorDetectionReports === 0 &&
                   facultyStats.copiedContentReports === 1;

    recordTest(4, 'Faculty Report Stats Isolation', passed,
      `Faculty Own Reports: ${facultyStats.totalReports} (Error Detection: ${facultyStats.errorDetectionReports}, Copied: ${facultyStats.copiedContentReports})`);
  } catch (err) {
    recordTest(4, 'Faculty Report Stats Isolation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Admin role /api/reports/stats/summary returns platform-wide totals
  // --------------------------------------------------------------------------
  try {
    const reportController = require('../controllers/reportController');
    let jsonResult = null;
    const mockReq = { user: adminUser };
    const mockRes = {
      status: (code) => ({
        json: (data) => { jsonResult = data; return data; }
      })
    };
    await reportController.getReportStats(mockReq, mockRes, () => {});

    const stats = jsonResult?.stats;
    const passed = jsonResult?.success === true &&
                   stats.totalReports >= 2 &&
                   stats.errorDetectionReports >= 1 &&
                   stats.copiedContentReports >= 1;

    recordTest(5, 'Admin GET /api/reports/stats/summary returns platform-wide data', passed,
      `Admin Summary Stats -> Total: ${stats?.totalReports}, Error: ${stats?.errorDetectionReports}, Copied: ${stats?.copiedContentReports}`);
  } catch (err) {
    recordTest(5, 'Admin GET /api/reports/stats/summary returns platform-wide data', false, err.message);
  }

  console.log('\n====================================================');
  console.log(` ADMIN SUMMARY TEST RESULTS: ${passedCount} / ${testResults.length} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedCount !== testResults.length) {
    throw new Error(`Admin Summary test suite failed: ${testResults.length - passedCount} test(s) failed`);
  }
}

runAdminSummaryTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ ADMIN SUMMARY TEST FATAL ERROR:', err.message);
    process.exit(1);
  });
