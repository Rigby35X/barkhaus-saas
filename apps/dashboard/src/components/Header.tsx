import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import type { TabKey } from './Sidebar';

interface HeaderProps {
  orgConfig: any;
  onTabChange: (tab: TabKey) => void;
  onSearch: (query: string) => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export default function Header({ orgConfig, onTabChange, onSearch, onLogout, onToggleSidebar }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      onSearch(searchValue.trim());
      onTabChange('animals');
    }
  };

  const orgName: string = orgConfig?.name ?? 'Org';
  const orgInitial = orgName.charAt(0).toUpperCase();
  const logoUrl: string | undefined = orgConfig?.logo_url || orgConfig?.logo || undefined;
  const subdomain: string = orgConfig?.subdomain ?? 'mbpr';
  const previewUrl = `https://${subdomain}.preview.barkhaus.io`;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 h-16 flex items-center px-4 gap-4">
      {/* Mobile hamburger */}
      <button
        onClick={onToggleSidebar}
        className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            clipRule="evenodd"
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"
          />
        </svg>
      </button>

      {/* Left: org logo / name */}
      <button
        onClick={() => onTabChange('overview')}
        className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition"
        aria-label="Go to overview"
      >
        {logoUrl && !logoError ? (
          <img
            src={logoUrl}
            alt={orgName}
            className="h-8 w-auto object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <span className="font-serif font-bold text-[#804e3f] text-lg leading-none">{orgName}</span>
        )}
      </button>

      {/* Center: search */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search animals..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#804e3f] focus:border-transparent placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right: notification bell, avatar, view website */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Notification bell — stub */}
        <button
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition relative"
          aria-label="Notifications"
          title="Notifications (coming soon)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0 hover:opacity-90 transition"
            style={{ backgroundColor: '#804e3f' }}
            aria-label="Account menu"
          >
            {orgInitial}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              {/* Org info */}
              <div className="px-4 py-3">
                <p className="font-semibold text-sm text-gray-800 truncate">{orgName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Org ID: {orgConfig?.id ?? '—'}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                  Starter
                </span>
              </div>

              <div className="border-t border-gray-100" />

              {/* Settings */}
              <button
                onClick={() => { setDropdownOpen(false); onTabChange('settings'); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>

              {/* Logout */}
              <button
                onClick={() => { setDropdownOpen(false); onLogout(); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>

        {/* View Website button */}
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#804e3f] text-[#804e3f] hover:bg-[#804e3f] hover:text-white transition"
        >
          View Website
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </header>
  );
}
