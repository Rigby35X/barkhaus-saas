import { useState } from 'react';
import type { OrgConfig } from '../lib/api';
import { ORGANIZATIONS } from '../lib/api';

export type TabKey =
  | 'overview'
  | 'animals'
  | 'applications'
  | 'events'
  | 'donations'
  | 'communications'
  | 'website-content'
  | 'policies'
  | 'social-media'
  | 'integrations'
  | 'settings';

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function DashboardIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  );
}

function AnimalsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
    </svg>
  );
}

function ApplicationsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
    </svg>
  );
}

function CommsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
  );
}

function DonationsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
    </svg>
  );
}

function IntegrationsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      { key: 'overview', label: 'Dashboard', icon: <DashboardIcon /> },
    ],
  },
  {
    label: 'ANIMALS',
    items: [
      { key: 'animals', label: 'Animals', icon: <AnimalsIcon /> },
      { key: 'applications', label: 'Applications', icon: <ApplicationsIcon /> },
    ],
  },
  {
    label: 'WEBSITE',
    items: [
      { key: 'website-content', label: 'Website Content', icon: <WebsiteIcon /> },
      { key: 'social-media', label: 'Social Media', icon: <SocialIcon /> },
    ],
  },
  {
    label: 'COMMS',
    items: [
      { key: 'communications', label: 'Communications', icon: <CommsIcon /> },
      { key: 'events', label: 'Events', icon: <EventsIcon /> },
      { key: 'donations', label: 'Donations', icon: <DonationsIcon /> },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { key: 'integrations', label: 'Integrations', icon: <IntegrationsIcon /> },
      { key: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  orgConfig: OrgConfig;
  orgId: number;
  isOpen: boolean;
  onClose: () => void;
  onOrgSwitch?: (orgId: number) => void;
  onRestartTour?: () => void;
  onLogout?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar({
  activeTab,
  onTabChange,
  orgConfig,
  orgId,
  isOpen,
  onClose,
  onOrgSwitch,
  onRestartTour,
  onLogout,
}: SidebarProps) {
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleTabClick = (key: TabKey) => {
    onTabChange(key);
    onClose();
  };

  const handleOrgSelect = (newOrgId: number) => {
    if (newOrgId !== orgId && onOrgSwitch) {
      onOrgSwitch(newOrgId);
    }
    setSwitcherOpen(false);
  };

  const isAdmin = orgConfig.isAdmin === true;
  const orgName = orgConfig.name ?? 'Org';
  const orgInitial = orgName.charAt(0).toUpperCase();
  const contactEmail: string = orgConfig.contact?.email ?? '';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col transition-transform md:static md:translate-x-0 md:flex md:w-60 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ backgroundColor: '#ffffff', borderRight: '1px solid #e5e7eb' }}
      >
        {/* Top: org logo + name */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-100" data-tour="sidebar-header">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0"
            style={{ backgroundColor: '#e2d4c6', color: '#804e3f' }}
          >
            {orgInitial}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-gray-800 truncate leading-tight">{orgName}</p>
            <p className="text-xs text-gray-400 truncate">Org #{orgId}</p>
          </div>
        </div>

        {/* Org switcher (admin only) */}
        {isAdmin && onOrgSwitch && (
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <button
                onClick={() => setSwitcherOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-gray-700"
              >
                <span>{isAdmin && orgId === 8 ? 'Barkhaus Admin' : (ORGANIZATIONS[orgId]?.name ?? `Org ${orgId}`)}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${switcherOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {switcherOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="py-1">
                    {Object.entries(ORGANIZATIONS).map(([id, org]) => {
                      const numId = parseInt(id);
                      return (
                        <button
                          key={id}
                          onClick={() => handleOrgSelect(numId)}
                          className={`w-full text-left px-3 py-2 text-xs transition hover:bg-gray-50 ${
                            numId === orgId ? 'bg-[#f5ede8] text-[#804e3f] font-semibold' : 'text-gray-700'
                          }`}
                        >
                          <span className="font-mono text-gray-400 mr-2">#{id}</span>
                          {org.name}
                          {org.isAdmin && <span className="ml-1 text-gray-400">(Admin)</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Grouped nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase text-gray-400 px-3 mt-4 mb-1 tracking-wider">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleTabClick(item.key)}
                    data-tour={`tab-${item.key}`}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left mb-0.5 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-600 hover:bg-[#f5ede8] hover:text-[#804e3f]'
                    }`}
                    style={isActive ? { backgroundColor: '#804e3f' } : {}}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-100 px-3 py-3 space-y-1">
          {/* Tour Guide */}
          {onRestartTour && (
            <button
              onClick={onRestartTour}
              data-tour="tour-guide-btn"
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-[#804e3f] hover:bg-[#f5ede8] rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tour Guide
            </button>
          )}

          {/* User email */}
          {contactEmail && (
            <p className="px-3 text-xs text-gray-400 truncate">{contactEmail}</p>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
