import { useEffect, useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import WelcomeBanner from '../components/dashboard/WelcomeBanner';
import AnalysisCard from '../components/dashboard/AnalysisCard';
import StatCard from '../components/dashboard/StatCard';
import ActivityList from '../components/dashboard/ActivityList';
import HelpSection from '../components/dashboard/HelpSection';
import { useAuth } from '../context/AuthContext';
import { getActivity, getStats } from '../services/dashboardService';
import { hasPermission } from '../config/rolePermissions';

// Stat icons
const STAT_ICONS = {
  documentsAnalyzed: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  issuesFound: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  copiedContentAnalyses: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  reportsGenerated: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const STAT_LABELS = {
  documentsAnalyzed: 'Documents Analyzed',
  issuesFound: 'Potential Issues Found',
  copiedContentAnalyses: 'Copied Content Analyses',
  reportsGenerated: 'Reports Generated',
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getActivity().then(setActivity);
    getStats().then(setStats);
  }, []);

  // Build card list based on role permissions — students never see copied-content
  const canAccessCopiedContent = hasPermission(user?.role, 'copiedContent');
  const cardOrder = canAccessCopiedContent
    ? (user?.role === 'faculty' ? ['copied-content', 'error-detection'] : ['error-detection', 'copied-content'])
    : ['error-detection'];

  return (
    <DashboardLayout pageTitle="Dashboard">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Welcome */}
        <WelcomeBanner />

        {/* Primary actions */}
        <section aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="text-base font-semibold text-slate-700 mb-4">
            What would you like to do?
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {cardOrder.map(type => (
              <AnalysisCard key={type} type={type} role={user?.role} />
            ))}
          </div>
        </section>

        {/* Quick statistics */}
        {stats && (
          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className="text-base font-semibold text-slate-700 mb-4">
              Your Activity
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(stats).map(([key, value]) => (
                <StatCard
                  key={key}
                  label={STAT_LABELS[key]}
                  value={value}
                  icon={STAT_ICONS[key]}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent activity */}
        <section aria-labelledby="activity-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="activity-heading" className="text-base font-semibold text-slate-700">
              Recent Activity
            </h2>
            {activity.length > 0 && (
              <a
                href="/reports-history"
                className="text-sm text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
              >
                View all
              </a>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card px-5 py-4">
            <ActivityList items={activity} />
          </div>
        </section>

        {/* Help */}
        <HelpSection />

      </div>
    </DashboardLayout>
  );
}
