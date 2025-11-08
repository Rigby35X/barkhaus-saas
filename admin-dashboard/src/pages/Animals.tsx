import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useTenant } from '../hooks/useTenant';
import { fetchAnimalsByOrg } from '../lib/xano';

export default function Animals() {
  const { orgId, loading: tenantLoading } = useTenant();

  const { data: animals, isLoading } = useQuery({
    queryKey: ['animals', orgId],
    queryFn: () => fetchAnimalsByOrg(orgId),
    enabled: !!orgId,
  });

  if (tenantLoading || isLoading) {
    return <Layout><div>Loading animals...</div></Layout>;
  }

  return (
    <Layout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-deep-taupe">Animals</h1>
          <button className="bg-warm-brown text-white px-6 py-2 rounded hover:bg-opacity-90 transition">
            + Add Animal
          </button>
        </div>

        <div className="bg-white rounded-lg shadow">
          {animals && animals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Breed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {animals.map((animal: any) => (
                    <tr key={animal.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {animal.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.breed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.age}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{animal.gender}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {animal.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-warm-brown hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-4">🐕</p>
              <p>No animals yet. Add your first animal to get started!</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
