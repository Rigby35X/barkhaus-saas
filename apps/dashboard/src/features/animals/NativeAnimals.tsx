import { useEffect, useState } from 'react';
import type { AnimalRecord } from '../../../../../shared/contracts/v1/animal.ts';
import { listAnimals } from './client';
import AnimalEditor from './AnimalEditor';

export interface NativeAnimalsProps { orgId: number; canEdit?: boolean; initialSearch?: string; searchNonce?: number }
export default function NativeAnimals({ orgId, canEdit = false, initialSearch = '', searchNonce }: NativeAnimalsProps) {
  const [animals, setAnimals] = useState<AnimalRecord[]>([]);
  const [editing, setEditing] = useState<AnimalRecord | null | undefined>(undefined);
  const [search, setSearch] = useState(initialSearch);
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { setSearch(initialSearch); }, [initialSearch, searchNonce]);
  useEffect(() => {
    let active = true; setLoading(true); setAnimals([]); setEditing(undefined); setError('');
    void listAnimals(orgId).then(rows => { if (active) setAnimals(rows); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orgId, refresh]);
  return <section className="space-y-4">
    <h2 className="text-2xl">Animals</h2>
    <p>Manage animal profiles, private notes, and deliberate publication.</p>
    <button disabled={!canEdit || loading || !!error} onClick={() => setEditing(null)}>Create animal</button>{' '}
    <button onClick={() => setRefresh(v => v+1)}>Refresh</button>
    <label className="block">Search<input className="border p-2 ml-2" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {loading && <p role="status">Loading animals…</p>}
    {error && <p role="alert">{error}</p>}
    {!loading && !error && animals.length === 0 && <p>No animals yet.</p>}
    <ul className="space-y-2">{animals.filter(a => a.fields.name.toLowerCase().includes(search.toLowerCase())).map(a => <li className="bg-white border rounded p-4" key={JSON.stringify(a.id)}>
      <button className="underline" onClick={() => setEditing(a)}>{a.fields.name}</button> · {a.fields.species} · {a.fields.lifecycle} · {a.fields.availability} · {a.publication.state}
    </li>)}</ul>
    {editing !== undefined && <AnimalEditor key={`${orgId}:${JSON.stringify(editing?.id)}`} orgId={orgId} animal={editing} canEdit={canEdit} onClose={() => setEditing(undefined)} onSaved={saved => setAnimals(rows => rows.some(r => r.id === saved.id) ? rows.map(r => r.id === saved.id ? saved : r) : [...rows, saved])} />}
  </section>;
}
