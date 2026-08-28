import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Activity } from 'lucide-react';
import Button from '../Button';

const ACTIONS = [
  { label: 'Manage Users',          to: '/admin/users',                icon: <Users     className="w-4 h-4" aria-hidden="true" /> },
  { label: 'Knowledge Repository',  to: '/admin/knowledge-repository', icon: <BookOpen  className="w-4 h-4" aria-hidden="true" /> },
  { label: 'View Activity',         to: '/admin/activity',             icon: <Activity  className="w-4 h-4" aria-hidden="true" /> },
];

export default function QuickActions() {
  const navigate = useNavigate();
  return (
    <section aria-labelledby="quick-actions-heading" className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
      <h2 id="quick-actions-heading" className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
      <div className="flex flex-wrap gap-3">
        {ACTIONS.map(({ label, to, icon }) => (
          <Button key={to} variant="outline" size="sm" onClick={() => navigate(to)}>
            {icon}
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}
