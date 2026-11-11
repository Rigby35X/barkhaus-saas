import { useState, useEffect, lazy, Suspense } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { resolveWorkspaceRoute, workspacePath } from './lib/routes';
import { logout, preferredOrganization, rememberOrganization } from './lib/auth';
import { selectOrganization, canManageOrganization } from './lib/access';
import { useOrganizationSession } from './hooks/useOrganizationSession';
import { clearCache } from './lib/apiCache';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import OnboardingWizard from './components/OnboardingWizard';
import { isOnboardingComplete, resetOnboarding } from './lib/onboarding';
import { isWizardComplete, markWizardComplete, resetWizard } from './lib/onboardingWizard';
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
const PoliciesTab = lazy(() => import('./tabs/PoliciesTab'));

function TabSpinner() {
  return <div role="status" className="text-center text-stone py-24">Loading your workspace…</div>;
}

const MANAGEMENT_TABS: TabKey[] = ['settings', 'integrations', 'policies'];

function App() {
  const account = useOrganizationSession();
  const location = useLocation();
  const navigateUrl = useNavigate();
  const [preferredId, setPreferredId] = useState<number | null>(preferredOrganization);
  const route = resolveWorkspaceRoute(location.pathname, account.access);
  const session = route.kind === 'workspace' ? route.organization : route.kind === 'entry' ? selectOrganization(account.access, preferredId) : null;
  const activeTab = route.kind === 'workspace' ? route.tab : 'overview';
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [animalsSearch, setAnimalsSearch] = useState({ query: '', nonce: 0 });
  const [settingsInitialSection, setSettingsInitialSection] = useState('');
  const [logoutError, setLogoutError] = useState('');

  const orgId = session?.orgId;
  const role = session?.role;
  useEffect(() => {
    setAnimalsSearch({ query: '', nonce: 0 });
    setSettingsInitialSection('');
    setShowWizard(Boolean(orgId && role && canManageOrganization(role) && !isWizardComplete(orgId)));
    setShowOnboarding(Boolean(orgId && role !== 'viewer' && isWizardComplete(orgId) && !isOnboardingComplete()));
  }, [orgId, role, account.user?.id]);

  const navigate = (tab: TabKey) => {
    if (!session || (MANAGEMENT_TABS.includes(tab) && !canManageOrganization(session.role))) return;
    navigateUrl(workspacePath(session, tab));
  };
  const handleNavigateToPayments = () => {
    setSettingsInitialSection('payments');
    navigate('settings');
  };
  const handleWizardComplete = () => {
    if (session) markWizardComplete(session.orgId);
    setShowWizard(false);
    if (!isOnboardingComplete()) setShowOnboarding(true);
  };
  const handleLogout = async () => {
    setLogoutError('');
    try { await logout(); } catch { setLogoutError('Sign out failed. Please retry.'); }
  };
  const handleRestartTour = () => {
    resetOnboarding();
    navigate('overview');
    setShowOnboarding(true);
  };
  const handleRestartWizard = () => {
    if (!session || !canManageOrganization(session.role)) return;
    resetWizard(session.orgId);
    navigate('overview');
    setShowOnboarding(false);
    setShowWizard(true);
  };
  const handleOrgSwitch = (nextId: number) => {
    // A remembered preference never grants access: it must match a current membership.
    const next = account.access.find((org) => org.orgId === nextId);
    if (!next) return;
    clearCache();
    rememberOrganization(nextId);
    setPreferredId(nextId);
    navigateUrl(workspacePath(next, 'overview'));
  };

  if (account.loading) return <TabSpinner />;
  if (!account.user && !account.error) return <LoginScreen />;
  if (!account.error && account.access.length > 0 && (route.kind === 'missing' || route.kind === 'denied')) return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-2xl border border-silver-gray p-8 space-y-4">
        <h1 className="font-serif text-2xl text-deep-taupe">{route.kind === 'missing' ? 'Page not found' : 'Workspace unavailable'}</h1>
        <p className="text-sm text-stone">{route.kind === 'missing' ? 'This dashboard page does not exist.' : 'This workspace does not exist or you do not have access.'}</p>
        <button onClick={() => navigateUrl('/')} className="bg-warm-brown text-white px-4 py-2 rounded-lg">Open my workspace</button>
      </div>
    </div>
  );
  if (account.error || !session) return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-2xl border border-silver-gray p-8 space-y-4">
        <h1 className="font-serif text-2xl text-deep-taupe">{account.error ? 'Unable to load your workspace' : 'Organization access needed'}</h1>
        <p role={account.error ? 'alert' : 'status'} className="text-sm text-stone">{account.error || 'Your account is signed in, but has no active organization membership. Ask your administrator to add you.'}</p>
        <button onClick={account.retry} className="bg-warm-brown text-white px-4 py-2 rounded-lg">Retry</button>
        <button onClick={() => void handleLogout()} className="text-warm-brown ml-4">Sign out</button>
        {logoutError && <p role="alert" className="text-sm text-red-600">{logoutError}</p>}
      </div>
    </div>
  );

  if (route.kind === 'entry' || location.pathname !== workspacePath(session, activeTab)) {
    return <Navigate to={workspacePath(session, activeTab)} replace />;
  }
  if (MANAGEMENT_TABS.includes(activeTab) && !canManageOrganization(session.role)) {
    return <Navigate to={workspacePath(session, 'overview')} replace />;
  }

  const tabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview orgId={session.orgId} onTabChange={navigate} />;
      case 'animals':
        return (
          <AnimalsTab
            orgId={session.orgId}
            canEdit={session.role !== 'viewer'}
            initialSearch={animalsSearch.query}
            searchNonce={animalsSearch.nonce}
          />
        );
      case 'applications':
        return <ApplicationsTab orgId={session.orgId} canEdit={session.role !== 'viewer'} />;
      case 'website-content':
        return <WebsiteContentTab orgId={session.orgId} canEdit={canManageOrganization(session.role)} />;
      case 'settings':
        return <SettingsTab orgId={session.orgId} orgConfig={session.orgConfig} initialSection={settingsInitialSection} />;
      case 'communications':
        return <CommunicationsTab orgId={session.orgId} canEdit={session.role !== 'viewer'} />;
      case 'policies':
        return <PoliciesTab orgId={session.orgId} />;
      case 'social-media':
        return <SocialMediaTab orgId={session.orgId} orgConfig={session.orgConfig} />;
      case 'events':
        return <EventsTab orgId={session.orgId} />;
      case 'donations':
        return <DonationsTab orgId={session.orgId} onNavigateToSettings={handleNavigateToPayments} />;
      case 'integrations':
        return <IntegrationsTab orgId={session.orgId} />;
      default:
        return <DashboardOverview orgId={session.orgId} onTabChange={navigate} />;
    }
  };

  return (
    <>
      <Layout
        key={`${account.user?.id}:${session.orgId}:${session.role}`}
        activeTab={activeTab}
        onTabChange={navigate}
        orgId={session.orgId}
        orgConfig={session.orgConfig}
        organizationAccess={account.access}
        role={session.role}
        onLogout={() => void handleLogout()}
        onOrgSwitch={handleOrgSwitch}
        onRestartTour={handleRestartTour}
        onRestartWizard={canManageOrganization(session.role) ? handleRestartWizard : undefined}
        onSearch={(query) => setAnimalsSearch((prev) => ({ query, nonce: prev.nonce + 1 }))}
      >
        {logoutError && <p role="alert" className="text-sm text-red-600 mb-4">{logoutError}</p>}
        {session.role === 'viewer' && <p className="text-sm text-stone mb-4">You have view-only access to this organization.</p>}
        <Suspense fallback={<TabSpinner />}>{tabContent()}</Suspense>
      </Layout>
      {showWizard && canManageOrganization(session.role) && <OnboardingWizard orgId={session.orgId} orgConfig={session.orgConfig} onComplete={handleWizardComplete} onNavigateTab={navigate} />}
      {showOnboarding && !showWizard && <Onboarding onComplete={() => setShowOnboarding(false)} onNavigateTab={navigate} />}
    </>
  );
}
export default App;
