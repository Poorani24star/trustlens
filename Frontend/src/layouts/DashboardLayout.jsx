import { useState } from 'react';
import DashboardSidebar from '../components/dashboard/DashboardSidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';

export default function DashboardLayout({ children, pageTitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader onMenuOpen={() => setSidebarOpen(true)} pageTitle={pageTitle} />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
