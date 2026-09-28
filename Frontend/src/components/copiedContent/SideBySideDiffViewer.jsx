import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check, 
  FileText, 
  Maximize2, 
  Minimize2, 
  Filter, 
  Sliders, 
  ArrowLeftRight, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Search
} from 'lucide-react';
import { computeWordDiff, getSimilarityColor } from '../../utils/diffUtils';
import { getMatchLabel } from './CopiedContentResultCard';

/**
 * Tokenized Passage Component
 * Renders text tokens with word-level highlight styles based on match type.
 */
function TokenizedPassage({ tokens, side, isExact }) {
  if (!tokens || tokens.length === 0) {
    return <span className="text-slate-400 italic">No passage text</span>;
  }

  if (isExact) {
    return (
      <span className="bg-red-100 text-red-950 font-medium px-1 py-0.5 rounded border border-red-200">
        {tokens.map(t => t.text).join('')}
      </span>
    );
  }

  return (
    <span>
      {tokens.map((token, idx) => {
        if (token.type === 'match') {
          return (
            <mark 
              key={idx} 
              className="bg-red-100 text-red-900 font-semibold px-0.5 py-0.5 rounded-xs border-b-2 border-red-400"
              title="Exact matching word"
            >
              {token.text}
            </mark>
          );
        }

        if (token.type === 'removed') {
          return (
            <span 
              key={idx} 
              className="bg-rose-50 text-rose-700/80 line-through decoration-rose-300 px-0.5 rounded-xs"
              title="Word altered or present only in Document A"
            >
              {token.text}
            </span>
          );
        }

        if (token.type === 'added') {
          return (
            <span 
              key={idx} 
              className="bg-emerald-50 text-emerald-800 font-medium px-0.5 rounded-xs border-b border-emerald-300"
              title="Word substituted or present only in Document B"
            >
              {token.text}
            </span>
          );
        }

        return <span key={idx}>{token.text}</span>;
      })}
    </span>
  );
}

/**
 * Interactive Side-by-Side Diff Viewer
 */
export default function SideBySideDiffViewer({
  pair,
  onClose,
  initialMatchIndex = 0,
  isModal = true,
}) {
  const docAName = pair?.documentA?.originalName || pair?.documentA?.name || pair?.docA?.name || pair?.doc1 || 'Document A';
  const docBName = pair?.documentB?.originalName || pair?.documentB?.name || pair?.docB?.name || pair?.doc2 || 'Document B';
  const similarityScore = pair?.overallMatchedContentPercentage ?? pair?.similarity ?? pair?.similarityScore ?? 0;

  const rawMatches = useMemo(() => pair?.matches || pair?.matchedBlocks || [], [pair]);

  const [activeMatchIndex, setActiveMatchIndex] = useState(initialMatchIndex || 0);
  const [syncScroll, setSyncScroll] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedSide, setCopiedSide] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const paneARef = useRef(null);
  const paneBRef = useRef(null);
  const matchCardsRefA = useRef([]);
  const matchCardsRefB = useRef([]);
  const isSyncingScroll = useRef(false);

  // Filter matches based on classification and search query
  const filteredMatches = useMemo(() => {
    return rawMatches.filter(m => {
      const matchType = (m.matchType || '').toLowerCase();
      const sim = m.similarity ?? Math.round((m.combinedSimilarity || m.similarityScore || 0) * 100);

      if (filterType === 'exact' && matchType !== 'exact_match' && matchType !== 'exact-match' && sim < 100) return false;
      if (filterType === 'near' && (matchType === 'exact_match' || sim < 80 || sim === 100)) return false;
      if (filterType === 'partial' && sim >= 80) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textA = (m.documentAPassage || m.documentA?.text || m.textA || '').toLowerCase();
        const textB = (m.documentBPassage || m.documentB?.text || m.textB || '').toLowerCase();
        return textA.includes(q) || textB.includes(q);
      }

      return true;
    });
  }, [rawMatches, filterType, searchQuery]);

  // Pre-calculate diff tokens for all filtered matches
  const computedDiffs = useMemo(() => {
    return filteredMatches.map(m => {
      const textA = m.documentAPassage || m.documentA?.text || m.documentA?.passage || m.textA || '';
      const textB = m.documentBPassage || m.documentB?.text || m.documentB?.passage || m.textB || '';
      return computeWordDiff(textA, textB);
    });
  }, [filteredMatches]);

  const activeMatch = filteredMatches[activeMatchIndex] || filteredMatches[0] || null;
  const activeDiff = computedDiffs[activeMatchIndex] || computedDiffs[0] || null;

  // Safe active match index clamp
  useEffect(() => {
    if (activeMatchIndex >= filteredMatches.length && filteredMatches.length > 0) {
      setActiveMatchIndex(0);
    }
  }, [filteredMatches.length, activeMatchIndex]);

  // Synchronized scrolling handlers
  const handleScrollA = useCallback(() => {
    if (!syncScroll || isSyncingScroll.current || !paneARef.current || !paneBRef.current) return;
    isSyncingScroll.current = true;
    const scrollRatio = paneARef.current.scrollTop / (paneARef.current.scrollHeight - paneARef.current.clientHeight || 1);
    paneBRef.current.scrollTop = scrollRatio * (paneBRef.current.scrollHeight - paneBRef.current.clientHeight);
    setTimeout(() => { isSyncingScroll.current = false; }, 30);
  }, [syncScroll]);

  const handleScrollB = useCallback(() => {
    if (!syncScroll || isSyncingScroll.current || !paneARef.current || !paneBRef.current) return;
    isSyncingScroll.current = true;
    const scrollRatio = paneBRef.current.scrollTop / (paneBRef.current.scrollHeight - paneBRef.current.clientHeight || 1);
    paneARef.current.scrollTop = scrollRatio * (paneARef.current.scrollHeight - paneARef.current.clientHeight);
    setTimeout(() => { isSyncingScroll.current = false; }, 30);
  }, [syncScroll]);

  // Scroll active match card into view in both panes
  const scrollToMatch = useCallback((index) => {
    setActiveMatchIndex(index);
    const elA = matchCardsRefA.current[index];
    const elB = matchCardsRefB.current[index];

    if (elA) {
      elA.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (elB) {
      elB.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Keyboard navigation (Arrow keys for Next/Prev, Escape to close)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && onClose) {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (filteredMatches.length > 0) {
          const next = (activeMatchIndex + 1) % filteredMatches.length;
          scrollToMatch(next);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (filteredMatches.length > 0) {
          const prev = (activeMatchIndex - 1 + filteredMatches.length) % filteredMatches.length;
          scrollToMatch(prev);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMatchIndex, filteredMatches.length, onClose, scrollToMatch]);

  // Copy passage text to clipboard
  const handleCopyText = (side, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  };

  const activeMatchSim = activeMatch
    ? (activeMatch.similarity ?? Math.round((activeMatch.combinedSimilarity || activeMatch.similarityScore || 0) * 100))
    : 0;
  const activeBadge = activeMatch ? getMatchLabel(activeMatch.matchType, activeMatchSim) : null;
  const pairStatusColor = getSimilarityColor(similarityScore);

  const containerClasses = isModal
    ? `fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-fadeIn`
    : `w-full bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden`;

  const contentClasses = isModal
    ? `relative flex flex-col w-full ${isFullScreen ? 'h-full max-h-screen rounded-none' : 'max-w-6xl h-[90vh] rounded-2xl'} bg-white border border-slate-200 shadow-2xl overflow-hidden transition-all`
    : `flex flex-col w-full h-[700px] overflow-hidden`;

  return (
    <div className={containerClasses}>
      <div className={contentClasses}>
        {/* Top Header & Toolbar */}
        <header className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Interactive Diff Viewer
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${pairStatusColor.bg}`}>
                  Pair Overall: {similarityScore}% Matched
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate flex items-center gap-2">
                <span className="truncate max-w-[200px] sm:max-w-[280px]" title={docAName}>{docAName}</span>
                <span className="text-slate-400 font-normal">vs</span>
                <span className="truncate max-w-[200px] sm:max-w-[280px]" title={docBName}>{docBName}</span>
              </h3>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isModal && (
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
                title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                aria-label="Toggle full screen"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition-colors"
                title="Close Diff Viewer (Esc)"
                aria-label="Close diff viewer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Navigation & Controls Strip */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs shrink-0">
          {/* Match Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollToMatch((activeMatchIndex - 1 + filteredMatches.length) % filteredMatches.length)}
              disabled={filteredMatches.length <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Previous Match (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700 min-w-[80px] text-center">
              {filteredMatches.length > 0 ? (
                <>Match <strong>{activeMatchIndex + 1}</strong> of <strong>{filteredMatches.length}</strong></>
              ) : (
                '0 Matches'
              )}
            </span>

            <button
              onClick={() => scrollToMatch((activeMatchIndex + 1) % filteredMatches.length)}
              disabled={filteredMatches.length <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Next Match (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Active Match Badge */}
            {activeBadge && (
              <div className="flex items-center gap-1.5 ml-2">
                <span className={`px-2 py-0.5 rounded-full font-bold border ${activeBadge.bg}`}>
                  {activeBadge.label}
                </span>
                <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {activeMatchSim}%
                </span>
              </div>
            )}
          </div>

          {/* Filters & Scroll Sync Switch */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Sync Scroll Toggle */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer select-none text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 rounded"
              />
              <span>Sync Scroll</span>
            </label>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('exact')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${filterType === 'exact' ? 'bg-white text-red-700 shadow-2xs' : 'text-slate-600 hover:text-red-700'}`}
              >
                Exact
              </button>
              <button
                onClick={() => setFilterType('near')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${filterType === 'near' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-amber-700'}`}
              >
                Near
              </button>
              <button
                onClick={() => setFilterType('partial')}
                className={`px-2 py-1 rounded-md font-semibold transition-colors ${filterType === 'partial' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-blue-700'}`}
              >
                Partial
              </button>
            </div>

            {/* In-Diff Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter phrases…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-28 sm:w-36 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Legend strip */}
        <div className="px-5 py-1.5 bg-slate-100/70 border-b border-slate-200 text-[11px] text-slate-600 flex items-center gap-4 flex-wrap shrink-0">
          <span className="font-semibold text-slate-500">Legend:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-red-100 border border-red-400"></span>
            <span>Identical matched tokens</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-rose-50 border border-rose-300"></span>
            <span>Only in Document A</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-emerald-50 border border-emerald-300"></span>
            <span>Only in Document B</span>
          </span>
        </div>

        {/* Dual Pane Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-0 bg-slate-50/30">
          {/* Document A Column */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-xs text-slate-800 truncate" title={docAName}>
                  Document A: {docAName}
                </span>
              </div>
              <button
                onClick={() => {
                  const textA = activeMatch?.documentAPassage || activeMatch?.documentA?.text || '';
                  handleCopyText('A', textA);
                }}
                className="text-[11px] font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Copy active passage from Document A"
              >
                {copiedSide === 'A' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copiedSide === 'A' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Scrollable Passage List A */}
            <div
              ref={paneARef}
              onScroll={handleScrollA}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {filteredMatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No matching passages found for the selected filter.
                </div>
              ) : (
                filteredMatches.map((m, idx) => {
                  const isActive = idx === activeMatchIndex;
                  const diff = computedDiffs[idx];
                  const sim = m.similarity ?? Math.round((m.combinedSimilarity || m.similarityScore || 0) * 100);
                  const isExact = sim === 100 || (m.matchType || '').toLowerCase() === 'exact_match';
                  const passageIdx = m.documentA?.passageIndex ?? idx + 1;

                  return (
                    <div
                      key={m.matchId || idx}
                      ref={el => matchCardsRefA.current[idx] = el}
                      onClick={() => scrollToMatch(idx)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-700">
                          Passage #{passageIdx}
                        </span>
                        <span className="font-semibold text-slate-500">
                          Match #{idx + 1} ({sim}%)
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed text-slate-900 font-mono break-words select-text">
                        <TokenizedPassage tokens={diff?.tokensA} side="A" isExact={isExact} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Document B Column */}
          <div className="flex flex-col min-h-0">
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-xs text-slate-800 truncate" title={docBName}>
                  Document B: {docBName}
                </span>
              </div>
              <button
                onClick={() => {
                  const textB = activeMatch?.documentBPassage || activeMatch?.documentB?.text || '';
                  handleCopyText('B', textB);
                }}
                className="text-[11px] font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Copy active passage from Document B"
              >
                {copiedSide === 'B' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copiedSide === 'B' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Scrollable Passage List B */}
            <div
              ref={paneBRef}
              onScroll={handleScrollB}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {filteredMatches.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No matching passages found for the selected filter.
                </div>
              ) : (
                filteredMatches.map((m, idx) => {
                  const isActive = idx === activeMatchIndex;
                  const diff = computedDiffs[idx];
                  const sim = m.similarity ?? Math.round((m.combinedSimilarity || m.similarityScore || 0) * 100);
                  const isExact = sim === 100 || (m.matchType || '').toLowerCase() === 'exact_match';
                  const passageIdx = m.documentB?.passageIndex ?? idx + 1;

                  return (
                    <div
                      key={m.matchId || idx}
                      ref={el => matchCardsRefB.current[idx] = el}
                      onClick={() => scrollToMatch(idx)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                          : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-700">
                          Passage #{passageIdx}
                        </span>
                        <span className="font-semibold text-slate-500">
                          Match #{idx + 1} ({sim}%)
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed text-slate-900 font-mono break-words select-text">
                        <TokenizedPassage tokens={diff?.tokensB} side="B" isExact={isExact} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer Metrics Breakdown Bar */}
        {activeMatch && (
          <footer className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap text-xs shrink-0">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-slate-500 font-medium">
                Active Match Metrics:
              </span>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800">
                Combined Similarity: <strong>{activeMatchSim}%</strong>
              </span>
              {typeof activeMatch.jaccardSimilarity === 'number' && (
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                  Jaccard Index: <strong>{(activeMatch.jaccardSimilarity * 100).toFixed(1)}%</strong>
                </span>
              )}
              {typeof activeMatch.levenshteinSimilarity === 'number' && (
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium text-slate-700">
                  Levenshtein: <strong>{(activeMatch.levenshteinSimilarity * 100).toFixed(1)}%</strong>
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Tip: Use ← / → arrow keys to quickly navigate between matches.
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
