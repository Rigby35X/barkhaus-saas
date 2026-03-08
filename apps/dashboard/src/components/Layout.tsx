import { useState, type ReactNode } from 'react';
import Sidebar, { type TabKey } from './Sidebar';
import type { OrgConfig } from '../lib/api';
import { ORGANIZATIONS } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  orgId?: number;
  orgConfig?: OrgConfig;
  onLogout?: () => void;
  onOrgSwitch?: (orgId: number) => void;
}

export default function Layout({ children, activeTab = 'overview', onTabChange, orgId = 0, orgConfig, onLogout, onOrgSwitch }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const config = orgConfig ?? ORGANIZATIONS[orgId] ?? {
    name: 'Dashboard',
    accessCode: '',
    logo: '',
    colors: { primary: '#804e3f', secondary: '#6b7280' },
    contact: { email: '', phone: '', address: '' },
    social: { facebook: '', instagram: '', twitter: '' },
  };

  const tabLabels: Record<TabKey, string> = {
    overview: 'Dashboard',
    animals: 'Animals',
    applications: 'Applications',
    events: 'Events',
    donations: 'Donations',
    communications: 'Communications',
    'website-content': 'Website Content',
    'social-media': 'Social Media',
    integrations: 'Integrations',
    settings: 'Settings',
  };

  return (
    <div className="min-h-screen bg-cloud">
      {/* Header */}
      <header className="bg-white border-b border-silver-gray sticky top-0 z-50" style={{ height: '4rem' }}>
        <div className="px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen((o) => !o)}
                className="lg:hidden p-2 rounded-lg text-deep-taupe hover:bg-cloud mr-3"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>
              <h1 className="text-xl font-serif font-semibold text-deep-taupe">
                {tabLabels[activeTab]}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-sm text-deep-taupe hidden md:inline">{config.name}</span>
              <span className="text-xs text-stone hidden md:inline">
                Org: <span className="font-semibold">{orgId || '—'}</span>
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-sm font-medium px-3 py-2 rounded-lg border border-stone text-deep-taupe hover:bg-cloud transition"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
        {onTabChange && (
          <Sidebar
            activeTab={activeTab}
            onTabChange={onTabChange}
            orgConfig={config}
            orgId={orgId}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOrgSwitch={onOrgSwitch}
          />
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
