# TrustLens Algorithm Evaluation

## 1. Evaluation Objective

This document presents the verification, testing, evaluation, and result validation for the two core detection modules in TrustLens:
1. **Error Detection Algorithm** (Phase 13A)
2. **Copied Content Detection Algorithm** (Phase 13B)

The objective is to rigorously verify that both modules run deterministically, handle boundary and edge cases safely, produce accurate factual classifications on controlled test datasets, and operate efficiently without requiring external machine learning models, vector embeddings, FAISS, or third-party plagiarism APIs.

---

## 2. Error Detection Algorithm Evaluation

### Pipeline Architecture
```
Document Text
    ↓
Statement Segmentation (statementSegmenter.js)
    ↓
Text Preprocessing & Tokenization (textPreprocessor.js)
    ↓
Candidate Evidence Selection via Keyword Overlap (candidateSelector.js)
    ↓
TF-IDF Vectorization (tfidf.js)
    ↓
Cosine Similarity Calculation (cosineSimilarity.js)
    ↓
Contradiction Heuristic Evaluation (contradictionDetector.js)
    ↓
Threshold-Based Classification (classifier.js)
```

### Controlled Test Cases (ED1 – ED9)

| Case ID | Description | Input Statement | Expected Classification | Actual Classification | Similarity Score | Result |
|---|---|---|---|---|---|---|
| **ED1** | Supported Claim | `"Cloud computing provides on-demand access to computing resources."` | `verified` | `verified` | `0.8336` | **PASS** |
| **ED2** | Supported TCP Claim | `"TCP provides reliable data delivery."` | `verified` | `verified` | `0.5289` | **PASS** |
| **ED3** | Numerical Contradiction | `"The Earth is 500 million years old."` | `potential_contradiction` | `potential_contradiction` | `0.3446` | **PASS** |
| **ED4** | Negation Contradiction | `"Water does not boil at 100 degrees Celsius at standard atmospheric pressure."` | `potential_contradiction` | `potential_contradiction` | `0.7799` | **PASS** |
| **ED5** | Conflicting Photosynthesis Claim | `"Photosynthesis is the process by which plants create electricity."` | `insufficient_evidence` | `insufficient_evidence` | `0.1684` | **PASS** |
| **ED6** | Unrelated Historical Claim | `"Ancient Rome was founded on Mars."` | `insufficient_evidence` | `insufficient_evidence` | `0.0000` | **PASS** |
| **ED7** | Empty Statement | `""` | `not_analyzed` | `not_analyzed` | `0.0000` | **PASS** |
| **ED8** | Short Statement Below Threshold | `"Hello"` | `not_analyzed` | `not_analyzed` | `0.0000` | **PASS** |
| **ED9** | No Candidate Evidence in Corpus | `"Quantum computing utilizes qubits for superposition and entanglement."` | `insufficient_evidence` | `insufficient_evidence` | `0.1436` | **PASS** |

### Accuracy & Confusion Summary Matrix

- **Total Test Cases**: 9
- **Correct Classifications**: 9
- **Incorrect Classifications**: 0
- **Controlled Test Dataset Accuracy**: **100.00%**

```
Expected \ Actual                   verified   potential_contradiction   insufficient_evidence   not_analyzed
-------------------------------------------------------------------------------------------------------------
verified                                2                 0                        0                  0
potential_contradiction                 0                 2                        0                  0
insufficient_evidence                   0                 0                        3                  0
not_analyzed                            0                 0                        0                  2
```

### Observed Limitations
1. **Source Corpus Dependence**: Verification quality depends directly on the active reference documents uploaded to the Trusted Knowledge Repository.
2. **Deterministic Heuristics**: Contradiction detection relies on quantitative value discrepancies and negation polarity contrast. Abstract semantic rephrasings without keyword overlap default to `insufficient_evidence`.

---

## 3. Copied Content Detection Algorithm Evaluation

### Pipeline Architecture
```
Multiple Uploaded Documents
    ↓
Text Extraction & Input Validation (copiedContentService.js)
    ↓
Document Text Normalization (textNormalizer.js)
    ↓
Sentence / Passage Segmentation (passageSegmenter.js)
    ↓
Exact Match SHA-256 Hashing (hasher.js)
    ↓
Word-Level N-gram Shingling (N=5) (shingler.js)
    ↓
Pairwise Document Combination N(N-1)/2 (pairGenerator.js)
    ↓
Jaccard Similarity Calculation (jaccardSimilarity.js)
    ↓
Candidate Filtering (candidateSelector.js)
    ↓
Normalized Levenshtein Distance (levenshtein.js)
    ↓
Weighted Match Classification (matchClassifier.js)
    ↓
Result Aggregation & Matched Content Percentage (resultAggregator.js)
```

### Controlled Test Cases (CC1 – CC7)

| Case ID | Description | Document Pair Input | Expected Match | Actual Match | Jaccard Sim | Levenshtein Sim | Matched Content % | Result |
|---|---|---|---|---|---|---|---|---|
| **CC1** | Exact Copy | Identical 12-word text | `exact_match` | `exact_match` | `1.0000` | `1.0000` | **100%** | **PASS** |
| **CC2** | Near-Identical Content | Minor word substitutions | `near_identical` | `near_identical` | `0.7692` | `0.8824` | **100%** | **PASS** |
| **CC3** | Partial Match | Subset passage overlap | `partial_match` | `partial_match` | `0.7273` | `0.7684` | **100%** | **PASS** |
| **CC4** | Unrelated Content | Cloud vs Photosynthesis | `no_match` | `no_match` | `0.0000` | `0.0000` | **0%** | **PASS** |
| **CC5** | Multiple Documents | 4 documents $\rightarrow$ 6 pairs | `6 unique pairs` | `6 unique pairs` | N/A | N/A | N/A | **PASS** |
| **CC6** | Short Passages | $< 5$ words text | `exact_match` | `exact_match` | `1.0000` | `1.0000` | **100%** | **PASS** |
| **CC7** | Empty Document | 1 valid doc + 1 empty doc | `HTTP 400 error` | `HTTP 400 error` | N/A | N/A | N/A | **PASS** |

### Metrics, False Positives & False Negatives

- **Total Test Cases**: 7
- **Passed Cases**: 7
- **Failed Cases**: 0
- **Controlled Test Dataset Accuracy**: **100.00%**
- **False Positives Observed**: **0** (Unrelated content correctly evaluated as `no_match` with 0% matched content)
- **False Negatives Observed**: **0** (All expected exact, near-identical, and partial matches correctly identified)

### Observed Limitations
1. **Literal vs Structural Comparison**: Detects exact, near-identical, and rephrased textual matches. Does not track structural document flow without shared vocabulary.
2. **Mini-Project Scale**: Designed for multi-document packages up to 10 files per upload session.

---

## 4. Determinism Testing

Multi-pass determinism verification was conducted by running selected test cases 3 consecutive times in a clean environment:

- **Error Detection Case 1 (Verified)**: 3/3 identical outputs (`verified`, Similarity: `0.8336`).
- **Error Detection Case 3 (Numerical Contradiction)**: 3/3 identical outputs (`potential_contradiction`, Severity: `high`).
- **Copied Content Case 1 (Exact Copy)**: 3/3 identical outputs (`exact_match`, Matched Content: `100%`).
- **Copied Content Case 2 (Near-Identical)**: 3/3 identical outputs (`near_identical`, Combined Sim: `0.8145`).

**Result**: Both algorithms are **100% deterministic** ($Input_x \to Output_x$).

---

## 5. Edge Case & Normalization Testing

1. **Text Normalization Consistency**: Verified that `"CLOUD COMPUTING!!!"`, `"cloud computing"`, and `"Cloud    Computing"` all normalize cleanly to `"cloud computing"`.
2. **Special Characters & Capitalization**: Punctuation stripping handles symbols (`@`, `%`, `()`, `--`) without producing invalid tokens.
3. **Short / Empty Text**: Statements $< 10$ characters or $< 3$ words are safely tagged as `not_analyzed` without throwing exceptions.
4. **Boundary Threshold Handling**: Threshold boundaries (`1.0`, `0.80`, `0.60`) transition strictly as configured.

---

## 6. Performance Observations

### Error Detection Scaling

| Statement Count | Active Sources | Evidence Candidates Retrieved | Execution Time |
|---|---|---|---|
| **5 Statements** | 3 Sources | 5 Candidates | **2 ms** |
| **20 Statements** | 3 Sources | 20 Candidates | **4 ms** |
| **50 Statements** | 3 Sources | 50 Candidates | **11 ms** |

### Copied Content Detection Scaling

| Document Count | Unique Document Pairs ($\frac{N(N-1)}{2}$) | Passage Comparisons | Levenshtein Candidates Evaluated | Candidate Skip Rate | Execution Time |
|---|---|---|---|---|---|
| **2 Documents** | 1 Pair | 4 comparisons | 1 candidate | **75.0%** | **1 ms** |
| **5 Documents** | 10 Pairs | 40 comparisons | 10 candidates | **75.0%** | **2 ms** |
| **10 Documents** | 45 Pairs | 180 comparisons | 45 candidates | **75.0%** | **7 ms** |

---

## 7. Centralized Threshold Configuration

### Error Detection (`analysisConfig.js`)
- `HIGH_SIMILARITY_THRESHOLD = 0.75`
- `MEDIUM_SIMILARITY_THRESHOLD = 0.40`
- `LOW_SIMILARITY_THRESHOLD = 0.15`
- `MIN_STATEMENT_LENGTH = 10`
- `MIN_STATEMENT_WORDS = 3`

### Copied Content Detection (`copiedContentConfig.js`)
- `SHINGLE_SIZE = 5`
- `EXACT_MATCH_THRESHOLD = 1.0`
- `HIGH_SIMILARITY_THRESHOLD = 0.80`
- `MEDIUM_SIMILARITY_THRESHOLD = 0.60`
- `LOW_SIMILARITY_THRESHOLD = 0.30`
- `JACCARD_WEIGHT = 0.60`
- `LEVENSHTEIN_WEIGHT = 0.40`

---

## 8. Conclusion & Constraints Confirmation

1. **Algorithm Verification**: Both Error Detection and Copied Content Detection algorithms operate correctly, deterministically, and robustly.
2. **API & Persistence**: Route controllers and Cloud Firestore report persistence operate seamlessly end-to-end.
3. **No Machine Learning**: Zero external machine learning libraries were introduced.
4. **No Embeddings**: Zero text embedding APIs or model weights were introduced.
5. **No FAISS / Vector Databases**: Zero vector indices or vector databases were introduced.
