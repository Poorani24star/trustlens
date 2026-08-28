const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.resolve(__dirname, '../../../Frontend/node_modules/jspdf'));
const pdfParse = require('pdf-parse');
const { getDb } = require('../config/firebaseAdmin');
const errorDetectionService = require('../services/errorDetection/errorDetectionService');
const reportService = require('../services/reportService');
const { registerUpload } = require('../services/uploadRegistryService');
const { extractImageOcrText, cleanOcrText, extractBufferOcrText } = require('../services/extraction/ocrExtractionService');
const { extractDocumentText } = require('../services/extraction/documentExtractionService');
const { extractAndPrepareStatements, checkIsNoise } = require('../services/errorDetection/statementExtractionService');

// Helper to generate a PNG image buffer with text rendered
async function generateTextImageBuffer(textLines = []) {
  const doc = new jsPDF();
  textLines.forEach((line, idx) => {
    doc.text(line, 10, 20 + idx * 15);
  });
  const pdfBuf = Buffer.from(doc.output('arraybuffer'));
  const parser = new pdfParse.PDFParse({ data: pdfBuf });
  const sc = await parser.getScreenshot({ scale: 1.5 });
  await parser.destroy();
  return Buffer.from(sc.pages[0].data);
}

async function runImageSupportTestSuite() {
  console.log('====================================================');
  console.log(' TRUSTLENS: DIRECT IMAGE FILE OCR & VERIFICATION   ');
  console.log('====================================================\n');

  const db = getDb();
  const testId = Date.now();
  const testUser = { uid: `student_img_${testId}`, name: 'Dana ImageTester', email: `dana_${testId}@trustlens.edu`, role: 'student' };

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
    // TEST 1: PNG Direct Upload and OCR Analysis
    // ----------------------------------------------------
    const pngBuf = await generateTextImageBuffer([
      "TCP is a connection-oriented transport layer protocol that provides reliable delivery.",
      "UDP is a connectionless transport protocol that does not guarantee delivery."
    ]);
    const pngPath = path.join(__dirname, `img_test_${testId}.png`);
    fs.writeFileSync(pngPath, pngBuf);
    tmpFilesToClean.push(pngPath);

    const pngExt = await extractDocumentText(pngPath, `network_notes_${testId}.png`, 'image/png');
    const sessionPng = registerUpload(testUser.uid, 'single', [{ uploadPath: pngPath, originalName: `network_notes_${testId}.png`, mimeType: 'image/png' }]);
    const pngRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionPng.uploadId);
    if (pngRes.reportId) createdReportIds.push(pngRes.reportId);

    recordResult(1, 'PNG Direct Upload & OCR Analysis',
      pngExt.extraction.extractionMethod === 'ocr' && pngRes.success === true && pngRes.findings.length >= 1,
      `Extraction: ${pngExt.extraction.extractionMethod}, Findings: ${pngRes.findings?.length}`
    );

    // ----------------------------------------------------
    // TEST 2: JPG Direct Upload and OCR Analysis
    // ----------------------------------------------------
    const jpgBuf = await generateTextImageBuffer([
      "A relational database organizes data into tables of rows and columns.",
      "SQL is the standard language for querying relational databases."
    ]);
    const jpgPath = path.join(__dirname, `img_db_${testId}.jpg`);
    fs.writeFileSync(jpgPath, jpgBuf);
    tmpFilesToClean.push(jpgPath);

    const jpgExt = await extractDocumentText(jpgPath, `db_lecture_${testId}.jpg`, 'image/jpeg');
    const sessionJpg = registerUpload(testUser.uid, 'single', [{ uploadPath: jpgPath, originalName: `db_lecture_${testId}.jpg`, mimeType: 'image/jpeg' }]);
    const jpgRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionJpg.uploadId);
    if (jpgRes.reportId) createdReportIds.push(jpgRes.reportId);

    recordResult(2, 'JPG Direct Upload & OCR Analysis',
      jpgExt.extraction.extractionMethod === 'ocr' && jpgRes.success === true && jpgRes.findings.length >= 1,
      `Extraction: ${jpgExt.extraction.extractionMethod}, Findings: ${jpgRes.findings?.length}`
    );

    // ----------------------------------------------------
    // TEST 3: JPEG Direct Upload and OCR Analysis
    // ----------------------------------------------------
    const jpegBuf = await generateTextImageBuffer([
      "Operating systems manage computer hardware and software resources.",
      "A process is an active program in execution containing a program counter."
    ]);
    const jpegPath = path.join(__dirname, `img_os_${testId}.jpeg`);
    fs.writeFileSync(jpegPath, jpegBuf);
    tmpFilesToClean.push(jpegPath);

    const jpegExt = await extractDocumentText(jpegPath, `os_notes_${testId}.jpeg`, 'image/jpeg');
    const sessionJpeg = registerUpload(testUser.uid, 'single', [{ uploadPath: jpegPath, originalName: `os_notes_${testId}.jpeg`, mimeType: 'image/jpeg' }]);
    const jpegRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionJpeg.uploadId);
    if (jpegRes.reportId) createdReportIds.push(jpegRes.reportId);

    recordResult(3, 'JPEG Direct Upload & OCR Analysis',
      jpegExt.extraction.extractionMethod === 'ocr' && jpegRes.success === true && jpegRes.findings.length >= 1,
      `Extraction: ${jpegExt.extraction.extractionMethod}, Findings: ${jpegRes.findings?.length}`
    );

    // ----------------------------------------------------
    // TEST 4: Mixed File Upload (PDF + PNG + JPG in single batch)
    // ----------------------------------------------------
    const docNormal = new jsPDF();
    docNormal.text("Routers forward packets across network subnets using routing tables.", 10, 20);
    const pdfPath = path.join(__dirname, `batch_${testId}.pdf`);
    fs.writeFileSync(pdfPath, Buffer.from(docNormal.output('arraybuffer')));
    tmpFilesToClean.push(pdfPath);

    const sessionMixed = registerUpload(testUser.uid, 'single', [
      { uploadPath: pdfPath, originalName: `NetDoc_${testId}.pdf`, mimeType: 'application/pdf' },
      { uploadPath: pngPath, originalName: `Notes_${testId}.png`, mimeType: 'image/png' },
      { uploadPath: jpgPath, originalName: `Lecture_${testId}.jpg`, mimeType: 'image/jpeg' },
    ]);
    const mixedBatchRes = await errorDetectionService.analyzeErrorDetectionDocument(testUser, sessionMixed.uploadId);
    if (mixedBatchRes.reportId) createdReportIds.push(mixedBatchRes.reportId);

    recordResult(4, 'Mixed Batch Upload (PDF + PNG + JPG)',
      mixedBatchRes.success === true && mixedBatchRes.documents.length === 3,
      `Processed ${mixedBatchRes.documents.length} mixed files (Report ID: ${mixedBatchRes.reportId})`
    );

    // ----------------------------------------------------
    // TEST 5: Image With Headings and Bullet Points (E1 Filtering)
    // ----------------------------------------------------
    const headingsBuf = await generateTextImageBuffer([
      "Advantages:",
      "Cloud computing provides scalable on-demand access to shared computing resources.",
      "• Database",
      "Virtual memory provides address space isolation between processes."
    ]);
    const headingsImgPath = path.join(__dirname, `img_heading_${testId}.png`);
    fs.writeFileSync(headingsImgPath, headingsBuf);
    tmpFilesToClean.push(headingsImgPath);

    const headingsExt = await extractImageOcrText(headingsImgPath);
    const preparedHeadings = extractAndPrepareStatements(headingsExt.text, {
      documentId: 'doc_heading_img',
      documentName: 'heading_test.png',
    });

    const hasAdvantagesAlone = preparedHeadings.readyStatements.some(s => s.statementText.trim() === 'Advantages:' || s.statementText.trim() === 'Advantages');
    const hasDbAlone = preparedHeadings.readyStatements.some(s => s.statementText.trim() === 'Database' || s.statementText.trim() === '• Database');

    recordResult(5, 'Image Headings and Fragment Filtering (E1)',
      !hasAdvantagesAlone && !hasDbAlone && preparedHeadings.readyStatements.length >= 1,
      `Filtered isolated headings; valid statements retained (${preparedHeadings.readyStatements.length})`
    );

    // ----------------------------------------------------
    // TEST 6: Image With Broken / Poor Text Handling
    // ----------------------------------------------------
    const brokenOcrText = cleanOcrText("||~ `^ ¬ • _\\ @@##$$ %%%");
    recordResult(6, 'Poor OCR Cleaning on Image (Zero Fabrication)',
      brokenOcrText.trim().length === 0,
      'Stray non-alphanumeric noise cleanly eliminated without inventing statements'
    );

    // ----------------------------------------------------
    // TEST 7: Image With No Text / Blank Image Handling
    // ----------------------------------------------------
    const blankBuf = await generateTextImageBuffer([""]);
    const blankImgPath = path.join(__dirname, `img_blank_${testId}.png`);
    fs.writeFileSync(blankImgPath, blankBuf);
    tmpFilesToClean.push(blankImgPath);

    const blankExt = await extractImageOcrText(blankImgPath);
    recordResult(7, 'Blank / Low-Text Image Safe Handling',
      blankExt.textLength === 0 || blankExt.qualityNotes !== null,
      'Handled cleanly without application crash'
    );

    // ----------------------------------------------------
    // TEST 8: Report Generation & Persistence for Image
    // ----------------------------------------------------
    const imgReport = await reportService.getUserReportById(pngRes.reportId, testUser.uid);
    const hasSource = imgReport.findings.every(f => f.documentName && f.documentName.endsWith('.png'));
    recordResult(8, 'Report Generation & Persistence for Images',
      imgReport.id === pngRes.reportId && imgReport.findings.length > 0 && hasSource,
      `Report ${imgReport.id} retained source: "${imgReport.findings[0]?.documentName}"`
    );

    // ----------------------------------------------------
    // TEST 9: PDF Regression Verification
    // ----------------------------------------------------
    const normalReport = await reportService.getUserReportById(mixedBatchRes.reportId, testUser.uid);
    const containsPdfAndImg = normalReport.findings.some(f => f.documentName.endsWith('.pdf')) && normalReport.findings.some(f => f.documentName.endsWith('.png'));
    recordResult(9, 'PDF and Scanned PDF Regression Check',
      normalReport.status === 'completed' && containsPdfAndImg,
      'PDF and Image files both co-exist within the same report without conflict'
    );

    // ----------------------------------------------------
    // TEST 10: Multiple Document Regression (Batch Indexing)
    // ----------------------------------------------------
    const history = await reportService.listUserReports(testUser.uid);
    const allReportsFound = [pngRes.reportId, jpgRes.reportId, jpegRes.reportId, mixedBatchRes.reportId].every(id => 
      history.reports.some(r => r.id === id)
    );
    recordResult(10, 'Multiple Document Batch & History Regression',
      allReportsFound,
      `All ${history.reports.length} generated image & PDF reports successfully listed in user history`
    );

    console.log('\n====================================================');
    console.log(` IMAGE SUPPORT TEST SUITE: ${passedCount} / ${totalCount} TESTS PASSED`);
    console.log('====================================================');

    if (passedCount !== totalCount) {
      throw new Error(`Image Support test suite failed: ${totalCount - passedCount} test(s) failed`);
    }

  } catch (err) {
    console.error('\n❌ IMAGE SUPPORT SUITE FATAL ERROR:', err.message);
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

runImageSupportTestSuite().catch(err => {
  console.error('Unhandled top level error:', err);
  process.exit(1);
});
