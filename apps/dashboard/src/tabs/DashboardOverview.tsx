import { useEffect, useState } from 'react';

import { getAnimals, getApplications, type Animal, type Application } from '../lib/api';
import type { TabKey } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';

interface DashboardOverviewProps {
  orgId: number;
  onTabChange: (tab: TabKey) => void;
}

export default function DashboardOverview({ orgId, onTabChange }: DashboardOverviewProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [applicationsError, setApplicationsError] = useState(false);

  const loadAnimals = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const data = await getAnimals(orgId);
      setAnimals(data);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setApplicationsLoading(true);
    setApplicationsError(false);
    try {
      setApplications(await getApplications(orgId));
    } catch {
      setApplications([]);
      setApplicationsError(true);
    } finally {
      setApplicationsLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      void loadAnimals();
      void loadApplications();
    } else {
      setLoading(false);
      setApplicationsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const total = animals.length;
  const available = animals.filter((a) => {
    const s = (a.status || a.Code || '').toLowerCase();
    return s === 'available';
  }).length;
  const pending = animals.filter((a) => {
    const s = (a.status || a.Code || '').toLowerCase();
    return s.includes('pending') || s === 'lm' || s === '1.lm' || s === 'call later';
  }).length;
  const adopted = animals.filter((a) =>
    (a.status || a.Code || '').toLowerCase().includes('adopted')
  ).length;

  const stats = [
    { label: 'Total Animals', value: total, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Available', value: available, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending', value: pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Adopted', value: adopted, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Sort by id descending (highest id = most recent), take first 6
  const recentAnimals = [...animals].sort((a, b) => b.id - a.id).slice(0, 6);
  const newApplications = applications.filter((app) => !app.status || app.status.toLowerCase() === 'new');
  const recentApplications = applications.slice(0, 5);

  const formatDate = (date?: string) => {
    if (!date) return 'Date unavailable';
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-warm-brown">Rescue workspace</p>
          <h1 className="text-3xl font-serif font-semibold text-deep-taupe mt-1">Your dashboard</h1>
          <p className="text-sm text-stone mt-2">Keep animal records and incoming applications moving.</p>
        </div>
        <button onClick={() => onTabChange('animals')} className="px-5 py-2.5 rounded-xl bg-warm-brown text-white text-sm font-semibold hover:opacity-90 transition">Manage animals</button>
      </div>
      <section aria-label="Application queue" className="bg-white rounded-2xl shadow-sm border border-silver-gray overflow-hidden">
        <div className="px-6 py-5 border-b border-silver-gray flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-serif font-semibold text-deep-taupe">Applications to review</h2>
            <p className="text-sm text-stone mt-1">New submissions for this organization</p>
          </div>
          <button onClick={() => onTabChange('applications')} className="text-sm font-semibold text-warm-brown hover:underline">View applications →</button>
        </div>
        <div className="p-6">
          {applicationsLoading ? <p role="status" className="text-sm text-stone">Loading applications…</p> : applicationsError ? (
            <div className="flex items-center justify-between gap-4"><p role="alert" className="text-sm text-stone">Applications could not be loaded.</p><button onClick={() => void loadApplications()} className="text-sm font-semibold text-warm-brown underline">Retry</button></div>
          ) : (
            <>
              <p className="text-sm text-stone mb-4"><strong className="text-2xl text-deep-taupe mr-2">{newApplications.length}</strong> new {newApplications.length === 1 ? 'application' : 'applications'} · {applications.length} total</p>
              {recentApplications.length === 0 ? <p className="text-sm text-stone py-3">No applications have arrived yet.</p> : (
                <div className="divide-y divide-silver-gray">
                  {recentApplications.map((app) => (
                    <div key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div><span className="font-semibold text-deep-taupe">{[app.first_name, app.last_name].filter(Boolean).join(' ') || 'Applicant'}</span><span className="text-stone ml-2 capitalize">{app.form_type || 'Application'}</span></div>
                      <div className="flex items-center gap-3"><span className="text-stone">{formatDate(app.created_at)}</span><span className="px-2 py-1 rounded-full bg-cloud text-deep-taupe capitalize">{(app.status || 'new').replace(/_/g, ' ')}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="stat-cards">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-silver-gray">
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            {loading ? (
              <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-2" />
            ) : fetchError ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-bold text-gray-400">—</span>
                <button
                  onClick={() => void loadAnimals()}
                  className="text-xs text-warm-brown underline hover:no-underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <p className={`text-3xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent Animals */}
      <div className="bg-white rounded-2xl shadow-sm border border-silver-gray">
        <div className="px-6 py-4 border-b border-silver-gray flex justify-between items-center">
          <h2 className="text-xl font-serif font-semibold text-deep-taupe">Recent Animals</h2>
          <div className="flex gap-2">
            <button
              onClick={() => onTabChange('animals')}
              className="px-4 py-2 text-sm font-medium border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
            >
              Add Animal
            </button>
            <button
              onClick={() => onTabChange('animals')}
              className="px-4 py-2 text-sm font-medium border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
            >
              View All
            </button>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-silver-gray rounded-xl animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="w-16 h-5 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && fetchError && (
            <div className="text-center py-8">
              <p className="text-stone mb-3">Failed to load animals.</p>
              <button
                onClick={() => void loadAnimals()}
                className="px-4 py-2 text-sm font-medium bg-warm-brown text-white rounded-lg hover:opacity-90 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !fetchError && recentAnimals.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🐾</p>
              <p className="font-serif font-semibold text-deep-taupe">No animals yet</p>
              <p className="text-sm text-stone mt-1 mb-4">Add your first animal to get started.</p>
              <button
                onClick={() => onTabChange('animals')}
                className="px-4 py-2 text-sm font-medium bg-warm-brown text-white rounded-lg hover:opacity-90 transition"
              >
                Add your first animal
              </button>
            </div>
          )}

          {/* Animal rows */}
          {!loading && !fetchError && recentAnimals.map((animal) => (
            <div
              key={animal.id}
              className="flex items-center justify-between p-4 border border-silver-gray rounded-xl hover:bg-cloud transition"
            >
              <div className="flex items-center gap-4">
                {animal.photo_url || animal.image_url ? (
                  <img
                    src={(animal.photo_url || animal.image_url) as string}
                    alt={animal.name}
                    className="w-[50px] h-[50px] rounded-lg object-cover flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-[50px] h-[50px] rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl';
                        placeholder.textContent = '🐶';
                        parent.insertBefore(placeholder, target);
                      }
                    }}
                  />
                ) : (
                  <div className="w-[50px] h-[50px] rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-xl">
                    🐶
                  </div>
                )}
                <div>
                  <p className="font-semibold text-deep-taupe">{animal.name}</p>
                  <p className="text-sm text-stone">
                    {animal.species ?? 'Dog'} · {animal.breed ?? 'Mixed'}
                  </p>
                </div>
              </div>
              <StatusBadge status={animal.status || animal.Code || 'Unknown'} />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { emoji: '📋', label: 'Applications', desc: 'Manage adoption applications', tab: 'applications' as TabKey },
          { emoji: '📅', label: 'Events', desc: 'Plan adoption events', tab: 'events' as TabKey },
          { emoji: '💝', label: 'Donations', desc: 'Track donations', tab: 'donations' as TabKey },
        ].map((action) => (
          <div key={action.tab} className="bg-white rounded-2xl shadow-sm border border-silver-gray p-6 text-center">
            <div className="text-3xl mb-3">{action.emoji}</div>
            <h3 className="font-semibold text-deep-taupe mb-2">{action.label}</h3>
            <p className="text-sm text-stone mb-4">{action.desc}</p>
            <button
              onClick={() => onTabChange(action.tab)}
              className="w-full py-2 px-4 bg-warm-brown text-white text-sm font-semibold rounded-xl hover:opacity-90 transition"
            >
              {action.label}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
