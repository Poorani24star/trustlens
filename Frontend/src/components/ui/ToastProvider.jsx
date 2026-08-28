import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />,
  error:   <AlertCircle className="w-4 h-4 text-red-600 shrink-0"   aria-hidden="true" />,
  info:    <Info         className="w-4 h-4 text-blue-600 shrink-0"  aria-hidden="true" />,
};

const STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error:   'bg-red-50 border-red-200 text-red-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
};

function ToastItem({ id, message, variant = 'info', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), 4000);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm shadow-elevated max-w-sm w-full ${STYLES[variant] ?? STYLES.info}`}>
      {ICONS[variant] ?? ICONS.info}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className="ml-1 p-0.5 rounded hover:opacity-70 focus-visible:outline-2 focus-visible:outline-current"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message, variant = 'info') => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {/* Fixed portal — single aria-live region for the whole app */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Call showToast('message', 'success' | 'error' | 'info') from any component. */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
