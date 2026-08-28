import { useEffect, useRef, useState } from 'react';
import { X, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import { SUPPORTED_TOPICS, SUPPORTED_DOMAIN } from '../../constants/domainConstants';

const SOURCE_TYPES = [
  'Official Documentation',
  'Academic Textbook',
  'Research Paper',
  'Educational Resource',
  'Standard',
  'Technical Documentation',
];

function isValidUrl(val) {
  if (!val) return true;
  try { new URL(val); return true; } catch { return false; }
}

function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    )
  );
}

export default function AddSourceModal({ onClose, onAdd, triggerRef }) {
  const [inputMode, setInputMode] = useState('url'); // 'url' | 'file' | 'text'
  const [form, setForm] = useState({
    name: '',
    url: '',
    domain: SUPPORTED_DOMAIN,
    topics: ['Cloud Computing'],
    sourceType: 'Official Documentation',
    sourceOrganization: '',
    description: '',
    text: '',
    status: 'active',
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => { closeRef.current?.focus(); }, []);

  useEffect(() => {
    return () => { triggerRef?.current?.focus(); };
  }, [triggerRef]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable(dialogRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function handleTopicToggle(topicName) {
    setForm((prev) => {
      const current = prev.topics || [];
      let updated = [];
      if (current.includes(topicName)) {
        updated = current.filter((t) => t !== topicName);
      } else {
        updated = [...current, topicName];
      }
      return { ...prev, topics: updated };
    });
    setErrors((e) => ({ ...e, topics: '' }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Source title is required.';
    if (!form.topics || form.topics.length === 0) e.topics = 'Please select at least one Computer Science topic.';

    if (inputMode === 'url') {
      if (!form.url.trim()) e.url = 'URL is required for web reference.';
      else if (!isValidUrl(form.url)) e.url = 'Please enter a valid URL (e.g., https://example.com).';
    } else if (inputMode === 'file') {
      if (!file) e.file = 'Please select a document file (PDF, DOCX, TXT).';
    } else if (inputMode === 'text') {
      if (!form.text.trim()) e.text = 'Trusted knowledge content is required.';
      else if (form.text.trim().length < 10) e.text = 'Trusted content must be at least 10 characters long.';
    }

    return e;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    onAdd({
      ...form,
      category: form.topics[0] || 'Computer Science',
      file: inputMode === 'file' ? file : null,
      sourceType: form.sourceType,
      inputMode,
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-source-title"
      aria-describedby="add-source-notice"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className="bg-white rounded-2xl shadow-elevated w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 id="add-source-title" className="text-base font-semibold text-slate-900">Add Trusted Knowledge Source</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Close add source modal"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div id="add-source-notice" className="mx-6 mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs text-blue-800">
          Only verified Computer Science knowledge sources reviewed and approved by an administrator will be stored for factual verification.
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-6 py-4 space-y-4">
          {/* Input Mode Selector */}
          <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => { setInputMode('url'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                inputMode === 'url' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Web Reference
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('file'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                inputMode === 'file' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Document File
            </button>
            <button
              type="button"
              onClick={() => { setInputMode('text'); setErrors({}); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                inputMode === 'text' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Direct Text Input
            </button>
          </div>

          {/* Title */}
          <Input 
            id="src-name" 
            label="Source Title *" 
            placeholder="e.g. NIST Definition of Cloud Computing" 
            value={form.name} 
            onChange={e => set('name', e.target.value)} 
            error={errors.name} 
          />

          {/* Domain (Read-Only) & Source Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Domain</label>
              <input
                type="text"
                value={form.domain}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 bg-slate-50 cursor-not-allowed font-medium"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="src-type" className="text-sm font-medium text-slate-700">Source Type</label>
              <select
                id="src-type"
                value={form.sourceType}
                onChange={e => set('sourceType', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {SOURCE_TYPES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          {/* Organization / Author & Status */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="src-org"
              label="Organization / Author"
              placeholder="e.g. NIST, IEEE, ACM, Oracle"
              value={form.sourceOrganization}
              onChange={e => set('sourceOrganization', e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="src-status" className="text-sm font-medium text-slate-700">Status</label>
              <select
                id="src-status"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="active">Active (Available for Retrieval)</option>
                <option value="inactive">Inactive (Excluded from Retrieval)</option>
              </select>
            </div>
          </div>

          {/* Topics Multi-Select Checkboxes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Supported Computer Science Topics *</label>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
              {SUPPORTED_TOPICS.map((topic) => {
                const isChecked = (form.topics || []).includes(topic);
                return (
                  <label key={topic} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer hover:text-blue-600 select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTopicToggle(topic)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{topic}</span>
                  </label>
                );
              })}
            </div>
            {errors.topics && <p role="alert" className="text-xs text-red-600"><span aria-hidden="true">⚠</span> {errors.topics}</p>}
          </div>

          {/* Mode-specific input */}
          {inputMode === 'url' && (
            <Input 
              id="src-url" 
              label="Source URL *" 
              placeholder="https://csrc.nist.gov/publications/detail/sp/800-145/final" 
              value={form.url} 
              onChange={e => set('url', e.target.value)} 
              error={errors.url} 
              type="url" 
            />
          )}

          {inputMode === 'file' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="src-file" className="text-sm font-medium text-slate-700">Document File (PDF, DOCX, TXT) *</label>
              <input
                id="src-file"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={e => {
                  setFile(e.target.files[0] || null);
                  setErrors(prev => ({ ...prev, file: '' }));
                }}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {errors.file && <p role="alert" className="text-xs text-red-600"><span aria-hidden="true">⚠</span> {errors.file}</p>}
            </div>
          )}

          {inputMode === 'text' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="src-text" className="text-sm font-medium text-slate-700">Trusted Knowledge Content *</label>
              <textarea
                id="src-text"
                rows={4}
                placeholder="Paste reference text content here..."
                value={form.text}
                onChange={e => set('text', e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 resize-none
                  ${errors.text ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'}`}
              />
              {errors.text && <p role="alert" className="text-xs text-red-600"><span aria-hidden="true">⚠</span> {errors.text}</p>}
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="src-desc" className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              id="src-desc"
              rows={2}
              placeholder="Brief description of this knowledge source..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm">Add Knowledge Source</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
