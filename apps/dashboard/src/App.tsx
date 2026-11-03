import { useState, useEffect, lazy, Suspense } from 'react';
import { getOrganization } from './lib/api';
import SupabaseAccess from './components/SupabaseAccess';
import type { OrganizationAccess } from './lib/organizationAccess';
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

type Session = OrganizationAccess;

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-silver-gray border-t-warm-brown rounded-full animate-spin" />
    </div>
  );
}

function DashboardApp({ authenticatedSession, onSignOut }: { authenticatedSession: Session; onSignOut: () => void }) {
  const [session, setSession] = useState<Session>(authenticatedSession);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [animalsSearch, setAnimalsSearch] = useState({ query: '', nonce: 0 });
  const [settingsInitialSection, setSettingsInitialSection] = useState('');

  const handleNavigateToPayments = () => {
    setSettingsInitialSection('payments');
    setActiveTab('settings');
  };

  // Shows the 5-step setup wizard on first login; falls back to the guided tour
  // once the wizard is already complete for this org.
  const maybeStartOnboarding = (orgId: number) => {
    if (!isWizardComplete(orgId)) {
      setShowWizard(true);
    } else if (!isOnboardingComplete()) {
      setShowOnboarding(true);
    }
  };

  // Merge live Supabase organizations row over the static ORGANIZATIONS defaults —
  // covers login, session restore, and org switch, since all of them change orgId.
  useEffect(() => {
    if (!session) return;
    const orgId = session.orgId;
    let cancelled = false;
    getOrganization(orgId).then((data) => {
      if (cancelled || !data) return;
      setSession((prev) => {
        if (!prev || prev.orgId !== orgId) return prev;
        return {
          ...prev,
          orgConfig: {
            ...prev.orgConfig,
            name: (data.org as string) ?? prev.orgConfig.name,
            logo: (data.logo_dark_url as string) ?? prev.orgConfig.logo,
            colors: {
              primary: (data.primary_color as string) ?? prev.orgConfig.colors.primary,
              secondary: (data.secondary_color as string) ?? prev.orgConfig.colors.secondary,
            },
            contact: {
              email: (data.contact_email as string) ?? prev.orgConfig.contact.email,
              phone: (data.phone as string) ?? prev.orgConfig.contact.phone,
              address: (data.address as string) ?? prev.orgConfig.contact.address,
            },
            social: {
              facebook: (data.facebook_url as string) ?? prev.orgConfig.social.facebook,
              instagram: (data.instagram_url as string) ?? prev.orgConfig.social.instagram,
              twitter: (data.twitter_url as string) ?? prev.orgConfig.social.twitter,
            },
            subdomain: (data.subdomain as string) ?? prev.orgConfig.subdomain,
          },
        };
      });
    }).catch(() => {
      // Live org fetch is a best-effort enhancement — keep the static defaults on failure.
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.orgId]);

  useEffect(() => {
    maybeStartOnboarding(authenticatedSession.orgId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedSession.orgId]);

  const handleWizardComplete = () => {
    if (session) markWizardComplete(session.orgId);
    setShowWizard(false);
    if (!isOnboardingComplete()) setShowOnboarding(true);
  };

  const handleLogout = () => {
    onSignOut();
    setShowOnboarding(false);
  };

  const handleRestartTour = () => {
    resetOnboarding();
    setActiveTab('overview');
    setShowOnboarding(true);
  };

  const handleRestartWizard = () => {
    if (!session) return;
    resetWizard(session.orgId);
    setActiveTab('overview');
    setShowOnboarding(false);
    setShowWizard(true);
  };

  const handleSearch = (query: string) => {
    setAnimalsSearch((prev) => ({ query, nonce: prev.nonce + 1 }));
  };

  const tabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview orgId={session.orgId} onTabChange={setActiveTab} />;
      case 'animals':
        return (
          <AnimalsTab
            orgId={session.orgId}
            initialSearch={animalsSearch.query}
            searchNonce={animalsSearch.nonce}
          />
        );
      case 'applications':
        return <ApplicationsTab orgId={session.orgId} />;
      case 'website-content':
        return <WebsiteContentTab orgId={session.orgId} />;
      case 'settings':
        return <SettingsTab orgId={session.orgId} orgConfig={session.orgConfig} initialSection={settingsInitialSection} />;
      case 'communications':
        return <CommunicationsTab orgId={session.orgId} />;
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
        onRestartTour={handleRestartTour}
        onRestartWizard={handleRestartWizard}
        onSearch={handleSearch}
      >
        <Suspense fallback={<TabSpinner />}>
          {tabContent()}
        </Suspense>
      </Layout>

      {showWizard && (
        <OnboardingWizard
          orgId={session.orgId}
          orgConfig={session.orgConfig}
          onComplete={handleWizardComplete}
          onNavigateTab={setActiveTab}
        />
      )}

      {showOnboarding && !showWizard && (
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          onNavigateTab={setActiveTab}
        />
      )}
    </>
  );
}

export default function App() {
  return <SupabaseAccess>{(access, signOut) =>
    <DashboardApp key={access.orgId} authenticatedSession={access} onSignOut={signOut} />
  }</SupabaseAccess>;
}
