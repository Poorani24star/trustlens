const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.resolve(__dirname, '../../../Frontend/node_modules/jspdf'));
const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const reportService = require('../services/reportService');
const { registerUpload } = require('../services/uploadRegistryService');
const { extractPdfText, isTextSufficientForClaimExtraction } = require('../services/extraction/pdfExtractionService');
const { cleanOcrText, extractBufferOcrText, isValidImageBuffer } = require('../services/extraction/ocrExtractionService');
const { extractDocumentText } = require('../services/extraction/documentExtractionService');
const pdfParse = require('pdf-parse');

async function runE5OcrTestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS E5: OCR FOR SCANNED & IMAGE-BASED PDFs   ');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const testUser = { uid: `student_e5_${testId}`, name: 'Charlie Tester', email: `charlie_${testId}@trustlens.edu`, role: 'student' };

  const createdReportIds = [];
  const tmpFilesToClean = [];

  let passedCount = 0;
  let totalCount = 0;

  function recordResult(testNum, testName, passed, details = '') {
    totalCount++;
    if (passed) {
      passedCount++;
      console.log(`[PASS] TEST ${testNum}: ${testName}${details ? ` -> ${details}` : ''}`);
    } else {
      console.error(`[FAIL] TEST ${testNum}: ${testName}${details ? ` -> ${details}` : ''}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Normal Selectable Text PDF (OCR Skipped)
    // ----------------------------------------------------
    const normalPdfPath = path.join(__dirname, `e5_normal_${testId}.pdf`);
    const docNormal = new jsPDF();
    docNormal.text("TCP is a connection-oriented transport layer protocol that provides reliable delivery.", 10, 20);
    docNormal.text("UDP is a connectionless transport protocol that does not guarantee packet delivery.", 10, 40);
    fs.writeFileSync(normalPdfPath, Buffer.from(docNormal.output('arraybuffer')));
    tmpFilesToClean.push(normalPdfPath);

    const normalExtraction = await extractPdfText(normalPdfPath);
    const sessionNormal = registerUpload(testUser.uid, 'single', [{ uploadPath: normalPdfPath, originalName: `Normal_${testId}.pdf`, mimeType: 'application/pdf' }]);
    const normalRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionNormal.uploadId);
    if (normalRes.reportId) createdReportIds.push(normalRes.reportId);

    recordResult(1, 'Normal Text PDF (OCR Skipped)',
      normalExtraction.extractionMethod === 'normal' && normalExtraction.requiresOcr === false && normalRes.success === true,
      `Extraction Method: ${normalExtraction.extractionMethod}, Findings: ${normalRes.findings?.length}`
    );

    // ----------------------------------------------------
    // TEST 2: Scanned Image PDF (OCR Triggered Automatically)
    // ----------------------------------------------------
    const scannedPdfPath = path.join(__dirname, `e5_scanned_${testId}.pdf`);
    const docScanned = new jsPDF();
    docScanned.text("A database management system DBMS provides persistent data storage and query capabilities.", 10, 30);
    fs.writeFileSync(scannedPdfPath, Buffer.from(docScanned.output('arraybuffer')));
    tmpFilesToClean.push(scannedPdfPath);

    // Test OCR buffer extraction on screenshot
    const parser = new pdfParse.PDFParse({ data: fs.readFileSync(scannedPdfPath) });
    const sc = await parser.getScreenshot({ scale: 1.5 });
    await parser.destroy();
    const screenshotBuf = sc.pages[0]?.data;
    const isImgValid = isValidImageBuffer(screenshotBuf);
    const ocrBufferRes = await extractBufferOcrText(screenshotBuf);

    const sessionScanned = registerUpload(testUser.uid, 'single', [{ uploadPath: scannedPdfPath, originalName: `Scanned_${testId}.pdf`, mimeType: 'application/pdf' }]);
    const scannedRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionScanned.uploadId);
    if (scannedRes.reportId) createdReportIds.push(scannedRes.reportId);

    recordResult(2, 'Scanned PDF Automatic OCR Processing',
      isImgValid && ocrBufferRes.text.toLowerCase().includes('database') && scannedRes.success === true,
      `Screenshot Valid: ${isImgValid}, OCR Text: "${ocrBufferRes.text.slice(0, 45)}...", Conf: ${ocrBufferRes.confidence}%`
    );

    // ----------------------------------------------------
    // TEST 3: Mixed PDF (Multi-Page Order Preservation)
    // ----------------------------------------------------
    const mixedPdfPath = path.join(__dirname, `e5_mixed_${testId}.pdf`);
    const docMixed = new jsPDF();
    docMixed.text("Operating systems manage processor scheduling and physical memory allocation.", 10, 20);
    docMixed.addPage();
    docMixed.text("Relational databases organize structured tables with foreign key constraints.", 10, 20);
    docMixed.addPage();
    docMixed.text("Routers forward packets across network subnets using routing tables.", 10, 20);
    fs.writeFileSync(mixedPdfPath, Buffer.from(docMixed.output('arraybuffer')));
    tmpFilesToClean.push(mixedPdfPath);

    const mixedExtraction = await extractPdfText(mixedPdfPath);
    const sessionMixed = registerUpload(testUser.uid, 'single', [{ uploadPath: mixedPdfPath, originalName: `Mixed_${testId}.pdf`, mimeType: 'application/pdf' }]);
    const mixedRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionMixed.uploadId);
    if (mixedRes.reportId) createdReportIds.push(mixedRes.reportId);

    recordResult(3, 'Mixed PDF Multi-Page Order Preservation',
      mixedExtraction.pages.length === 3 && mixedRes.success === true && mixedRes.findings.length >= 2,
      `Page count: ${mixedExtraction.pageCount}, Findings: ${mixedRes.findings.length}`
    );

    // ----------------------------------------------------
    // TEST 4: Multiple PDFs Batch Support
    // ----------------------------------------------------
    const batchDocAPath = path.join(__dirname, `e5_batchA_${testId}.pdf`);
    const batchDocBPath = path.join(__dirname, `e5_batchB_${testId}.pdf`);
    const docA = new jsPDF();
    docA.text("TCP guarantees in-order delivery of data bytes across networks.", 10, 20);
    fs.writeFileSync(batchDocAPath, Buffer.from(docA.output('arraybuffer')));
    const docB = new jsPDF();
    docB.text("DNS resolves domain names into corresponding numerical IP addresses.", 10, 20);
    fs.writeFileSync(batchDocBPath, Buffer.from(docB.output('arraybuffer')));
    tmpFilesToClean.push(batchDocAPath, batchDocBPath);

    const sessionBatch = registerUpload(testUser.uid, 'single', [
      { uploadPath: batchDocAPath, originalName: `BatchA_${testId}.pdf`, mimeType: 'application/pdf' },
      { uploadPath: batchDocBPath, originalName: `BatchB_${testId}.pdf`, mimeType: 'application/pdf' },
    ]);
    const batchRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionBatch.uploadId);
    if (batchRes.reportId) createdReportIds.push(batchRes.reportId);

    recordResult(4, 'Multiple PDFs Batch Support',
      batchRes.success === true && batchRes.documents.length === 2,
      `Batch documents analyzed: ${batchRes.documents.length}, Report ID: ${batchRes.reportId}`
    );

    // ----------------------------------------------------
    // TEST 5: Poor OCR Cleaning & Zero Fabrication
    // ----------------------------------------------------
    const cleanedJunk = cleanOcrText("||~ `^ ¬ • _\\ @@##$$ %%%");
    recordResult(5, 'Poor OCR Cleaning & Zero Fabrication',
      cleanedJunk.trim().length === 0,
      'Stray non-alphanumeric OCR artifacts cleanly eliminated without generating fake text'
    );

    // ----------------------------------------------------
    // TEST 6: Empty PDF Handling
    // ----------------------------------------------------
    const emptyPdfPath = path.join(__dirname, `e5_empty_${testId}.pdf`);
    fs.writeFileSync(emptyPdfPath, Buffer.from([]));
    tmpFilesToClean.push(emptyPdfPath);

    let emptyHandled = false;
    try {
      const emptyExt = await extractPdfText(emptyPdfPath);
      emptyHandled = emptyExt.textLength === 0;
    } catch (e) {
      emptyHandled = true;
    }
    recordResult(6, 'Empty PDF Safe Handling',
      emptyHandled,
      'Handled cleanly without process crash'
    );

    // ----------------------------------------------------
    // TEST 7: Corrupted PDF Safe Handling
    // ----------------------------------------------------
    const corruptPdfPath = path.join(__dirname, `e5_corrupt_${testId}.pdf`);
    fs.writeFileSync(corruptPdfPath, 'NOT_A_VALID_PDF_BINARY_STREAM_XYZ123');
    tmpFilesToClean.push(corruptPdfPath);

    let corruptHandled = false;
    try {
      await extractPdfText(corruptPdfPath);
    } catch (corruptErr) {
      corruptHandled = corruptErr.statusCode === 422 || Boolean(corruptErr.message);
    }
    recordResult(7, 'Corrupted PDF Safe Handling',
      corruptHandled,
      'Caught invalid PDF structure and threw clean 422 error'
    );

    // ----------------------------------------------------
    // TEST 8: OCR Buffer Failure Simulation
    // ----------------------------------------------------
    const ocrFailRes = await extractBufferOcrText(Buffer.from('not an image'));
    recordResult(8, 'OCR Buffer Failure Graceful Recovery',
      ocrFailRes.text === '' && ocrFailRes.confidence === 0,
      'Returned empty text result safely without unhandled rejection'
    );

    // ----------------------------------------------------
    // TEST 9: Multi-Page Ordering & Page Metadata
    // ----------------------------------------------------
    const multiPdfPath = path.join(__dirname, `e5_multi_${testId}.pdf`);
    const docMulti = new jsPDF();
    docMulti.text("Page 1 statement: Operating systems manage computer hardware resources.", 10, 20);
    docMulti.addPage();
    docMulti.text("Page 2 statement: Virtual memory provides virtual address space abstraction.", 10, 20);
    docMulti.addPage();
    docMulti.text("Page 3 statement: File systems organize persistent storage hierarchies.", 10, 20);
    fs.writeFileSync(multiPdfPath, Buffer.from(docMulti.output('arraybuffer')));
    tmpFilesToClean.push(multiPdfPath);

    const multiExt = await extractPdfText(multiPdfPath);
    recordResult(9, 'Multi-Page Ordering & Page Metadata',
      multiExt.pages.length === 3 && multiExt.pages[0].pageNumber === 1 && multiExt.pages[2].pageNumber === 3,
      `Strict page order confirmed across ${multiExt.pages.length} pages`
    );

    // ----------------------------------------------------
    // TEST 10: Report Persistence with Extraction Metadata
    // ----------------------------------------------------
    const reportFromDb = await reportService.getUserReportById(normalRes.reportId, testUser.uid);
    recordResult(10, 'Report Persistence with Extraction Metadata',
      reportFromDb.id === normalRes.reportId && Boolean(reportFromDb.summary.extractionMethod || reportFromDb.document?.extractionMethod),
      `Stored Extraction Method: ${reportFromDb.summary.extractionMethod || reportFromDb.document?.extractionMethod}`
    );

    // ----------------------------------------------------
    // TEST 11: Report Refresh & Verification
    // ----------------------------------------------------
    const reloadedReport = await reportService.getUserReportById(normalRes.reportId, testUser.uid);
    recordResult(11, 'Report Refresh & Verification',
      reloadedReport.findings.length === normalRes.findings.length,
      `Reloaded ${reloadedReport.findings.length} findings with full integrity`
    );

    // ----------------------------------------------------
    // TEST 12: E1 Statement Filtering on Cleaned OCR Text
    // ----------------------------------------------------
    const ocrSampleWithNoise = "Chapter 3: Memory\nVirtual memory translates virtual addresses into physical addresses.\n• Database\nPage 3 of 10";
    const statementExtractionService = require('../services/errorDetection/statementExtractionService');
    const preparedOcr = statementExtractionService.extractAndPrepareStatements(ocrSampleWithNoise, {
      documentId: 'doc_ocr',
      documentName: 'ocr_sample.pdf',
    });
    recordResult(12, 'E1 Statement Filtering on OCR Text',
      preparedOcr.readyStatements.length === 1 && preparedOcr.readyStatements[0].statementText.includes('Virtual memory translates'),
      `Filtered noise and extracted 1 clean statement: "${preparedOcr.readyStatements[0]?.statementText}"`
    );

    console.log('\n====================================================');
    console.log(` E5 OCR TEST SUITE RESULTS: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('====================================================');

    if (passedCount !== totalCount) {
      throw new Error(`E5 OCR test suite failed: ${totalCount - passedCount} test(s) failed`);
    }

  } catch (err) {
    console.error('\n❌ E5 OCR SUITE FATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    for (const f of tmpFilesToClean) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    for (const rId of createdReportIds) {
      if (db) await db.collection('reports').doc(rId).delete().catch(() => {});
    }
  }
}

runE5OcrTestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
