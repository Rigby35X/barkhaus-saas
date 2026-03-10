import { useState, useEffect, lazy, Suspense, type FormEvent } from 'react';
import { validateLogin, saveSession, clearSession, restoreSession } from './lib/auth';
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
  const [orgIdInput, setOrgIdInput] = useState('9');
  const [accessCode, setAccessCode] = useState('mbpr2024');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const orgId = parseInt(orgIdInput);
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const restored = restoreSession();
    if (restored) {
      setSession({ orgId: restored.session.orgId, orgConfig: restored.org });
      // Don't auto-start tour for restored sessions
    }
  }, []);

  const handleLogin = (s: Session) => {
    setSession(s);
    // Auto-start tour on first-ever login
    if (!isOnboardingComplete()) {
      setShowOnboarding(true);
    }
  };

  const handleLogout = () => {
    clearSession();
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
