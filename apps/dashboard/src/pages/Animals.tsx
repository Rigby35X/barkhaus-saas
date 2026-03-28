import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useTenant } from '../hooks/useTenant';
import {
  getAnimals,
  getAnimalById,
  createAnimal,
  updateAnimal,
  deleteAnimal,
  sendAnimalEmail,
} from '../lib/api';
import AnimalForm from '../components/AnimalForm';
import PawsAnimalList from '../components/PawsAnimalList';

export default function Animals() {
  const { orgId, loading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();

  // For Org 9 (MBPR) - use PAWS system
  const isOrg9 = orgId === 9;

  // State for PAWS system (Org 9)
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Fetch animals
  const { data: animalsData, isLoading } = useQuery({
    queryKey: ['animals', orgId, statusFilter],
    queryFn: () => getAnimals(orgId, statusFilter || undefined),
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: createAnimal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      setIsFormOpen(false);
      setSelectedAnimal(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateAnimal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      setIsFormOpen(false);
      setSelectedAnimal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAnimal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] });
    },
  });

  const emailMutation = useMutation({
    mutationFn: ({ animalId, templateName }: { animalId: number; templateName: string }) =>
      sendAnimalEmail(animalId, templateName),
  });

  // PAWS handlers (Org 9 only)
  const handleAddAnimal = () => {
    setSelectedAnimal(null);
    setIsFormOpen(true);
  };

  const handleEditAnimal = async (id: number) => {
    const animal = await getAnimalById(id);
    setSelectedAnimal(animal);
    setIsFormOpen(true);
  };

  const handleDeleteAnimal = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this animal?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSaveAnimal = async (data: any) => {
    if (selectedAnimal) {
      await updateMutation.mutateAsync({ id: selectedAnimal.id, data });
    } else {
      await createMutation.mutateAsync({ ...data, org: orgId });
    }
  };

  const handleSendEmail = async (animalId: number, templateName: string) => {
    try {
      const result = await emailMutation.mutateAsync({ animalId, templateName });
      alert(result.confirmation_message || 'Email sent successfully!');
    } catch (error) {
      alert('Failed to send email');
    }
  };

  if (tenantLoading || isLoading) {
    return (
      <Layout>
        <div>Loading animals...</div>
      </Layout>
    );
  }

  // For Org 9 - Show PAWS system with all 218 fields
  if (isOrg9) {
    const animals = (animalsData as any[]) || [];

    return (
      <Layout>
        <div>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-deep-taupe">Animals (PAWS)</h1>
            <button
              onClick={handleAddAnimal}
              className="bg-warm-brown text-white px-6 py-2 rounded hover:bg-opacity-90 transition"
            >
              + Add New Animal
            </button>
          </div>

          {/* Status Filter */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded ${
                statusFilter === '' ? 'bg-warm-brown text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('Submitted')}
              className={`px-4 py-2 rounded ${
                statusFilter === 'Submitted'
                  ? 'bg-warm-brown text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Submitted
            </button>
            <button
              onClick={() => setStatusFilter('Available')}
              className={`px-4 py-2 rounded ${
                statusFilter === 'Available'
                  ? 'bg-warm-brown text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setStatusFilter('Adopted')}
              className={`px-4 py-2 rounded ${
                statusFilter === 'Adopted'
                  ? 'bg-warm-brown text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Adopted
            </button>
          </div>

          <PawsAnimalList
            animals={animals}
            onEdit={handleEditAnimal}
            onDelete={handleDeleteAnimal}
            onSendEmail={handleSendEmail}
          />

          {isFormOpen && (
            <AnimalForm
              puppy={selectedAnimal}
              onSave={handleSaveAnimal}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedAnimal(null);
              }}
            />
          )}
        </div>
      </Layout>
    );
  }

  // For other orgs - Show simple animals list
  const animals = animalsData || [];

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
