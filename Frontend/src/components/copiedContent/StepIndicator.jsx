const STEPS = [
  { n: '01', label: 'Prepare ZIP' },
  { n: '02', label: 'Upload' },
  { n: '03', label: 'Review files' },
  { n: '04', label: 'Compare' },
];

export default function StepIndicator({ currentStep = 1 }) {
  return (
    <nav aria-label="Upload progress steps">
      <ol className="flex items-center gap-0" role="list">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === currentStep;
          const isDone = stepNum < currentStep;
          const isLast = i === STEPS.length - 1;

          return (
            <li key={step.n} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                    ${isDone ? 'bg-indigo-600 text-white'
                      : isActive ? 'bg-indigo-600 text-white ring-4 ring-indigo-100'
                      : 'bg-slate-100 text-slate-400'}`}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${stepNum}: ${step.label}${isDone ? ' — completed' : isActive ? ' — current' : ''}`}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.n}
                </span>
                <span className={`text-xs font-medium text-center leading-tight hidden sm:block
                  ${isActive ? 'text-indigo-700' : isDone ? 'text-slate-500' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`h-px flex-1 mx-1 transition-colors ${isDone ? 'bg-indigo-300' : 'bg-slate-200'}`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
