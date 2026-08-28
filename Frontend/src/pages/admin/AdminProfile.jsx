import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import AdminLayout from '../../layouts/AdminLayout';
import Button from '../../components/Button';
import ProfileHeader from '../../components/profile/ProfileHeader';
import PersonalInformationCard from '../../components/profile/PersonalInformationCard';
import AccountInformationCard from '../../components/profile/AccountInformationCard';
import SecurityCard from '../../components/profile/SecurityCard';
import { useAuth } from '../../context/AuthContext';

const MEMBER_SINCE_FALLBACK = 'January 2026';

export default function AdminProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.name ?? '');

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <AdminLayout pageTitle="Profile">
      <div className="max-w-2xl mx-auto space-y-5">

        <ProfileHeader name={displayName} role={user.role} memberSince={MEMBER_SINCE_FALLBACK} />

        <PersonalInformationCard
          name={displayName}
          email={user.email}
          role={user.role}
          onNameSave={setDisplayName}
        />

        <AccountInformationCard role={user.role} memberSince={MEMBER_SINCE_FALLBACK} />

        <SecurityCard />

        {/* Account actions */}
        <section
          aria-labelledby="admin-account-actions"
          className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4"
        >
          <h3 id="admin-account-actions" className="text-base font-semibold text-slate-900">Account Actions</h3>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Sign out</p>
              <p className="text-xs text-slate-400 mt-0.5">You will be returned to the login page.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Sign out of TrustLens"
              className="shrink-0 text-slate-700 hover:text-red-600 hover:border-red-300 hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              Log Out
            </Button>
          </div>
        </section>

      </div>
    </AdminLayout>
  );
}
