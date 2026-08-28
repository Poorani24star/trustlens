import Toggle from '../ui/Toggle';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
];

export default function PreferencesCard({ notifications, onNotificationsChange, theme, onThemeChange }) {
  return (
    <section aria-labelledby="preferences-heading" className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
      <h3 id="preferences-heading" className="text-base font-semibold text-slate-900">
        Preferences
      </h3>

      {/* Notifications */}
      <Toggle
        id="pref-notifications"
        checked={notifications}
        onChange={onNotificationsChange}
        label="Email Notifications"
        description="Receive notifications about completed document analyses and reports."
      />

      {/* Divider */}
      <div className="border-t border-slate-100" aria-hidden="true" />

      {/* Theme */}
      <div className="space-y-1.5">
        <label htmlFor="pref-theme" className="text-sm font-medium text-slate-700">
          Theme
        </label>
        <select
          id="pref-theme"
          value={theme}
          onChange={e => onThemeChange(e.target.value)}
          className="w-full sm:w-48 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900
            focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
        >
          {THEME_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400">
          Theme customisation will be applied in a future update.
        </p>
      </div>
    </section>
  );
}
