import { useState } from 'react';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';

export default function AdminLayout({ children, pageTitle }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AdminHeader onMenuOpen={() => setSidebarOpen(true)} pageTitle={pageTitle} />

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
