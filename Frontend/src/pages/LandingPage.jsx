import { Link } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import Button from '../components/Button';

function HeroVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto select-none" aria-hidden="true">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-elevated p-5 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <div className="w-3 h-3 rounded-full bg-slate-200" />
          <div className="h-2.5 w-32 bg-slate-100 rounded-full" />
        </div>
        {[
          { color: 'bg-green-100 text-green-700 border-green-200', icon: '✓', label: 'Verified', line: 'w-40' },
          { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '⚠', label: 'Potential issue', line: 'w-28' },
          { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: '≡', label: 'Matching content', line: 'w-36' },
        ].map(({ color, icon, label, line }) => (
          <div key={label} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs font-medium ${color}`}>
            <span className="text-sm">{icon}</span>
            <span>{label}</span>
            <div className={`ml-auto h-2 ${line} bg-current opacity-20 rounded-full`} />
          </div>
        ))}
        <div className="pt-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
            <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4">
              <circle cx="14" cy="14" r="9" stroke="white" strokeWidth="2.5" />
              <path d="M21 21L27 27" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M10.5 14l2.5 2.5 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xs text-slate-500">Analysis complete</span>
          <span className="ml-auto text-xs font-semibold text-blue-600">View Report →</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { n: '1', title: 'Upload', desc: 'Upload your document or a ZIP containing multiple documents.' },
  { n: '2', title: 'Analyze', desc: 'TrustLens processes the content and performs the selected analysis.' },
  { n: '3', title: 'Understand', desc: 'Review detected issues or matching content with clear explanations.' },
  { n: '4', title: 'Act', desc: 'Download the report and make an informed decision.' },
];

const USERS = [
  { icon: '🎓', title: 'Students', desc: 'Verify information in assignments, projects and documents.' },
  { icon: '🏫', title: 'Faculty & Researchers', desc: 'Review documents and identify copied content efficiently.' },
  { icon: '🛡️', title: 'Administrators', desc: 'Maintain trusted reference sources and manage the platform.' },
];

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              Document Analysis Platform
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
              See what's true.<br />See what's copied.
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              TrustLens helps you verify information in documents and identify copied text across multiple documents — clearly, responsibly, and efficiently.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register"><Button size="lg">Get Started</Button></Link>
              <Link to="/login"><Button variant="secondary" size="lg">Login</Button></Link>
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Two core modules */}
      <section id="features" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">What can you do with TrustLens?</h2>
            <p className="mt-2 text-slate-500">Two independent capabilities — each designed for a specific purpose.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7 flex flex-col gap-5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7h-1a1 1 0 00-1 1v1" />
                  <circle cx="17" cy="17" r="3" stroke="currentColor" strokeWidth={1.8} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5l1.5 1.5" />
                </svg>
              </div>
              <div className="space-y-2">
                <div className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-600 text-white">Module 1</div>
                <h3 className="text-xl font-bold text-slate-900">AI Error Detection</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Check the factual information in your document against trusted reference sources.
                </p>
              </div>
              <div className="mt-auto">
                <Link to="/register">
                  <Button variant="secondary" size="sm">Explore Error Detection</Button>
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-7 flex flex-col gap-5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center" aria-hidden="true">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a2 2 0 002 2h4a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6z" />
                </svg>
              </div>
              <div className="space-y-2">
                <div className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">Module 2</div>
                <h3 className="text-xl font-bold text-slate-900">Copied Content Identification</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Compare multiple documents to find exact and near-exact copied text — without treating similar ideas as plagiarism.
                </p>
              </div>
              <div className="mt-auto">
                <Link to="/register">
                  <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">Explore Copied Content</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 sm:py-20 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Simple from start to finish.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, desc }, i) => (
              <div key={n} className="relative flex flex-col gap-3">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(100%-0px)] w-full h-px bg-slate-200 -translate-x-6 z-0" aria-hidden="true" />
                )}
                <div className="relative z-10 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {n}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section id="about" className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Who is TrustLens for?</h2>
            <p className="mt-2 text-slate-500">Designed for everyone who works with documents.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {USERS.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 text-center space-y-3">
                <span className="text-3xl" role="img" aria-label={title}>{icon}</span>
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / responsibility */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Clear results. Informed decisions.</h2>
          <p className="text-slate-300 leading-relaxed">
            TrustLens provides evidence and explanations to help users review their documents. Detected issues and textual matches should always be reviewed before making a final decision.
          </p>
          <div className="bg-white/10 border border-white/20 rounded-xl p-5 text-left text-sm text-slate-300 leading-relaxed">
            <span className="font-semibold text-white block mb-1">A note on copied content:</span>
            Textual overlap does not automatically prove plagiarism. Similar ideas, common terminology, or common knowledge should not be treated as copied content simply because the topic is the same.
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 bg-white border-t border-slate-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Ready to take a closer look?</h2>
          <p className="text-slate-500">Upload, verify and understand your documents with TrustLens.</p>
          <Link to="/register"><Button size="lg">Get Started</Button></Link>
        </div>
      </section>
    </PublicLayout>
  );
}
