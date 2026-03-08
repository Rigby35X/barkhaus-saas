import { useEffect, useState } from 'react';
import { fetchAnimals, fetchAnimalsOrg9, type Animal } from '../lib/api';
import type { TabKey } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';

interface DashboardOverviewProps {
  orgId: number;
  onTabChange: (tab: TabKey) => void;
}

export default function DashboardOverview({ orgId, onTabChange }: DashboardOverviewProps) {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = orgId === 9 ? await fetchAnimalsOrg9() : await fetchAnimals(orgId);
        setAnimals(data);
      } catch {
        setAnimals([]);
      } finally {
        setLoading(false);
      }
    };
    if (orgId) load();
    else setLoading(false);
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

  const recentAnimals = animals.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-6 shadow-sm border border-silver-gray">
            <p className="text-sm font-medium text-gray-500">{s.label}</p>
            <p className={`text-3xl font-bold mt-2 ${s.color}`}>
              {loading ? '—' : s.value}
            </p>
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
          {loading && (
            <p className="text-center py-8 text-stone">Loading animals…</p>
          )}
          {!loading && recentAnimals.length === 0 && (
            <p className="text-center py-8 text-stone">No animals found.</p>
          )}
          {recentAnimals.map((animal) => (
            <div
              key={animal.id}
              className="flex items-center justify-between p-4 border border-silver-gray rounded-xl hover:bg-cloud transition"
            >
              <div className="flex items-center gap-4">
                <img
                  src={animal.image_url ?? 'https://via.placeholder.com/48?text=🐾'}
                  alt={animal.name}
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=🐾'; }}
                />
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
