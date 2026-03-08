interface IntegrationsTabProps {
  orgId: number;
}

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'available' | 'coming-soon';
  icon: string;
  docsUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'xano',
    name: 'Xano',
    description: 'Backend database and API platform powering the Barkhaus admin and public website.',
    category: 'Database',
    status: 'connected',
    icon: '🔌',
  },
  {
    id: 'paws',
    name: 'PAWS System',
    description: 'Pet management system for Mission Bay Puppy Rescue (Org 9). Syncs animals via Xano API.',
    category: 'Pet Management',
    status: 'connected',
    icon: '🐾',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept online donations and process payments securely.',
    category: 'Payments',
    status: 'available',
    icon: '💳',
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Email marketing campaigns for donors, adopters, and volunteers.',
    category: 'Email',
    status: 'coming-soon',
    icon: '📧',
  },
  {
    id: 'meta',
    name: 'Meta Business',
    description: 'Manage Facebook and Instagram pages and run adoption ads.',
    category: 'Social',
    status: 'coming-soon',
    icon: '📱',
  },
  {
    id: 'petfinder',
    name: 'Petfinder',
    description: 'Auto-publish available animals to Petfinder.com.',
    category: 'Listings',
    status: 'coming-soon',
    icon: '🔍',
  },
  {
    id: 'adoptapet',
    name: 'Adopt-a-Pet',
    description: 'Sync your animals to Adopt-a-Pet.com listings.',
    category: 'Listings',
    status: 'coming-soon',
    icon: '🏠',
  },
  {
    id: 'google',
    name: 'Google Analytics',
    description: 'Track website traffic and adoption funnel metrics.',
    category: 'Analytics',
    status: 'available',
    icon: '📊',
  },
];

const STATUS_CONFIG: Record<Integration['status'], { label: string; color: string }> = {
  connected: { label: 'Connected', color: 'bg-green-100 text-green-800' },
  available: { label: 'Available', color: 'bg-blue-100 text-blue-800' },
  'coming-soon': { label: 'Coming Soon', color: 'bg-gray-100 text-gray-600' },
};

const categories = [...new Set(INTEGRATIONS.map((i) => i.category))];

export default function IntegrationsTab({ orgId: _orgId }: IntegrationsTabProps) {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Integrations</h2>
          <p className="text-sm text-stone mt-1">Connect Barkhaus with the tools your rescue already uses.</p>
        </div>

        <div className="p-6 space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-4">{category}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {INTEGRATIONS.filter((i) => i.category === category).map((integration) => {
                  const status = STATUS_CONFIG[integration.status];
                  return (
                    <div
                      key={integration.id}
                      className={`p-4 rounded-xl border transition ${
                        integration.status === 'connected'
                          ? 'border-green-300 bg-green-50'
                          : integration.status === 'coming-soon'
                          ? 'border-silver-gray bg-cloud opacity-70'
                          : 'border-silver-gray hover:bg-cloud'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{integration.icon}</span>
                          <div>
                            <h4 className="font-semibold text-deep-taupe">{integration.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        {integration.status === 'available' && (
                          <button className="px-3 py-1.5 text-xs font-semibold border border-warm-brown text-warm-brown rounded-lg hover:bg-dove transition flex-shrink-0">
                            Connect
                          </button>
                        )}
                        {integration.status === 'connected' && (
                          <button className="px-3 py-1.5 text-xs border border-silver-gray rounded-lg text-stone hover:bg-cloud transition flex-shrink-0">
                            Configure
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone mt-2">{integration.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
