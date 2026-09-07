const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
let jsPDF;
try {
  jsPDF = require('../../Frontend/node_modules/jspdf').jsPDF;
} catch (e) {
  try {
    jsPDF = require('jspdf').jsPDF;
  } catch (e2) {}
}

const { extractDocumentText, extractZipArchive } = require('../services/extraction/documentExtractionService');
const { analyzeCopiedContent } = require('../services/copiedContent/copiedContentService');
const { registerUpload } = require('../services/uploadRegistryService');
const { getUserReportById } = require('../services/reportService');

console.log('====================================================');
console.log(' TRUSTLENS: ZIP EXTRACTION FIX VALIDATION TEST SUITE');
console.log('====================================================\n');

const testResults = [];
let passedCount = 0;

function recordTest(index, name, passed, details = '') {
  testResults.push({ index, name, passed, details });
  if (passed) passedCount++;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] TEST ${index}: ${name} -> ${details}`);
}

function generateMinimalPdfBuffer(text) {
  if (jsPDF) {
    const doc = new jsPDF();
    doc.text(text, 10, 20);
    return Buffer.from(doc.output('arraybuffer'));
  }
  // Standard raw PDF structure
  const pdfStr = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${text.length + 45} >> stream
BT /F1 12 Tf 50 700 Td (${text.replace(/[()]/g, '')}) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000340 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
427
%%EOF`;
  return Buffer.from(pdfStr, 'utf8');
}

function generateTextImageBuffer(text) {
  // Return a 1x1 png or simple image buffer
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(base64Png, 'base64');
}

async function runZipTestSuite() {
  const timestamp = Date.now();
  const testDir = path.resolve(`./uploads/tmp_zip_tests_${timestamp}`);
  fs.mkdirSync(testDir, { recursive: true });

  const studentUser = { uid: `student_zip_${timestamp}`, name: 'Zip Student', email: `zip_${timestamp}@trustlens.edu`, role: 'student' };

  // --------------------------------------------------------------------------
  // TEST 1: ZIP containing 2 PDFs
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'two_pdfs.zip');
    const zip = new AdmZip();
    zip.addFile('DocA.pdf', generateMinimalPdfBuffer('Distributed database replication ensures fault tolerance across nodes.'));
    zip.addFile('DocB.pdf', generateMinimalPdfBuffer('Distributed database replication ensures fault tolerance across nodes.'));
    zip.writeZip(zipPath);

    const result = await extractDocumentText(zipPath, 'two_pdfs.zip', 'application/zip');
    const passed = result.success === true && result.documents.length === 2 && result.documents.every(d => d.extraction?.text);

    recordTest(1, 'ZIP containing 2 PDFs', passed,
      `Extracted ${result.documents.length} PDF documents (${result.documents.map(d => d.originalName).join(', ')})`);
  } catch (err) {
    recordTest(1, 'ZIP containing 2 PDFs', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: ZIP containing 5 PDFs
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'five_pdfs.zip');
    const zip = new AdmZip();
    for (let i = 1; i <= 5; i++) {
      zip.addFile(`Assignment_${i}.pdf`, generateMinimalPdfBuffer(`Content for assignment number ${i} in Computer Science course.`));
    }
    zip.writeZip(zipPath);

    const result = await extractDocumentText(zipPath, 'five_pdfs.zip', 'application/zip');
    const passed = result.success === true && result.documents.length === 5;

    recordTest(2, 'ZIP containing 5 PDFs', passed,
      `Extracted ${result.documents.length} PDF documents`);
  } catch (err) {
    recordTest(2, 'ZIP containing 5 PDFs', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: ZIP containing mixed supported formats (PDF + TXT + PNG)
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'mixed_supported.zip');
    const zip = new AdmZip();
    zip.addFile('Document_1.pdf', generateMinimalPdfBuffer('TCP protocol handles ordered reliable transmission.'));
    zip.addFile('Document_2.txt', Buffer.from('TCP protocol handles ordered reliable transmission.', 'utf8'));
    zip.addFile('Document_3.png', generateTextImageBuffer('Operating Systems manages kernel memory.'));
    zip.writeZip(zipPath);

    const result = await extractDocumentText(zipPath, 'mixed_supported.zip', 'application/zip');
    const exts = result.documents.map(d => d.fileType);
    const passed = result.success === true && result.documents.length === 3 && exts.includes('pdf') && exts.includes('txt') && exts.includes('png');

    recordTest(3, 'ZIP containing mixed supported formats (PDF, TXT, PNG)', passed,
      `Extracted ${result.documents.length} mixed documents: ${exts.join(', ')}`);
  } catch (err) {
    recordTest(3, 'ZIP containing mixed supported formats (PDF, TXT, PNG)', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: ZIP containing unsupported files (.exe, .js, .py) alongside valid files
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'mixed_unsupported.zip');
    const zip = new AdmZip();
    zip.addFile('Valid_DocA.pdf', generateMinimalPdfBuffer('Valid document for factual comparison.'));
    zip.addFile('Valid_DocB.txt', Buffer.from('Valid document for factual comparison.', 'utf8'));
    zip.addFile('malicious.exe', Buffer.from('MZ dummy executable payload', 'utf8'));
    zip.addFile('script.js', Buffer.from('console.log("hello");', 'utf8'));
    zip.writeZip(zipPath);

    const result = await extractDocumentText(zipPath, 'mixed_unsupported.zip', 'application/zip');
    const nonExec = !result.documents.some(d => d.fileType === 'exe' || d.fileType === 'js');
    const passed = result.success === true && result.documents.length === 2 && nonExec;

    recordTest(4, 'ZIP containing unsupported files (.exe, .js safely skipped)', passed,
      `Extracted 2 supported documents; unsafe .exe & .js files safely ignored`);
  } catch (err) {
    recordTest(4, 'ZIP containing unsupported files (.exe, .js safely skipped)', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Empty ZIP archive
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'empty.zip');
    const zip = new AdmZip();
    zip.writeZip(zipPath);

    let errorCaught = false;
    let errorMsg = '';
    try {
      await extractDocumentText(zipPath, 'empty.zip', 'application/zip');
    } catch (err) {
      errorCaught = true;
      errorMsg = err.message;
    }

    const passed = errorCaught && (errorMsg.includes('empty') || errorMsg.includes('no supported'));
    recordTest(5, 'Empty ZIP handling', passed,
      `Handled cleanly with error message: "${errorMsg}"`);
  } catch (err) {
    recordTest(5, 'Empty ZIP handling', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Corrupted / Invalid ZIP file
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'corrupted.zip');
    fs.writeFileSync(zipPath, Buffer.from('THIS_IS_NOT_A_VALID_ZIP_BINARY_DATA'));

    let errorCaught = false;
    let errorMsg = '';
    try {
      await extractDocumentText(zipPath, 'corrupted.zip', 'application/zip');
    } catch (err) {
      errorCaught = true;
      errorMsg = err.message;
    }

    const passed = errorCaught && errorMsg.includes('ZIP');
    recordTest(6, 'Corrupted ZIP handling', passed,
      `Handled cleanly with error message: "${errorMsg}"`);
  } catch (err) {
    recordTest(6, 'Corrupted ZIP handling', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: ZIP files with spaces & special characters in names
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'special_names.zip');
    const zip = new AdmZip();
    zip.addFile('Final Project - Report (v2.1) #Draft.pdf', generateMinimalPdfBuffer('Algorithms analysis and asymptotic growth bounds.'));
    zip.addFile('Student Submission & Notes [Final].txt', Buffer.from('Algorithms analysis and asymptotic growth bounds.', 'utf8'));
    zip.writeZip(zipPath);

    const result = await extractDocumentText(zipPath, 'special_names.zip', 'application/zip');
    const passed = result.success === true && result.documents.length === 2;

    recordTest(7, 'ZIP with special characters & spaces in filenames', passed,
      `Extracted filenames preserved cleanly: "${result.documents[0].originalName}"`);
  } catch (err) {
    recordTest(7, 'ZIP with special characters & spaces in filenames', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Path Traversal defense in ZIP entries
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'traversal.zip');
    const zip = new AdmZip();
    zip.addFile('dummy.txt', Buffer.from('Unsafe traversal content'));
    zip.getEntries()[0].entryName = '../evil.txt';
    zip.getEntries()[0].name = '../evil.txt';
    fs.writeFileSync(zipPath, zip.toBuffer());

    let errorCaught = false;
    let errorMsg = '';
    try {
      await extractDocumentText(zipPath, 'traversal.zip', 'application/zip');
    } catch (err) {
      errorCaught = true;
      errorMsg = err.message;
    }

    const passed = errorCaught && (errorMsg.includes('traversal') || errorMsg.includes('Path traversal') || errorMsg.includes('Security Violation'));
    recordTest(8, 'Path Traversal Defense in ZIP entries', passed,
      `Path traversal safely blocked: "${errorMsg}"`);
  } catch (err) {
    recordTest(8, 'Path Traversal Defense in ZIP entries', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Full End-to-End ZIP Copied Content Analysis Pipeline
  // --------------------------------------------------------------------------
  try {
    const zipPath = path.join(testDir, 'e2e_copied_content.zip');
    const zip = new AdmZip();
    zip.addFile('Operating_Systems_Alice.pdf', generateMinimalPdfBuffer('Virtual memory provides an abstraction of main memory to running processes.'));
    zip.addFile('Operating_Systems_Bob.pdf', generateMinimalPdfBuffer('Virtual memory provides an abstraction of main memory to running processes.'));
    zip.writeZip(zipPath);

    const session = registerUpload(studentUser.uid, 'zip', [
      {
        filename: 'e2e_copied_content.zip',
        originalName: 'e2e_copied_content.zip',
        mimeType: 'application/zip',
        uploadPath: zipPath,
      },
    ]);

    const analysisRes = await analyzeCopiedContent(studentUser, session.uploadId);
    const reportId = analysisRes.reportId;
    const reportDetails = await getUserReportById(reportId, studentUser.uid);
    const pair = reportDetails.documentPairs?.[0];

    const passed = analysisRes.success === true &&
                   !!reportId &&
                   pair?.overallMatchedContentPercentage === 100 &&
                   pair?.matches?.length > 0;

    recordTest(9, 'E2E ZIP Upload -> Extraction -> Analysis -> Report Persistence', passed,
      `Generated Report ID: ${reportId}, Pair Similarity: ${pair?.overallMatchedContentPercentage}%, Matches: ${pair?.matches?.length}`);
  } catch (err) {
    recordTest(9, 'E2E ZIP Upload -> Extraction -> Analysis -> Report Persistence', false, err.message);
  }

  // Clean up test directory
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n====================================================');
  console.log(` ZIP TEST RESULTS: ${passedCount} / ${testResults.length} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedCount !== testResults.length) {
    throw new Error(`ZIP test suite failed: ${testResults.length - passedCount} test(s) failed`);
  }
}

runZipTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ ZIP TEST FATAL ERROR:', err.message);
    process.exit(1);
  });
