import { Link, useParams } from 'react-router-dom';
import { useTenant } from '../hooks/useTenant';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { tenantSlug } = useParams();
  const { organization, loading } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">🐾</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-64 bg-deep-taupe text-white">
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-2">🐾 Barkhaus</h1>
            {organization && (
              <p className="text-sm text-gray-300">{organization.org}</p>
            )}
          </div>

          <nav className="flex-1 mt-6">
            <Link to={`/${tenantSlug}/dashboard`} className="block px-6 py-3 hover:bg-warm-brown transition">
              📊 Dashboard
            </Link>
            <Link to={`/${tenantSlug}/animals`} className="block px-6 py-3 hover:bg-warm-brown transition">
              🐕 Animals
            </Link>
            <Link to={`/${tenantSlug}/content`} className="block px-6 py-3 hover:bg-warm-brown transition">
              ✏️ Content
            </Link>
            <Link to={`/${tenantSlug}/settings`} className="block px-6 py-3 hover:bg-warm-brown transition">
              ⚙️ Settings
            </Link>
          </nav>

          {organization && (
            <div className="p-6 border-t border-gray-700">
              <a
                href={`https://${organization.subdomain}.barkhaus.io`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-warm-brown text-white px-4 py-2 rounded text-center hover:bg-opacity-90 transition"
              >
                🌐 View Live Site
              </a>
            </div>
          )}
        </div>
      </aside>

      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}