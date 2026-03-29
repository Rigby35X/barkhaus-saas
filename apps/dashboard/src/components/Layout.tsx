import { useState, type ReactNode } from 'react';
import Sidebar, { type TabKey } from './Sidebar';
import Header from './Header';
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
  onRestartTour?: () => void;
}

export default function Layout({
  children,
  activeTab = 'overview',
  onTabChange,
  orgId = 0,
  orgConfig,
  onLogout,
  onOrgSwitch,
  onRestartTour,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [_searchQuery, setSearchQuery] = useState('');

  const config = orgConfig ?? ORGANIZATIONS[orgId] ?? {
    name: 'Dashboard',
    accessCode: '',
    logo: '',
    colors: { primary: '#804e3f', secondary: '#6b7280' },
    contact: { email: '', phone: '', address: '' },
    social: { facebook: '', instagram: '', twitter: '' },
  };

  const handleTabChange = (tab: TabKey) => {
    if (onTabChange) onTabChange(tab);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky header */}
      <Header
        orgConfig={config}
        onTabChange={handleTabChange}
        onSearch={(q) => {
          setSearchQuery(q);
          handleTabChange('animals');
        }}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {onTabChange && (
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            orgConfig={config}
            orgId={orgId}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onOrgSwitch={onOrgSwitch}
            onRestartTour={onRestartTour}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-100 bg-gray-50 px-6 py-3 flex justify-between items-center flex-shrink-0">
            <span className="text-xs text-gray-400">© 2026 Barkhaus</span>
            <div className="flex gap-4 text-xs text-gray-400">
              <a href="mailto:help@barkhaus.io" className="hover:text-gray-600">Help</a>
              <a href="https://barkhaus.io" target="_blank" rel="noopener" className="hover:text-gray-600">barkhaus.io</a>
              <a href="#" className="hover:text-gray-600">Privacy</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
