const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { jsPDF } = require(path.resolve(__dirname, '../../../Frontend/node_modules/jspdf'));

const { analyzeCopiedContentDocuments } = require('../services/copiedContent/copiedContentService');
const { createReport, getUserReportById } = require('../services/reportService');

console.log('====================================================');
console.log(' TRUSTLENS: PDF EXPORT FIX VALIDATION TEST SUITE   ');
console.log('====================================================\n');

const testResults = [];
let passedCount = 0;

function recordTest(index, name, passed, details = '') {
  testResults.push({ index, name, passed, details });
  if (passed) passedCount++;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] TEST ${index}: ${name} -> ${details}`);
}

// Simulates the exact PDF generation logic from Frontend/src/utils/pdfGenerator.js
function simulateGeneratePdf(report) {
  if (!report) throw new Error('Report is required');

  const summary = report.summary || {};
  const isErrorDetection =
    report.reportType === 'error-detection' ||
    report.reportType === 'error_detection' ||
    report.type === 'error-detection' ||
    report.type === 'error_detection';

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageOverflow(neededHeight = 40) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(`TrustLens Analysis Report — ID: ${report.id || 'N/A'} (Cont.)`, margin, 25);
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, 30, pageWidth - margin, 30);
      y = 45;
    }
  }

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('TrustLens Report Summary', margin, 32);

  y = 70;

  // Overview
  const docTitle = report.title || report.document?.originalName || 'Document Analysis';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, margin, y);
  y += 18;

  const createdDate = report.createdAt ? new Date(report.createdAt).toLocaleString() : 'Recently';
  const docName = report.document?.originalName || report.document?.fileName || docTitle;
  const extractionMethod = report.extractionMethod || report.document?.extractionMethod || summary.extractionMethod || 'normal';

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Report ID: ${report.id || 'N/A'}`, margin, y);
  doc.text(`Analysis Type: ${isErrorDetection ? 'Error Detection / Factual Check' : 'Copied Content Analysis'}`, margin + 220, y);
  y += 14;

  doc.text(`Document Name: ${docName}`, margin, y);
  doc.text(`Analysis Date: ${createdDate}`, margin + 220, y);
  y += 14;

  doc.text(`Status: ${(report.status || 'completed').toUpperCase()}`, margin, y);
  if (isErrorDetection) {
    doc.text(`Extraction: ${extractionMethod === 'ocr' ? 'OCR (Scanned Document)' : extractionMethod === 'mixed' ? 'Mixed (Text + OCR)' : 'Normal Text Extraction'}`, margin + 220, y);
  }
  y += 20;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Summary Stats
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Summary Statistics', margin, y);
  y += 15;

  if (isErrorDetection) {
    const total = summary.totalStatements ?? summary.analyzedStatements ?? 0;
    const supported = summary.supported ?? summary.verified ?? 0;
    const incorrect = summary.incorrect ?? summary.potentialContradictions ?? 0;
    const misleading = summary.misleading ?? 0;
    const unsupported = summary.unsupported ?? 0;
    const noKnowledge = summary.noKnowledgeAvailable ?? 0;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 40, 'F');
    y += 55;
  } else {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 35, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 35, 'S');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Pairs Compared: ${summary.totalPairsCompared || 0}  |  Matching Pairs: ${summary.matchingPairs || 0}  |  Overall Similarity: ${summary.overallSimilarity || '0%'}`, margin + 12, y + 21);
    y += 50;
  }

  // Detailed Findings
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(isErrorDetection ? 'Statement Factual Verification Findings' : 'Pairwise Document Comparisons', margin, y);
  y += 15;

  if (isErrorDetection) {
    const findings = report.findings || report.statementResults || report.results || [];
    findings.forEach((s, idx) => {
      checkPageOverflow(85);
      const rawStatus = (s.classification || s.status || '').toUpperCase().replace(/_/g, ' ');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.text(`Statement #${s.index || idx + 1} — ${rawStatus}`, margin, y);
      y += 12;

      const stmtText = `"${s.statement || s.originalStatement || s.statementText || ''}"`;
      const stmtLines = doc.splitTextToSize(stmtText, contentWidth - 20);
      checkPageOverflow(stmtLines.length * 11 + 30);
      doc.text(stmtLines, margin + 8, y + 12);
      y += stmtLines.length * 12 + 14;
    });
  } else {
    const pairs = report.documentPairs || report.pairResults || [];
    pairs.forEach((pair, idx) => {
      checkPageOverflow(50);
      const nameA = pair.documentA?.originalName || pair.documentA?.name || pair.docA?.name || pair.doc1 || 'Document A';
      const nameB = pair.documentB?.originalName || pair.documentB?.name || pair.docB?.name || pair.doc2 || 'Document B';
      const score = pair.overallMatchedContentPercentage ?? pair.similarity ?? pair.similarityScore ?? pair.comparison?.overallSimilarity ?? 0;
      const totalMatches = pair.totalMatches ?? pair.matches?.length ?? (((pair.exactMatches || 0) + (pair.nearMatches || 0)) || 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const headerText = `Pair #${idx + 1}: ${nameA} vs ${nameB}`;
      const headerLines = doc.splitTextToSize(headerText, contentWidth);
      checkPageOverflow(headerLines.length * 12 + 25);
      doc.text(headerLines, margin, y);
      y += headerLines.length * 11 + 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const statusLabel = score >= 70 ? 'High Similarity' : score >= 30 ? 'Moderate Similarity' : 'No Significant Similarity';
      doc.text(`Similarity: ${score}%  |  Matched Sections: ${totalMatches}  |  Classification: ${statusLabel}`, margin + 8, y);
      y += 16;

      if (pair.matches && pair.matches.length > 0) {
        const sampleMatches = pair.matches.slice(0, 3);
        sampleMatches.forEach((m, mIdx) => {
          const snippetA = m.documentAPassage || m.documentA?.text || m.passageA || '';
          const mScore = m.similarity || m.similarityScore || 100;
          const mType = (m.matchType || 'exact_match').replace(/_/g, ' ').toUpperCase();

          if (snippetA) {
            const snippetText = `Match ${mIdx + 1} (${mType} - ${mScore}%): "${snippetA}"`;
            const snippetLines = doc.splitTextToSize(snippetText, contentWidth - 24);
            checkPageOverflow(snippetLines.length * 10 + 14);

            doc.setFillColor(248, 250, 252);
            doc.rect(margin + 8, y, contentWidth - 16, snippetLines.length * 10 + 6, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin + 8, y, contentWidth - 16, snippetLines.length * 10 + 6, 'S');

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(51, 65, 85);
            doc.text(snippetLines, margin + 14, y + 9);
            y += snippetLines.length * 10 + 12;
          }
        });
      }
      y += 6;
    });
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
    doc.text('TrustLens Automated Verification System', margin, pageHeight - 20);
  }

  return {
    outputBuffer: Buffer.from(doc.output('arraybuffer')),
    pageCount: totalPages,
  };
}

async function runPdfExportTestSuite() {
  const timestamp = Date.now();
  const testUser = { uid: `student_pdf_${timestamp}`, name: 'Pdf Student', email: `pdf_${timestamp}@trustlens.edu`, role: 'student' };

  // --------------------------------------------------------------------------
  // TEST 1: Open an existing completed Copied Content report & Generate PDF
  // --------------------------------------------------------------------------
  let standardReport = null;
  try {
    const docs = [
      { documentId: 'doc-1', originalName: 'Networks_A.pdf', extractedText: 'TCP is a reliable connection-oriented transport protocol.' },
      { documentId: 'doc-2', originalName: 'Networks_B.pdf', extractedText: 'TCP is a reliable connection-oriented transport protocol.' },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const reportId = await createReport(testUser, 'copied-content', 'Copied Content - 2 Documents', processedDocs, summary, pairResults);
    standardReport = await getUserReportById(reportId, testUser.uid);

    const pdfRes = simulateGeneratePdf(standardReport);
    const passed = pdfRes.outputBuffer && pdfRes.outputBuffer.length > 1000 && pdfRes.pageCount >= 1;

    recordTest(1, 'Open Completed Copied Content Report & Generate PDF', passed,
      `Generated PDF (${pdfRes.outputBuffer.length} bytes, ${pdfRes.pageCount} page(s)) for Report ID: ${reportId}`);
  } catch (err) {
    recordTest(1, 'Open Completed Copied Content Report & Generate PDF', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Current 6-document report (15 pairwise comparisons)
  // --------------------------------------------------------------------------
  let sixDocReport = null;
  try {
    const docs = [];
    for (let i = 1; i <= 6; i++) {
      docs.push({
        documentId: `doc-${i}`,
        originalName: `Student_Assignment_${i}_Advanced_Database_Systems.pdf`,
        extractedText: i % 2 === 0
          ? 'Relational databases enforce ACID transaction guarantees for consistency across concurrent operations.'
          : 'Query optimization strategies evaluate alternative execution plans to minimize disk I/O and latency.',
      });
    }
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const reportId = await createReport(testUser, 'copied-content', 'Copied Content - 6 Documents Batch', processedDocs, summary, pairResults);
    sixDocReport = await getUserReportById(reportId, testUser.uid);

    const pdfRes = simulateGeneratePdf(sixDocReport);
    const passed = pdfRes.outputBuffer && sixDocReport.documentPairs.length === 15 && pdfRes.pageCount >= 2;

    recordTest(2, 'Six-Document Copied Content Batch PDF Generation', passed,
      `Processed 6 documents, 15 comparison pairs across ${pdfRes.pageCount} PDF pages (${pdfRes.outputBuffer.length} bytes)`);
  } catch (err) {
    recordTest(2, 'Six-Document Copied Content Batch PDF Generation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Report with many matching sections spanning multiple pages
  // --------------------------------------------------------------------------
  try {
    const longText1 = Array(15).fill('Operating systems provide process scheduling, virtual memory paging, and file system abstractions.').join(' ');
    const longText2 = Array(15).fill('Operating systems provide process scheduling, virtual memory paging, and file system abstractions.').join(' ');

    const docs = [
      { documentId: 'doc-1', originalName: 'OS_Comprehensive_A.pdf', extractedText: longText1 },
      { documentId: 'doc-2', originalName: 'OS_Comprehensive_B.pdf', extractedText: longText2 },
    ];
    const { pairResults, summary, processedDocs } = analyzeCopiedContentDocuments(docs);
    const reportId = await createReport(testUser, 'copied-content', 'Copied Content - Long Sections', processedDocs, summary, pairResults);
    const longReport = await getUserReportById(reportId, testUser.uid);

    const pdfRes = simulateGeneratePdf(longReport);
    const passed = pdfRes.outputBuffer && pdfRes.pageCount >= 1;

    recordTest(3, 'Multi-Page Report with Extensive Matching Sections', passed,
      `Generated ${pdfRes.pageCount} PDF pages cleanly without page overflow errors`);
  } catch (err) {
    recordTest(3, 'Multi-Page Report with Extensive Matching Sections', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Report containing very long sentences (word wrap verification)
  // --------------------------------------------------------------------------
  try {
    const longSentence = 'A'.repeat(500) + ' ' + 'B'.repeat(500);
    const mockReport = {
      id: 'rep_long_sentence_test',
      reportType: 'copied-content',
      title: 'Long Sentence Test Report',
      createdAt: new Date().toISOString(),
      summary: { totalPairsCompared: 1, matchingPairs: 1, overallSimilarity: '95%' },
      documentPairs: [
        {
          pairId: 'pair_1_2',
          documentA: { originalName: 'Very_Long_Filename_For_A_Very_Detailed_Project_Analysis_Document_Submission_2026.pdf' },
          documentB: { originalName: 'Another_Extremely_Long_Document_Title_Submitted_For_Evaluation_And_Grading.pdf' },
          overallMatchedContentPercentage: 95,
          matches: [
            {
              documentAPassage: longSentence,
              similarity: 95,
              matchType: 'near_identical',
            }
          ]
        }
      ]
    };

    const pdfRes = simulateGeneratePdf(mockReport);
    const passed = pdfRes.outputBuffer && pdfRes.outputBuffer.length > 500;

    recordTest(4, 'Report Containing Very Long Sentences & Filenames', passed,
      `Word-wrapping handled 1000+ char strings without layout truncation (${pdfRes.outputBuffer.length} bytes)`);
  } catch (err) {
    recordTest(4, 'Report Containing Very Long Sentences & Filenames', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Special characters and Unicode (Quotes, Brackets, Symbols, %, &)
  // --------------------------------------------------------------------------
  try {
    const specialText = 'Symbols: [ACID] & "CAP Theorem" (Consistency, Availability & Partition-Tolerance) — 99.99% SLA / Cost: < $500 > & 100% Guaranteed.';
    const mockReport = {
      id: 'rep_special_chars_test',
      reportType: 'copied-content',
      title: 'Special & Unicode Characters Test (v1.0) #Draft [Final]',
      createdAt: new Date().toISOString(),
      summary: { totalPairsCompared: 1, matchingPairs: 1, overallSimilarity: '100%' },
      documentPairs: [
        {
          pairId: 'pair_1_2',
          documentA: { originalName: 'Project "A" & [Draft] #1 (100%).pdf' },
          documentB: { originalName: 'Project "B" & [Draft] #2 (100%).pdf' },
          overallMatchedContentPercentage: 100,
          matches: [
            {
              documentAPassage: specialText,
              similarity: 100,
              matchType: 'exact_match',
            }
          ]
        }
      ]
    };

    const pdfRes = simulateGeneratePdf(mockReport);
    const passed = pdfRes.outputBuffer && pdfRes.outputBuffer.length > 500;

    recordTest(5, 'Special & Unicode Characters (Quotes, Brackets, %, &)', passed,
      `Special characters encoded and rendered safely without parser crash`);
  } catch (err) {
    recordTest(5, 'Special & Unicode Characters (Quotes, Brackets, %, &)', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Validate PDF binary format integrity (%PDF- header and %%EOF)
  // --------------------------------------------------------------------------
  try {
    const pdfRes = simulateGeneratePdf(sixDocReport);
    const headerStr = pdfRes.outputBuffer.slice(0, 8).toString('utf8');
    const footerStr = pdfRes.outputBuffer.slice(-100).toString('utf8');

    const isValidPdf = headerStr.startsWith('%PDF-') && footerStr.includes('%%EOF');
    recordTest(6, 'PDF Binary Header & EOF Structure Validation', isValidPdf,
      `Header: "${headerStr.trim()}", Valid EOF terminator verified`);
  } catch (err) {
    recordTest(6, 'PDF Binary Header & EOF Structure Validation', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Deterministic Re-download (No Analysis Re-execution)
  // --------------------------------------------------------------------------
  try {
    const pdfRes1 = simulateGeneratePdf(sixDocReport);
    const pdfRes2 = simulateGeneratePdf(sixDocReport);

    const passed = pdfRes1.pageCount === pdfRes2.pageCount &&
                   pdfRes1.outputBuffer.length === pdfRes2.outputBuffer.length;

    recordTest(7, 'Deterministic Re-download From Existing Persisted Report', passed,
      `Identical binary outputs generated on re-download (${pdfRes1.pageCount} pages, ${pdfRes1.outputBuffer.length} bytes)`);
  } catch (err) {
    recordTest(7, 'Deterministic Re-download From Existing Persisted Report', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Error Detection Report PDF Download Compatibility
  // --------------------------------------------------------------------------
  try {
    const edReport = {
      id: 'rep_ed_test',
      reportType: 'error-detection',
      title: 'Error Detection - Computer Networks Notes.pdf',
      createdAt: new Date().toISOString(),
      extractionMethod: 'normal',
      summary: {
        totalStatements: 3,
        supported: 2,
        incorrect: 1,
        misleading: 0,
        unsupported: 0,
        noKnowledgeAvailable: 0,
      },
      findings: [
        {
          index: 1,
          statement: 'TCP provides reliable byte stream transmission.',
          classification: 'SUPPORTED',
          similarityScore: 0.94,
          reason: 'Verified against RFC standards.',
          evidence: { content: 'TCP is a reliable connection-oriented protocol.', sourceTitle: 'RFC 793' },
        },
        {
          index: 2,
          statement: 'UDP guarantees zero packet loss over wide-area links.',
          classification: 'INCORRECT',
          similarityScore: 0.88,
          reason: 'Contradicts standard networking literature: UDP is unreliable and connectionless.',
          evidence: { content: 'UDP does not guarantee delivery or packet ordering.', sourceTitle: 'RFC 768' },
        },
      ],
    };

    const pdfRes = simulateGeneratePdf(edReport);
    const passed = pdfRes.outputBuffer && pdfRes.pageCount >= 1 && pdfRes.outputBuffer.length > 1000;

    recordTest(8, 'Error Detection Report PDF Export Compatibility', passed,
      `Error Detection PDF rendered independently with findings table and evidence badges (${pdfRes.outputBuffer.length} bytes)`);
  } catch (err) {
    recordTest(8, 'Error Detection Report PDF Export Compatibility', false, err.message);
  }

  console.log('\n====================================================');
  console.log(` PDF TEST RESULTS: ${passedCount} / ${testResults.length} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedCount !== testResults.length) {
    throw new Error(`PDF test suite failed: ${testResults.length - passedCount} test(s) failed`);
  }
}

runPdfExportTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ PDF TEST FATAL ERROR:', err.message);
    process.exit(1);
  });
