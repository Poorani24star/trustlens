// Single source of truth for role display labels and badge colors.
// Import from here — do NOT redefine these in individual components.

export const ROLE_LABELS = {
  student:    'Student',
  faculty:    'Faculty',
  researcher: 'Researcher',
  admin:      'Administrator',
};

// Tailwind badge classes for role pills (bg + text + border)
export const ROLE_COLORS = {
  student:    'bg-blue-50 text-blue-700 border-blue-200',
  faculty:    'bg-violet-50 text-violet-700 border-violet-200',
  researcher: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  admin:      'bg-amber-50 text-amber-700 border-amber-200',
};

export const ROLE_FALLBACK_COLOR = 'bg-slate-50 text-slate-700 border-slate-200';
