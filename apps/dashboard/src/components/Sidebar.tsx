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
  | 'social-media'
  | 'integrations'
  | 'settings';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'overview',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
      </svg>
    ),
  },
  {
    key: 'animals',
    label: 'Animals',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
      </svg>
    ),
  },
  {
    key: 'applications',
    label: 'Applications',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'events',
    label: 'Events',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'donations',
    label: 'Donations',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'communications',
    label: 'Communications',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'website-content',
    label: 'Website Content',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'social-media',
    label: 'Social Media',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
];

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  orgConfig: OrgConfig;
  orgId: number;
  isOpen: boolean;
  onClose: () => void;
  onOrgSwitch?: (orgId: number) => void;
}

export default function Sidebar({ activeTab, onTabChange, orgConfig, orgId, isOpen, onClose, onOrgSwitch }: SidebarProps) {
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

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] transition-transform lg:translate-x-0 lg:relative lg:top-0 lg:h-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto" style={{ backgroundColor: '#ffffff', borderRight: '1px solid #d8c8b6' }}>
          {/* Logo area */}
          <div className="flex items-center justify-center px-4 py-6">
            {orgConfig.logo && !orgConfig.logo.endsWith('.svg') ? (
              <img src={orgConfig.logo} alt={orgConfig.name} className="h-12 w-auto object-contain" />
            ) : (
              <div className="text-center">
                <div className="text-lg font-serif font-bold text-deep-taupe">{orgConfig.name}</div>
              </div>
            )}
          </div>

          {/* Org switcher (admin only) */}
          {isAdmin && onOrgSwitch && (
            <div className="px-3 pb-3">
              <div className="relative">
                <button
                  onClick={() => setSwitcherOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold border border-silver-gray rounded-lg bg-cloud hover:bg-dove transition text-deep-taupe"
                >
                  <span>
                    {isAdmin && orgId === 8 ? 'Barkhaus Admin' : (ORGANIZATIONS[orgId]?.name ?? `Org ${orgId}`)}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {switcherOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-silver-gray rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                      {Object.entries(ORGANIZATIONS).map(([id, org]) => {
                        const numId = parseInt(id);
                        return (
                          <button
                            key={id}
                            onClick={() => handleOrgSelect(numId)}
                            className={`w-full text-left px-3 py-2 text-xs transition hover:bg-cloud ${
                              numId === orgId ? 'bg-dove text-warm-brown font-semibold' : 'text-deep-taupe'
                            }`}
                          >
                            <span className="font-mono text-stone mr-2">#{id}</span>
                            {org.name}
                            {org.isAdmin && <span className="ml-1 text-stone">(Admin)</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav className="px-3 pb-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabClick(item.key)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                    isActive ? 'text-warm-brown' : 'text-deep-taupe hover:bg-cloud'
                  }`}
                  style={isActive ? { backgroundColor: '#e2d4c6' } : {}}
                >
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
