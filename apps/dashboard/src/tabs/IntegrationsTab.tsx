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
  { name: 'Mailchimp', description: 'Sync adopters and donors to your email lists automatically', status: 'Coming Soon', color: '#FFE01B' },
  { name: 'Klaviyo', description: 'Advanced email marketing and automation for rescues', status: 'Coming Soon', color: '#4CAF50' },
  { name: 'Stripe', description: 'Accept adoption fees and donations online', status: 'Coming Soon', color: '#635BFF' },
  { name: 'Petfinder', description: 'Automatically sync available animals to Petfinder', status: 'Coming Soon', color: '#F68B1F' },
  { name: 'Zapier', description: 'Connect Barkhaus to 5000+ apps without code', status: 'Coming Soon', color: '#FF4A00' },
  { name: 'Google Analytics', description: 'Track your website visitors and conversions', status: 'Coming Soon', color: '#4285F4' },
  { name: 'QuickBooks', description: 'Export donation and fee data to your accounting software', status: 'Coming Soon', color: '#2CA01C' },
  { name: 'Shelterluv', description: 'Import animals and applications from Shelterluv', status: 'Coming Soon', color: '#1a73e8' },
  { name: 'PetPoint', description: 'Sync your shelter data from PetPoint', status: 'Coming Soon', color: '#00897B' },
  { name: 'Mailjet', description: 'Transactional email for application confirmations', status: 'Coming Soon', color: '#9C27B0' },
];

export default function IntegrationsTab({ orgId: _orgId }: IntegrationsTabProps) {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm p-8">
        <h2 className="text-2xl font-bold text-deep-taupe mb-2">Connect Your Tools</h2>
        <p className="text-gray-500 mb-8">
          Extend Barkhaus with your favorite apps and services.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: integration.color }}
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
            Do not see what you need?{' '}
            <a
              href="mailto:hello@barkhaus.io?subject=Integration Request"
              className="text-warm-brown hover:underline font-medium"
            >
              Request an integration →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
