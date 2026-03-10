import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useTenant } from '../hooks/useTenant';
import { getAnimals } from '../lib/api';

export default function Dashboard() {
  const { tenantSlug } = useParams();
  const navigate = useNavigate();
  const { orgId, loading: tenantLoading } = useTenant();
  const { data: animalsData } = useQuery({
    queryKey: ['animals', orgId],
    queryFn: () => getAnimals(orgId).catch(() => []),
    enabled: !!orgId,
  });

  const animals: any[] = (animalsData as any[]) || [];

  const totalAnimals = animals.length;
  const available = animals.filter(
    (a: any) => (a.Code || a.status || '').toLowerCase() === 'available'
  ).length;
  const pending = animals.filter((a: any) => {
    const s = (a.Code || a.status || '').toLowerCase();
    return s.includes('pending') || s === '1.lm' || s === 'lm' || s === 'call later';
  }).length;
  const adopted = animals.filter((a: any) =>
    (a.Code || a.status || '').toLowerCase().includes('adopted')
  ).length;

  const recentAnimals = animals.slice(0, 5);

  if (tenantLoading) {
    return (
      <Layout>
        <div className="text-center py-12 text-deep-taupe">Loading...</div>
      </Layout>
    );
  }

  const statCards = [
    {
      label: 'Total Animals',
      value: totalAnimals,
      iconColor: 'text-green-600',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
        </svg>
      ),
    },
    {
      label: 'Available',
      value: available,
      iconColor: 'text-blue-600',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: pending,
      iconColor: 'text-yellow-600',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      label: 'Adopted',
      value: adopted,
      iconColor: 'text-purple-600',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ),
    },
  ];

  return (
    <Layout>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map(card => (
          <div
            key={card.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-silver-gray"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              </div>
              <div className={card.iconColor}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Animals */}
      <div className="bg-white rounded-lg shadow-sm border border-silver-gray mb-6">
        <div className="px-6 py-4 border-b border-silver-gray">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-serif font-semibold text-deep-taupe">Recent Animals</h2>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/${tenantSlug}/animals`)}
                className="text-sm px-4 py-2 rounded-xl font-semibold text-white bg-warm-brown hover:opacity-90 transition"
              >
                Add New Animal
              </button>
              <button
                onClick={() => navigate(`/${tenantSlug}/animals`)}
                className="text-sm px-4 py-2 rounded-xl border border-stone font-medium text-deep-taupe hover:bg-cloud transition"
              >
                View All
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {recentAnimals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-3">🐾</div>
              <p>No animals loaded yet.</p>
            </div>
          ) : (
            recentAnimals.map((animal: any) => {
              const imgUrl = animal.main_image?.url || animal.image_url || null;
              const name = animal.Dog_Name || animal.name || 'Unnamed';
              const breed = animal.Breed || animal.breed || 'Unknown breed';
              const statusRaw = animal.Code || animal.status || 'Unknown';
              const statusLow = statusRaw.toLowerCase();
              const badgeClass = statusLow === 'available'
                ? 'bg-green-100 text-green-800'
                : statusLow.includes('adopted')
                ? 'bg-blue-100 text-blue-800'
                : 'bg-yellow-100 text-yellow-800';

              return (
                <div
                  key={animal.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-cloud transition-colors"
                >
                  {imgUrl ? (
                    <img src={imgUrl} alt={name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-dove flex items-center justify-center text-xl flex-shrink-0">🐾</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-deep-taupe truncate">{name}</p>
                    <p className="text-sm text-gray-500 truncate">{breed}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase flex-shrink-0 ${badgeClass}`}>
                    {statusRaw}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            emoji: '📋',
            title: 'Applications',
            desc: 'Manage adoption applications',
            key: 'applications',
            cta: 'View Applications',
          },
          {
            emoji: '💬',
            title: 'Communications',
            desc: 'View contact & waitlist forms',
            key: 'communications',
            cta: 'View Messages',
          },
          {
            emoji: '✏️',
            title: 'Website Content',
            desc: 'Edit your public-facing pages',
            key: 'content',
            cta: 'Edit Content',
          },
        ].map(action => (
          <div key={action.key} className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-3xl mb-3">{action.emoji}</div>
            <h3 className="font-serif font-semibold text-deep-taupe mb-2">{action.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{action.desc}</p>
            <button
              onClick={() => navigate(`/${tenantSlug}/${action.key}`)}
              className="w-full text-sm font-semibold px-4 py-2 rounded-xl text-white bg-warm-brown hover:opacity-90 transition"
            >
              {action.cta}
            </button>
          </div>
        ))}
      </div>
    </Layout>
  );
}
