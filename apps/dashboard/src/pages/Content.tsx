import Layout from '../components/Layout';

export default function Content() {
  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-deep-taupe mb-6">Website Content</h1>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Content editor coming soon! This will allow you to edit:</p>
          <ul className="mt-4 space-y-2 text-gray-700">
            <li>• Hero section</li>
            <li>• About page</li>
            <li>• Services</li>
            <li>• Footer content</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
