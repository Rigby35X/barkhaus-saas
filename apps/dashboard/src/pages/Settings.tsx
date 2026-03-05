import Layout from '../components/Layout';
import { useTenant } from '../hooks/useTenant';

export default function Settings() {
  const { organization } = useTenant();

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-deep-taupe mb-6">Settings</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-deep-taupe">Branding</h2>
          {organization && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: organization.primary_color }}
                  ></div>
                  <span className="text-gray-600">{organization.primary_color}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded border-2 border-gray-300"
                    style={{ backgroundColor: organization.secondary_color }}
                  ></div>
                  <span className="text-gray-600">{organization.secondary_color}</span>
                </div>
              </div>

              <div className="pt-4">
                <button className="bg-warm-brown text-white px-6 py-2 rounded hover:bg-opacity-90 transition">
                  Update Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
