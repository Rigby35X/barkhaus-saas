import { useState, useEffect, lazy, Suspense, type FormEvent } from 'react';
import {
  validateLogin,
  saveSession,
  logout,
  restoreSession,
  loginUnified,
  initSession,
  TOKEN_KEY,
} from './lib/auth';
import { ORGANIZATIONS, type OrgConfig } from './lib/api';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import { isOnboardingComplete, resetOnboarding } from './lib/onboarding';
import type { TabKey } from './components/Sidebar';

// Lazy-loaded tabs
const DashboardOverview = lazy(() => import('./tabs/DashboardOverview'));
const AnimalsTab = lazy(() => import('./tabs/AnimalsTab'));
const ApplicationsTab = lazy(() => import('./tabs/ApplicationsTab'));
const WebsiteContentTab = lazy(() => import('./tabs/WebsiteContentTab'));
const SettingsTab = lazy(() => import('./tabs/SettingsTab'));
const CommunicationsTab = lazy(() => import('./tabs/CommunicationsTab'));
const SocialMediaTab = lazy(() => import('./tabs/SocialMediaTab'));
const EventsTab = lazy(() => import('./tabs/EventsTab'));
const DonationsTab = lazy(() => import('./tabs/DonationsTab'));
const IntegrationsTab = lazy(() => import('./tabs/IntegrationsTab'));

interface Session {
  orgId: number;
  orgConfig: OrgConfig;
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-silver-gray border-t-warm-brown rounded-full animate-spin" />
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  // Primary: email + password
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Legacy toggle
  const [showLegacy, setShowLegacy] = useState(false);
  const [orgIdInput, setOrgIdInput] = useState('9');
  const [accessCode, setAccessCode] = useState('mbpr2024');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await loginUnified(email, emailPassword);
      if (result.type === 'jwt') {
        localStorage.setItem(TOKEN_KEY, result.token);
        // For JWT logins default to admin org view
        const orgId = 8;
        const orgConfig = ORGANIZATIONS[orgId] ?? Object.values(ORGANIZATIONS)[0];
        saveSession(orgId, orgConfig.accessCode);
        onLogin({ orgId, orgConfig });
      } else {
        saveSession(result.orgId, result.orgConfig.accessCode);
        onLogin({ orgId: result.orgId, orgConfig: result.orgConfig });
      }
    } catch {
      setError('Invalid email or password.');
    }
    setLoading(false);
  };

  const handleLegacySubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const orgId = parseInt(orgIdInput, 10);
    const config = validateLogin(orgId, accessCode);
    if (config) {
      saveSession(orgId, accessCode);
      onLogin({ orgId, orgConfig: config });
    } else {
      setError('Invalid organization ID or access code.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-deep-taupe">Admin Dashboard</h1>
          <p className="text-stone mt-2">Animal Rescue Management</p>
        </div>

        {!showLegacy ? (
          <>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@happypaws.org"
                  className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Password</label>
                <input
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowLegacy(true); setError(''); }}
                className="text-xs text-stone hover:text-warm-brown underline"
              >
                Use Org ID instead
              </button>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleLegacySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Organization ID</label>
                <input
                  type="number"
                  value={orgIdInput}
                  onChange={(e) => setOrgIdInput(e.target.value)}
                  className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Access Code</label>
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowLegacy(false); setError(''); }}
                className="text-xs text-stone hover:text-warm-brown underline"
              >
                Use email instead
              </button>
            </div>

            {/* Credentials hint */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-semibold text-blue-800 mb-2">Available Organizations:</p>
              <div className="space-y-1 text-xs text-blue-700">
                {Object.entries(ORGANIZATIONS).map(([id, org]) => (
                  <div key={id} className={`flex justify-between ${org.isAdmin ? 'bg-blue-100 px-1 py-0.5 rounded font-semibold' : ''}`}>
                    <span>ID {id}: {org.name}</span>
                    <span className="font-mono">{org.accessCode}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check URL for ?token= parameter (from marketing signup/login redirect)
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);
      // Clean the URL
      const cleanUrl = window.location.pathname + window.location.hash;
      history.replaceState(null, '', cleanUrl);
    }

    // Try JWT session first
    initSession().then((jwtSession) => {
      if (jwtSession) {
        // JWT login: map to default org or admin
        const orgId = 8;
        const orgConfig = ORGANIZATIONS[orgId] ?? Object.values(ORGANIZATIONS)[0];
        setSession({ orgId, orgConfig });
        if (!isOnboardingComplete()) setShowOnboarding(true);
        return;
      }

      // Fall back to legacy session
      const restored = restoreSession();
      if (restored) {
        setSession({ orgId: restored.session.orgId, orgConfig: restored.org });
        if (!isOnboardingComplete()) setShowOnboarding(true);
      }
    }).catch(() => {
      // If initSession throws, fall back to legacy
      const restored = restoreSession();
      if (restored) {
        setSession({ orgId: restored.session.orgId, orgConfig: restored.org });
        if (!isOnboardingComplete()) setShowOnboarding(true);
      }
    });
  }, []);

  const handleLogin = (s: Session) => {
    setSession(s);
    if (!isOnboardingComplete()) {
      setShowOnboarding(true);
    }
  };

  const handleLogout = () => {
    logout();
    setSession(null);
    setShowOnboarding(false);
  };

  const handleRestartTour = () => {
    resetOnboarding();
    setActiveTab('overview');
    setShowOnboarding(true);
  };

  const handleOrgSwitch = (newOrgId: number) => {
    const newConfig = ORGANIZATIONS[newOrgId];
    if (newConfig && session) {
      saveSession(newOrgId, newConfig.accessCode);
      setSession({ orgId: newOrgId, orgConfig: newConfig });
      setActiveTab('overview');
    }
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const tabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview orgId={session.orgId} onTabChange={setActiveTab} />;
      case 'animals':
        return <AnimalsTab orgId={session.orgId} />;
      case 'applications':
        return <ApplicationsTab orgId={session.orgId} />;
      case 'website-content':
        return <WebsiteContentTab orgId={session.orgId} />;
      case 'settings':
        return <SettingsTab orgId={session.orgId} orgConfig={session.orgConfig} />;
      case 'communications':
        return <CommunicationsTab orgId={session.orgId} />;
      case 'social-media':
        return <SocialMediaTab orgId={session.orgId} orgConfig={session.orgConfig} />;
      case 'events':
        return <EventsTab orgId={session.orgId} />;
      case 'donations':
        return <DonationsTab orgId={session.orgId} />;
      case 'integrations':
        return <IntegrationsTab orgId={session.orgId} />;
      default:
        return <DashboardOverview orgId={session.orgId} onTabChange={setActiveTab} />;
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        orgId={session.orgId}
        orgConfig={session.orgConfig}
        onLogout={handleLogout}
        onOrgSwitch={session.orgConfig.isAdmin ? handleOrgSwitch : undefined}
        onRestartTour={handleRestartTour}
      >
        <Suspense fallback={<TabSpinner />}>
          {tabContent()}
        </Suspense>
      </Layout>

      {showOnboarding && (
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          onNavigateTab={setActiveTab}
        />
      )}
    </>
  );
}

export default App;
