import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const VARIANTS = {
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800',
    icon: <CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" aria-hidden="true" />,
  },
  error: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />,
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" aria-hidden="true" />,
  },
};

/**
 * Inline toast — renders in document flow, not a portal.
 * Auto-dismisses after `duration` ms when onDismiss is provided.
 */
export default function Toast({ message, variant = 'info', onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!message || !onDismiss) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  if (!message) return null;

  const { wrapper, icon } = VARIANTS[variant] ?? VARIANTS.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-sm ${wrapper}`}
    >
      {icon}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="ml-1 p-0.5 rounded hover:opacity-70 focus-visible:outline-2 focus-visible:outline-current"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
