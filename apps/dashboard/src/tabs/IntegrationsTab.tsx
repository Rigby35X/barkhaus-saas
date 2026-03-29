import { useState } from 'react';

interface IntegrationsTabProps {
  orgId: number;
}

interface Integration {
  name: string;
  description: string;
  status: string;
  color: string;
}

const integrations: Integration[] = [
  { name: 'Mailchimp', description: 'Email marketing for your donor and adopter lists', status: 'Coming Soon', color: 'bg-yellow-500' },
  { name: 'Stripe', description: 'Accept donations and adoption fees online', status: 'Coming Soon', color: 'bg-purple-600' },
  { name: 'Zapier', description: 'Automate workflows between Barkhaus and 5,000+ apps', status: 'Coming Soon', color: 'bg-orange-500' },
  { name: 'Google Analytics', description: 'Track your website visitors and conversions', status: 'Coming Soon', color: 'bg-blue-600' },
  { name: 'PetPoint', description: 'Import animals from your shelter management software', status: 'Coming Soon', color: 'bg-green-600' },
  { name: 'Shelterluv', description: 'Sync animals and applications from Shelterluv', status: 'Coming Soon', color: 'bg-teal-600' },
  { name: 'QuickBooks', description: 'Export donation and fee data to your accounting software', status: 'Coming Soon', color: 'bg-indigo-600' },
  { name: 'Mailjet', description: 'Transactional email for application confirmations', status: 'Coming Soon', color: 'bg-red-500' },
];

export default function IntegrationsTab({ orgId: _orgId }: IntegrationsTabProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm p-8">
        <h2 className="text-2xl font-bold text-deep-taupe mb-2">Connect Your Tools</h2>
        <p className="text-gray-500 mb-8">
          Integrate Barkhaus with your favorite tools to automate your workflow.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${integration.color}`}
              >
                {integration.name.charAt(0)}
              </div>
              <p className="font-semibold text-deep-taupe text-lg mt-3">{integration.name}</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">{integration.description}</p>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                {integration.status}
              </span>
              <div className="relative mt-3">
                <button
                  disabled
                  className="w-full border border-gray-200 text-gray-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
                  onMouseEnter={() => setHoveredBtn(integration.name)}
                  onMouseLeave={() => setHoveredBtn(null)}
                >
                  Connect
                </button>
                {hoveredBtn === integration.name && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-gray-500">
            Don't see your tool?{' '}
            <a
              href="mailto:hello@barkhaus.io?subject=Integration Request"
              className="text-warm-brown hover:underline font-medium"
            >
              Request an integration
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
