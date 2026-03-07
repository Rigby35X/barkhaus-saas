import { Link, useParams, useLocation } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    key: 'dashboard',
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
    key: 'communications',
    label: 'Communications',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: 'content',
    label: 'Website Content',
    icon: (
      <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a1 1 0 011-1h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm2 2v8h8V6H6z" clipRule="evenodd" />
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

export default function Layout({ children }: LayoutProps) {
  const { tenantSlug } = useParams();
  const location = useLocation();
  const { organization, loading } = useTenant();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentSection = pathParts[1] || 'dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <div className="text-center">
          <div className="text-4xl mb-4">🐾</div>
          <p className="text-deep-taupe font-sans">Loading...</p>
        </div>
      </div>
    );
  }

  const sectionLabel = NAV_ITEMS.find(n => n.key === currentSection)?.label || currentSection;

  return (
    <div className="min-h-screen bg-cloud">
      {/* Sticky Header */}
      <header className="bg-white border-b border-silver-gray sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-deep-taupe hover:bg-cloud mr-3"
                aria-label="Open sidebar"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" />
                </svg>
              </button>
              <h1 className="text-xl font-serif font-semibold text-deep-taupe">{sectionLabel}</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {organization && (
                <a
                  href={`https://${(organization as any).subdomain || tenantSlug}.barkhaus.io`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm font-semibold px-3 py-2 rounded-xl text-white bg-warm-brown hover:opacity-90 transition"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Website
                </a>
              )}
              <span className="text-sm text-deep-taupe hidden md:inline">
                Org: <span className="font-semibold">{organization?.id ?? '—'}</span>
              </span>
              <button className="text-sm font-medium px-3 py-2 rounded-lg border border-stone text-deep-taupe hover:bg-cloud transition">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 4rem)' }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 z-40 w-64 h-screen transition-transform lg:translate-x-0 lg:relative lg:top-0 lg:h-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div
            className="h-full px-3 py-4 overflow-y-auto"
            style={{ backgroundColor: '#ffffff', borderRight: '1px solid #d8c8b6' }}
          >
            {/* Logo */}
            <div className="flex items-center justify-center mb-8 px-3 py-2">
              {organization && (organization as any).logo_light_url ? (
                <img
                  src={(organization as any).logo_light_url}
                  alt={organization.org}
                  className="h-auto w-36 object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-xl font-serif font-bold text-deep-taupe">Barkhaus</div>
                  {organization && (
                    <p className="text-xs text-stone mt-1">{organization.org}</p>
                  )}
                </div>
              )}
            </div>

            {/* Nav */}
            <nav className="space-y-1">
              {NAV_ITEMS.map(item => {
                const isActive = currentSection === item.key;
                return (
                  <Link
                    key={item.key}
                    to={`/${tenantSlug}/${item.key}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-warm-brown'
                        : 'text-deep-taupe hover:bg-cloud'
                    }`}
                    style={isActive ? { backgroundColor: '#e2d4c6' } : {}}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
