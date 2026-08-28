import { useAuth } from '../../context/AuthContext';

const ROLE_COPY = {
  student: {
    sub: 'What would you like to check today?',
  },
  faculty: {
    sub: 'Check documents and compare assignments in one place.',
  },
  researcher: {
    sub: 'Verify documents and compare textual content.',
  },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeBanner() {
  const { user } = useAuth();
  const copy = ROLE_COPY[user?.role] ?? ROLE_COPY.student;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-900">
        {getGreeting()}, {firstName} 👋
      </h2>
      <p className="mt-1 text-slate-500 text-sm">{copy.sub}</p>
    </div>
  );
}
