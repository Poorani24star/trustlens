import { useState } from 'react';
import { Pencil } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import Toast from '../ui/Toast';
import { ROLE_LABELS } from '../../constants/roles';

function ReadOnlyField({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value}</p>
    </div>
  );
}

export default function PersonalInformationCard({ name, email, role, onNameSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [nameError, setNameError] = useState('');
  const [toast, setToast] = useState(null);

  function handleEdit() {
    setDraftName(name);
    setNameError('');
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setNameError('');
  }

  function handleSave() {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Please enter your name (at least 2 characters).');
      return;
    }
    onNameSave(trimmed);
    setIsEditing(false);
    setNameError('');
    setToast({ message: 'Profile updated successfully.', variant: 'success' });
  }

  return (
    <section aria-labelledby="personal-info-heading" className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 id="personal-info-heading" className="text-base font-semibold text-slate-900">
          Personal Information
        </h3>
        {!isEditing && (
          <Button variant="ghost" size="sm" onClick={handleEdit} aria-label="Edit personal information">
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            Edit Profile
          </Button>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}

      <div className="space-y-5">
        {isEditing ? (
          <Input
            label="Full Name"
            id="profile-name"
            type="text"
            value={draftName}
            onChange={e => { setDraftName(e.target.value); if (nameError) setNameError(''); }}
            error={nameError}
            autoFocus
            autoComplete="name"
          />
        ) : (
          <ReadOnlyField label="Full Name" value={name} />
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
          <p className="text-sm text-slate-800 font-medium">{email}</p>
          <p className="text-xs text-slate-400">To change your email address, please contact support.</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Role</p>
          <p className="text-sm text-slate-800 font-medium">{ROLE_LABELS[role] ?? role}</p>
          <p className="text-xs text-slate-400">Your role determines which TrustLens features are available to you.</p>
        </div>
      </div>

      {isEditing && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={handleSave}>Save Changes</Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      )}
    </section>
  );
}
