import { useState } from 'react';

interface PawsAnimalListProps {
  animals: any[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onSendEmail: (id: number, templateName: string) => void;
}

export default function PawsAnimalList({
  animals,
  onEdit,
  onDelete,
  onSendEmail,
}: PawsAnimalListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!animals || animals.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <p className="text-4xl mb-4">🐕</p>
        <p>No puppies yet. Add your first puppy to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dog Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Breed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Age (weeks)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {animals.map((animal) => (
              <tr key={animal.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {animal.mbpr_internal_id || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {animal.dog_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {[animal.breed_primary, animal.breed_secondary, animal.breed_mix]
                    .filter(Boolean)
                    .join(' / ') || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {animal.gender || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      animal.status === 'Adopted'
                        ? 'bg-green-100 text-green-800'
                        : animal.status === 'Available'
                        ? 'bg-blue-100 text-blue-800'
                        : animal.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {animal.status || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {animal.birthday
                    ? Math.floor(
                        (new Date().getTime() - new Date(animal.birthday).getTime()) /
                          (1000 * 60 * 60 * 24 * 7)
                      )
                    : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => onEdit(animal.id)}
                      className="text-warm-brown hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === animal.id ? null : animal.id)}
                      className="text-blue-600 hover:underline"
                    >
                      {expandedId === animal.id ? 'Hide' : 'Actions'}
                    </button>
                    <button
                      onClick={() => onDelete(animal.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>

                  {expandedId === animal.id && (
                    <div className="mt-2 space-y-1">
                      <button
                        onClick={() => onSendEmail(animal.id, 'submit')}
                        className="block w-full text-left px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded"
                      >
                        Send Submit Email
                      </button>
                      <button
                        onClick={() => onSendEmail(animal.id, 'update')}
                        className="block w-full text-left px-3 py-1 text-xs bg-gray-50 hover:bg-gray-100 rounded"
                      >
                        Send Update Email
                      </button>
                      <button
                        onClick={() => onSendEmail(animal.id, 'email_owner')}
                        className="block w-full text-left px-3 py-1 text-xs bg-green-50 hover:bg-green-100 rounded"
                      >
                        Email Owner
                      </button>
                      <button
                        onClick={() => onSendEmail(animal.id, 'test_email')}
                        className="block w-full text-left px-3 py-1 text-xs bg-purple-50 hover:bg-purple-100 rounded"
                      >
                        Send Test Email
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
