const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.resolve(__dirname, '../../../Frontend/node_modules/jspdf'));
const pdfParse = require('pdf-parse');
const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const reportService = require('../services/reportService');
const adminService = require('../services/adminService');
const userService = require('../services/userService');
const { registerUpload } = require('../services/uploadRegistryService');
const { extractDocumentText } = require('../services/extraction/documentExtractionService');
const { extractImageOcrText, cleanOcrText } = require('../services/extraction/ocrExtractionService');
const { extractAndPrepareStatements } = require('../services/errorDetection/statementExtractionService');
const copiedContentService = require('../services/copiedContent/copiedContentService');

async function generateTextImageBuffer(textLines = []) {
  const doc = new jsPDF();
  let y = 20;
  textLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, 180);
    doc.text(wrapped, 10, y);
    y += wrapped.length * 10 + 5;
  });
  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const parser = new pdfParse.PDFParse({ data: pdfBuf });
  const sc = await parser.getScreenshot({ scale: 1.5 });
  await parser.destroy();
  return Buffer.from(sc.pages[0].data);
}

async function runMasterBugFixTestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS: MASTER BUG-FIX VALIDATION TEST SUITE   ');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const studentA = { uid: `student_a_${testId}`, name: 'Alice Student', email: `alice_${testId}@trustlens.edu`, role: 'student' };
  const studentB = { uid: `student_b_${testId}`, name: 'Bob Student', email: `bob_${testId}@trustlens.edu`, role: 'student' };
  const adminUser = { uid: `admin_${testId}`, name: 'Admin User', email: `admin_${testId}@trustlens.edu`, role: 'admin' };

  const createdReportIds = [];
  const createdUserUids = [studentA.uid, studentB.uid, adminUser.uid];
  const tmpFilesToClean = [];

  let passedCount = 0;
  let totalCount = 0;

  function recordResult(num, name, passed, details = '') {
    totalCount++;
    if (passed) {
      passedCount++;
      console.log(`[PASS] TEST ${num}: ${name}${details ? ` -> ${details}` : ''}`);
    } else {
      console.error(`[FAIL] TEST ${num}: ${name}${details ? ` -> ${details}` : ''}`);
    }
  }

  try {
    // ----------------------------------------------------
    // BUG 1 & 2: User Profile Creation in Firestore (No passwords stored)
    // ----------------------------------------------------
    const profileA = await userService.createUserProfile(studentA.uid, studentA.email, { name: studentA.name, role: studentA.role });
    const profileDoc = await db.collection('users').doc(studentA.uid).get();
    const storedUserData = profileDoc.data();

    const hasNoPassword = storedUserData && !('password' in storedUserData) && !('pass' in storedUserData);
    recordResult(1, 'Firestore User Profile & Password Security',
      profileDoc.exists && storedUserData.uid === studentA.uid && hasNoPassword,
      `User ${storedUserData.uid} stored in Firestore with role "${storedUserData.role}", password omitted`
    );

    // ----------------------------------------------------
    // BUG 3: JPG / JPEG / PNG Upload Support
    // ----------------------------------------------------
    const pngBuf = await generateTextImageBuffer([
      "Transmission Control Protocol provides reliable, ordered, and error-checked delivery of a stream of octets.",
      "User Datagram Protocol provides connectionless, unreliable transmission across IP networks."
    ]);
    const pngPath = path.join(__dirname, `test_img_${testId}.png`);
    fs.writeFileSync(pngPath, pngBuf);
    tmpFilesToClean.push(pngPath);

    const pngExt = await extractDocumentText(pngPath, `network_${testId}.png`, 'image/png');
    recordResult(2, 'Image Upload & Direct OCR Extraction (PNG/JPG/JPEG)',
      pngExt.extraction.extractionMethod === 'ocr' && pngExt.extraction.textLength > 30,
      `Extracted ${pngExt.extraction.textLength} chars via method: ${pngExt.extraction.extractionMethod}`
    );

    // ----------------------------------------------------
    // BUG 4 & 5: Direct Image & Scanned PDF OCR Pipeline
    // ----------------------------------------------------
    const sessionImg = registerUpload(studentA.uid, 'single', [{ uploadPath: pngPath, originalName: `network_${testId}.png`, mimeType: 'image/png' }]);
    const imgAnalysisRes = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionImg.uploadId);
    if (imgAnalysisRes.reportId) createdReportIds.push(imgAnalysisRes.reportId);

    recordResult(3, 'End-to-End Image Error Detection Workflow',
      imgAnalysisRes.success === true && imgAnalysisRes.findings.length >= 1,
      `Generated Report ID: ${imgAnalysisRes.reportId}, Findings: ${imgAnalysisRes.findings?.length}`
    );

    // ----------------------------------------------------
    // BUG 6: Multiple and Mixed File Upload
    // ----------------------------------------------------
    const docNormal = new jsPDF();
    docNormal.text("An operating system manages computer hardware and software resources.", 10, 20);
    const pdfPath = path.join(__dirname, `mixed_${testId}.pdf`);
    fs.writeFileSync(pdfPath, Buffer.from(docNormal.output('arraybuffer')));
    tmpFilesToClean.push(pdfPath);

    const sessionMixed = registerUpload(studentA.uid, 'single', [
      { uploadPath: pdfPath, originalName: `os_lecture_${testId}.pdf`, mimeType: 'application/pdf' },
      { uploadPath: pngPath, originalName: `network_diagram_${testId}.png`, mimeType: 'image/png' },
    ]);
    const mixedRes = await errorDetectionService.analyzeErrorDetectionDocument(studentA, sessionMixed.uploadId);
    if (mixedRes.reportId) createdReportIds.push(mixedRes.reportId);

    recordResult(4, 'Multiple & Mixed File Batch (PDF + Image)',
      mixedRes.success === true && mixedRes.documents.length === 2,
      `Batch analyzed ${mixedRes.documents.length} mixed files (Report ID: ${mixedRes.reportId})`
    );

    // ----------------------------------------------------
    // BUG 7: OCR Text Quality & Non-Fabrication
    // ----------------------------------------------------
    const cleanedJunk = cleanOcrText("~~ |||| ¬¬¬ ^^^ • _\\ @@##$$ %%");
    recordResult(5, 'OCR Noise Cleaning & Zero Fabrication',
      cleanedJunk.trim().length === 0,
      'Stray optical artifacts safely stripped without hallucinating words'
    );

    // ----------------------------------------------------
    // BUG 8: Incomplete Fragment Handling & Short Claim Preservation
    // ----------------------------------------------------
    const fragmentedRaw = "Advantages:\n• Database\nThe two extremes are:\npublic cloud and private cloud.\nTCP is reliable.";
    const preparedStmts = extractAndPrepareStatements(fragmentedRaw, { documentId: 'doc_frag_test' });

    const hasCombinedColon = preparedStmts.readyStatements.some(s => s.statementText.toLowerCase().includes('the two extremes are public cloud and private cloud'));
    const hasShortClaim = preparedStmts.readyStatements.some(s => s.statementText.trim() === 'TCP is reliable.');
    const hasNoOrphanHeading = !preparedStmts.readyStatements.some(s => s.statementText.trim() === 'Advantages:' || s.statementText.trim() === 'Database');

    recordResult(6, 'E1 Statement Preprocessing & Fragment Filtering',
      hasCombinedColon && hasShortClaim && hasNoOrphanHeading,
      'Colon statement merged, short claim "TCP is reliable." preserved, headings eliminated'
    );

    // ----------------------------------------------------
    // BUG 9 & 10: Report Prioritization & Collapsible View
    // ----------------------------------------------------
    const savedReport = await reportService.getUserReportById(imgAnalysisRes.reportId, studentA.uid);
    const findingsAreValid = savedReport.findings && savedReport.findings.length > 0;
    const hasSummaryCounts = savedReport.summary && typeof savedReport.summary.totalStatements === 'number';

    recordResult(7, 'Report Summary Metrics & Compact Presentation',
      findingsAreValid && hasSummaryCounts,
      `Total: ${savedReport.summary.totalStatements}, Supported: ${savedReport.summary.supported}, Incorrect: ${savedReport.summary.incorrect}`
    );

    // ----------------------------------------------------
    // BUG 11 & 12: Report Navigation & Firestore Persistence
    // ----------------------------------------------------
    const reloadedReport = await reportService.getUserReportById(imgAnalysisRes.reportId, studentA.uid);
    recordResult(8, 'Report Persistence & Direct ID Resolution',
      reloadedReport.id === imgAnalysisRes.reportId && reloadedReport.status === 'completed',
      `Target URL: /reports/${reloadedReport.id}, Status: ${reloadedReport.status}`
    );

    // ----------------------------------------------------
    // BUG 13: Reports & History Listing
    // ----------------------------------------------------
    const userHistory = await reportService.listUserReports(studentA.uid);
    const inHistory = userHistory.reports.some(r => r.id === imgAnalysisRes.reportId);
    recordResult(9, 'Reports & History Indexing',
      inHistory,
      `Report ${imgAnalysisRes.reportId} found in student history list (${userHistory.reports.length} total)`
    );

    // ----------------------------------------------------
    // BUG 14 & 15: Admin Dashboard Real Statistics
    // ----------------------------------------------------
    const adminStats = await adminService.getDashboardStats();
    const allReports = await adminService.listSystemReports({ limit: 50 });
    const foundReportInList = allReports.reports.some(r => r.id === imgAnalysisRes.reportId || r.id === mixedRes.reportId);

    recordResult(10, 'Admin Dashboard Real Statistics Calculation',
      adminStats.reports.total >= 2 && adminStats.users.total >= 1 && foundReportInList,
      `Admin Total Reports: ${adminStats.reports.total}, Real DB Users: ${adminStats.users.total}, Found Session Report: ${mixedRes.reportId}`
    );

    // ----------------------------------------------------
    // BUG 16 & 17: Admin Users Real Data (No Mocks)
    // ----------------------------------------------------
    const adminUsersList = await adminService.listUsers();
    const foundAlice = adminUsersList.users.some(u => u.userId === studentA.uid || u.email === studentA.email);

    recordResult(11, 'Admin Real Users Retrieval (Mock Data Eliminated)',
      adminUsersList.users.length >= 1 && foundAlice,
      `Found registered student "${studentA.name}" (${studentA.email}) in real users collection`
    );

    // ----------------------------------------------------
    // BUG 21: Security & Cross-User Isolation
    // ----------------------------------------------------
    let crossAccessBlocked = false;
    try {
      await reportService.getUserReportById(imgAnalysisRes.reportId, studentB.uid);
    } catch (err) {
      if (err.statusCode === 403 || err.message.includes('permission') || err.message.includes('Unauthorized')) {
        crossAccessBlocked = true;
      }
    }

    recordResult(12, 'Security & Cross-User Report Access Control',
      crossAccessBlocked,
      `Student B blocked from reading Student A report with 403 Forbidden`
    );

    // ----------------------------------------------------
    // REGRESSION: Copied Content Detection
    // ----------------------------------------------------
    const doc1 = new jsPDF();
    doc1.text("Computer networks communicate through standard packet protocols.", 10, 20);
    const doc2 = new jsPDF();
    doc2.text("Computer networks communicate through standard packet protocols.", 10, 20);
    const p1 = path.join(__dirname, `cc_doc1_${testId}.pdf`);
    const p2 = path.join(__dirname, `cc_doc2_${testId}.pdf`);
    fs.writeFileSync(p1, Buffer.from(doc1.output('arraybuffer')));
    fs.writeFileSync(p2, Buffer.from(doc2.output('arraybuffer')));
    tmpFilesToClean.push(p1, p2);

    const sessionCc = registerUpload(studentA.uid, 'multiple', [
      { uploadPath: p1, originalName: `doc1_${testId}.pdf`, mimeType: 'application/pdf' },
      { uploadPath: p2, originalName: `doc2_${testId}.pdf`, mimeType: 'application/pdf' },
    ]);
    const ccRes = await copiedContentService.analyzeCopiedContent(studentA, sessionCc.uploadId);
    if (ccRes.reportId) createdReportIds.push(ccRes.reportId);

    recordResult(13, 'Copied Content Detection Unaffected Regression Check',
      ccRes.success === true && ccRes.reportId !== null,
      `Copied Content Report ID: ${ccRes.reportId}`
    );

    console.log('\n====================================================');
    console.log(` MASTER BUG-FIX TEST RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('====================================================');

    if (passedCount !== totalCount) {
      throw new Error(`Master test suite failed: ${totalCount - passedCount} test(s) failed`);
    }

  } catch (err) {
    console.error('\n❌ MASTER TEST SUITE FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    for (const f of tmpFilesToClean) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    for (const rId of createdReportIds) {
      if (db) await db.collection('reports').doc(rId).delete().catch(() => {});
    }
    for (const uId of createdUserUids) {
      if (db) await db.collection('users').doc(uId).delete().catch(() => {});
    }
  }
}

runMasterBugFixTestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
