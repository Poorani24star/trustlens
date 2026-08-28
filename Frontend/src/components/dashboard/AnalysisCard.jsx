import { useNavigate } from 'react-router-dom';
import Button from '../Button';

function ErrorDetectionIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      <circle cx="17" cy="17" r="3.5" stroke="currentColor" strokeWidth={1.6} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5l1.5 1.5" />
    </svg>
  );
}

function CopiedContentIcon() {
  return (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a2 2 0 002 2h4a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6z" />
    </svg>
  );
}

const CARDS = {
  'error-detection': {
    icon: <ErrorDetectionIcon />,
    module: 'Module 1',
    title: 'Error Detection',
    description: 'Check the factual information in your document against trusted reference sources.',
    formats: 'PDF · DOCX · Images',
    cta: 'Check a Document',
    hint: 'Best for assignments, reports and research documents.',
    to: '/error-detection',
    accentClass: 'text-blue-600',
    iconBg: 'bg-blue-50 border-blue-100',
    badgeBg: 'bg-blue-600',
  },
  'copied-content': {
    icon: <CopiedContentIcon />,
    module: 'Module 2',
    title: 'Copied Content',
    description: 'Compare multiple documents to identify exact and near-exact copied text.',
    formats: 'Up to 60 documents',
    cta: 'Compare Documents',
    hint: 'Best for assignments, reports and document batches.',
    to: '/copied-content',
    accentClass: 'text-indigo-600',
    iconBg: 'bg-indigo-50 border-indigo-100',
    badgeBg: 'bg-indigo-600',
  },
};

// Roles where error-detection is primary; otherwise copied-content is primary
const ERROR_DETECTION_PRIMARY = ['student', 'researcher'];

export default function AnalysisCard({ type, role }) {
  const navigate = useNavigate();
  const card = CARDS[type];
  const isPrimary = ERROR_DETECTION_PRIMARY.includes(role)
    ? type === 'error-detection'
    : type === 'copied-content';

  return (
    <article
      className={`relative flex flex-col gap-5 rounded-2xl border p-6 bg-white transition-shadow hover:shadow-elevated
        ${isPrimary ? 'border-blue-200 shadow-elevated ring-1 ring-blue-100' : 'border-slate-200 shadow-card'}`}
      aria-label={`${card.title} module`}
    >
      {isPrimary && (
        <span className="absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          Recommended
        </span>
      )}

      {/* Icon + badge */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg} ${card.accentClass}`}>
          {card.icon}
        </div>
        <div className="pt-0.5">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded text-white ${card.badgeBg}`}>
            {card.module}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-2">
        <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{card.description}</p>
        <p className="text-xs text-slate-400 font-medium">{card.formats}</p>
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <Button
          variant={isPrimary ? 'primary' : 'secondary'}
          className="w-full"
          onClick={() => navigate(card.to)}
          aria-label={`${card.cta} — ${card.title}`}
        >
          {card.cta}
        </Button>
        <p className="text-xs text-slate-400 text-center">{card.hint}</p>
      </div>
    </article>
  );
}
