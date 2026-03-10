import { useState, useEffect, useMemo } from 'react';
import {
  fetchAnimals, fetchAnimalsOrg9, fetchAnimalById,
  createAnimal, updateAnimal, deleteAnimal,
  type Animal,
} from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import AnimalModal from './AnimalModal';

interface AnimalsTabProps {
  orgId: number;
}

type ViewMode = 'grid' | 'list';

export default function AnimalsTab({ orgId }: AnimalsTabProps) {
  const isMBPR = orgId === 9;
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = isMBPR ? await fetchAnimalsOrg9() : await fetchAnimals(orgId);
      setAnimals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load animals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) load();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    return animals.filter((a) => {
      const status = (a.status || a.Code || '').toLowerCase();
      const matchStatus = !statusFilter || status.includes(statusFilter.toLowerCase());
      const term = search.toLowerCase();
      const matchSearch =
        !search ||
        a.name?.toLowerCase().includes(term) ||
        a.breed?.toLowerCase().includes(term) ||
        a.description?.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [animals, statusFilter, search]);

  const stats = useMemo(() => {
    const getStatus = (a: Animal) => (a.status || a.Code || '').toLowerCase();
    return {
      total: animals.length,
      available: animals.filter((a) => getStatus(a) === 'available').length,
      published: animals.filter((a) => getStatus(a) === 'published').length,
      adopted: animals.filter((a) => getStatus(a).includes('adopted')).length,
    };
  }, [animals]);

  const handleAdd = () => {
    setEditingAnimal(null);
    setModalOpen(true);
  };

  const handleEdit = async (id: number) => {
    try {
      const animal = await fetchAnimalById(id);
      setEditingAnimal(animal);
      setModalOpen(true);
    } catch {
      const found = animals.find((a) => a.id === id) ?? null;
      setEditingAnimal(found);
      setModalOpen(true);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this animal? This cannot be undone.')) return;
    try {
      await deleteAnimal(id);
      setAnimals((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Failed to delete animal.');
    }
  };

  const handleSave = async (data: Partial<Animal>) => {
    if (editingAnimal) {
      const updated = await updateAnimal(editingAnimal.id, data);
      setAnimals((prev) => prev.map((a) => (a.id === editingAnimal.id ? updated : a)));
    } else {
      const created = await createAnimal({ ...data, org: orgId });
      setAnimals((prev) => [created, ...prev]);
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <section className="rounded-2xl border border-silver-gray bg-white shadow-sm">
        <div className="px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-serif font-semibold uppercase tracking-widest text-deep-taupe">
                Pet Management
              </h2>
              <p className="text-sm text-stone mt-1">Manage every companion in your rescue.</p>
            </div>
            <button
              onClick={handleAdd}
              data-tour="add-animal-btn"
              className="flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-warm-brown text-white shadow-sm hover:opacity-90 transition"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Animal
            </button>
          </div>

          {/* Stat pills */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'TOTAL', value: stats.total, color: 'text-deep-taupe' },
              { label: 'AVAILABLE', value: stats.available, color: 'text-green-600' },
              { label: 'PUBLISHED', value: stats.published, color: 'text-blue-600' },
              { label: 'ADOPTED', value: stats.adopted, color: 'text-purple-600' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-cloud px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-stone tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search animals…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-silver-gray rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-silver-gray rounded-xl px-4 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">All Statuses</option>
          {['Available', 'Published', 'Pending', 'Adopted', 'Medical', 'Foster', 'Hold', 'Returned'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {/* View toggle */}
        <div className="flex bg-cloud rounded-xl p-1 gap-1">
          <button
            onClick={() => setView('grid')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${view === 'grid' ? 'bg-white shadow-sm text-warm-brown font-semibold' : 'text-stone'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${view === 'list' ? 'bg-white shadow-sm text-warm-brown font-semibold' : 'text-stone'}`}
          >
            List
          </button>
        </div>
        <button onClick={load} className="border border-stone rounded-xl px-4 py-2 text-sm text-deep-taupe hover:bg-cloud transition">
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

      {/* Loading */}
      {loading && <p className="text-center py-12 text-stone">Loading animals…</p>}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-silver-gray">
          <p className="text-4xl mb-3">🐾</p>
          <p className="font-serif font-semibold text-deep-taupe">No animals found</p>
          <p className="text-sm text-stone mt-1">Try adjusting your filters or add a new animal.</p>
        </div>
      )}

      {/* Grid view */}
      {!loading && view === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((animal) => (
            <div key={animal.id} className="bg-white rounded-2xl overflow-hidden border border-silver-gray shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
              <img
                src={animal.image_url ?? 'https://via.placeholder.com/300x200?text=🐾'}
                alt={animal.name}
                className="w-full h-48 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=🐾'; }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base font-serif font-semibold text-deep-taupe">{animal.name}</h3>
                  <StatusBadge status={animal.status || animal.Code || 'Unknown'} />
                </div>
                <p className="text-sm text-stone">{animal.breed ?? 'Mixed'}</p>
                <p className="text-xs text-stone mb-3">
                  {animal.age ?? 'Unknown age'} · {animal.gender ?? 'Unknown'}
                </p>
                <p className="text-sm text-stone mb-4 line-clamp-2">{animal.description ?? ''}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleEdit(animal.id)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-warm-brown text-white rounded-lg hover:opacity-90 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(animal.id)}
                    className="px-3 py-1.5 text-xs border border-silver-gray rounded-lg text-stone hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-silver-gray overflow-hidden shadow-sm">
          {/* List header */}
          <div className={`hidden sm:grid gap-3 bg-gray-50 border-b border-silver-gray px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider ${isMBPR ? 'grid-cols-8' : 'grid-cols-5'}`}>
            <span className="col-span-2">Animal</span>
            <span>Breed</span>
            <span>Status</span>
            {isMBPR && <span>MBPR ID</span>}
            {isMBPR && <span>Acquired From</span>}
            {isMBPR && <span>Foster</span>}
            {isMBPR && <span>Est. Adoption</span>}
            {!isMBPR && <span>Age</span>}
            {!isMBPR && <span></span>}
          </div>
          <div className="divide-y divide-silver-gray">
            {filtered.map((animal) => (
              <div key={animal.id} className={`items-center gap-3 p-4 hover:bg-cloud transition flex sm:grid ${isMBPR ? 'sm:grid-cols-8' : 'sm:grid-cols-5'}`}>
                <div className="flex items-center gap-3 col-span-2">
                  <img
                    src={animal.image_url ?? 'https://via.placeholder.com/48?text=🐾'}
                    alt={animal.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=🐾'; }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-serif font-semibold text-deep-taupe truncate">{animal.name}</h3>
                    <p className="text-xs text-stone">{animal.age ?? 'Unknown'} · {animal.gender ?? 'Unknown'}</p>
                  </div>
                </div>
                <span className="hidden sm:block text-sm text-stone">{animal.breed ?? '—'}</span>
                <span className="hidden sm:block"><StatusBadge status={animal.status || animal.Code || 'Unknown'} /></span>
                {isMBPR && <span className="hidden sm:block text-xs text-stone font-mono">{animal.mbpr_internal_id ?? '—'}</span>}
                {isMBPR && <span className="hidden sm:block text-xs text-stone">{animal.acquired_from ?? '—'}</span>}
                {isMBPR && <span className="hidden sm:block text-xs text-stone">{animal.foster_name ?? '—'}</span>}
                {isMBPR && <span className="hidden sm:block text-xs text-stone">{animal.estimated_adoption_date ? new Date(animal.estimated_adoption_date).toLocaleDateString() : '—'}</span>}
                {!isMBPR && <span className="hidden sm:block text-sm text-stone">{animal.age ?? '—'}</span>}
                <div className="flex items-center gap-2 ml-auto sm:ml-0 flex-shrink-0 sm:col-span-1">
                  <button
                    onClick={() => void handleEdit(animal.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-warm-brown text-white rounded-lg hover:opacity-90 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void handleDelete(animal.id)}
                    className="px-3 py-1.5 text-xs border border-silver-gray rounded-lg text-stone hover:bg-red-50 hover:text-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimalModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        animal={editingAnimal}
        orgId={orgId}
        isMBPR={isMBPR}
      />
    </div>
  );
}
