import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../components/Toast';

interface CommunicationsTabProps {
  orgId?: number;
}

interface Submission {
  id: number;
  org_id: number;
  form_type?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  form_data?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function fetchSubmissionsFromSupabase(orgId: number): Promise<Submission[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/form_submissions?org_id=eq.${orgId}&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Supabase error ${res.status}`);
  return res.json() as Promise<Submission[]>;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TypeBadge({ type }: { type?: string }) {
  const colorMap: Record<string, string> = {
    contact: 'bg-blue-100 text-blue-700',
    volunteer: 'bg-green-100 text-green-700',
    general: 'bg-gray-100 text-gray-600',
  };
  const color = colorMap[type?.toLowerCase() ?? ''] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${color}`}>
      {type ?? '—'}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    new: 'bg-gray-100 text-gray-600',
    under_review: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    denied: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-700',
  };
  const color = colorMap[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-500';
  const label = status ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${color}`}>
      {label}
    </span>
  );
}

const STATUSES = ['new', 'under_review', 'approved', 'denied', 'completed'];

export default function CommunicationsTab({ orgId = 9 }: CommunicationsTabProps) {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('[CommunicationsTab] Fetching submissions for org_id:', orgId);
      const data = await fetchSubmissionsFromSupabase(orgId);
      console.log('[CommunicationsTab] Loaded submissions:', data.length);
      setSubmissions(data);
    } catch (err) {
      console.error('[CommunicationsTab] Error fetching submissions:', err);
      setError('Unable to load form submissions');
      showToast('Unable to load form submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const formTypes = useMemo(
    () => Array.from(new Set(submissions.map((s) => s.form_type).filter((t): t is string => !!t))),
    [submissions]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return submissions.filter((sub) => {
      const matchType = !typeFilter || sub.form_type?.toLowerCase() === typeFilter;
      const matchStatus = !statusFilter || (sub.status ?? 'new').toLowerCase() === statusFilter;
      const name = `${sub.first_name ?? ''} ${sub.last_name ?? ''}`.toLowerCase();
      const matchSearch = !term || name.includes(term) || (sub.email ?? '').toLowerCase().includes(term);
      return matchType && matchStatus && matchSearch;
    });
  }, [submissions, typeFilter, statusFilter, search]);

  const openSub = (sub: Submission) => {
    setSelected(sub);
    setNewStatus(sub.status ?? 'new');
    setReply('');
  };

  const handleSaveStatus = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/form_submissions?id=eq.${selected.id}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error(`Supabase PATCH error ${res.status}`);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, status: newStatus } : s))
      );
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : prev));
      showToast('Submission updated', 'success');
    } catch (err) {
      console.error('[CommunicationsTab] Error saving status:', err);
      showToast('Failed to save status — please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Form Submissions</h2>
          <p className="text-sm text-stone mt-1">Contact and inquiry form submissions from your website.</p>
        </div>

        <div className="p-6">
          {/* Filters */}
          {!loading && !error && submissions.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
              />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">All Types</option>
                {formTypes.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">All Statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="text-center py-12">
              <p className="text-red-500 font-medium mb-3">{error}</p>
              <button
                onClick={() => void load()}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && submissions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">📬</div>
              <p className="text-lg font-semibold text-deep-taupe mb-2">No form submissions yet.</p>
            </div>
          )}

          {/* No results after filtering */}
          {!loading && !error && submissions.length > 0 && filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No submissions match your filters.</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="rounded-xl border border-silver-gray overflow-hidden min-w-[640px] mx-4 sm:mx-0">
                <div className="bg-gray-50 border-b border-silver-gray px-4 py-3 grid grid-cols-6 gap-3 text-xs font-semibold text-stone uppercase tracking-wider">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-silver-gray">
                  {filtered.map((sub) => (
                    <div
                      key={sub.id}
                      className="px-4 py-3 grid grid-cols-6 gap-3 items-center hover:bg-cloud transition text-sm"
                    >
                      <span className="text-stone text-xs">{formatDate(sub.created_at)}</span>
                      <span><TypeBadge type={sub.form_type} /></span>
                      <span className="font-medium text-deep-taupe truncate">
                        {sub.first_name} {sub.last_name}
                      </span>
                      <span className="text-stone truncate">{sub.email ?? '—'}</span>
                      <span><StatusBadge status={sub.status ?? 'new'} /></span>
                      <div className="flex justify-end">
                        <button
                          onClick={() => openSub(sub)}
                          className="px-3 py-1 text-xs border border-silver-gray rounded-lg hover:bg-cloud transition"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-silver-gray">
              <div className="flex items-center gap-3">
                <span className="font-serif font-semibold text-deep-taupe text-lg">
                  {selected.first_name} {selected.last_name}
                </span>
                <TypeBadge type={selected.form_type} />
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-cloud rounded-xl p-4">
                <div>
                  <span className="text-stone font-medium text-xs uppercase tracking-wider">Email</span>
                  <p className="text-deep-taupe mt-0.5">{selected.email ?? '—'}</p>
                </div>
                <div>
                  <span className="text-stone font-medium text-xs uppercase tracking-wider">Phone</span>
                  <p className="text-deep-taupe mt-0.5">{selected.phone ?? '—'}</p>
                </div>
              </div>

              {/* form_data */}
              {selected.form_data &&
                typeof selected.form_data === 'object' &&
                Object.keys(selected.form_data).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">
                      Form Responses
                    </p>
                    <div className="bg-cloud rounded-xl p-4 max-h-64 overflow-y-auto">
                      <dl>
                        {Object.entries(selected.form_data)
                          .filter(([, v]) => v !== null && v !== undefined && v !== '')
                          .map(([key, val]) => (
                            <div key={key}>
                              <dt className="font-semibold text-sm text-deep-taupe mt-2">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                              </dt>
                              <dd className="text-sm text-gray-600 mb-2">{String(val)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  </div>
                )}

              {/* Status update */}
              <div>
                <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
                  Update Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-warm-brown"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reply */}
              <div>
                <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
                  Reply
                </label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Draft a reply — opens in your email client…"
                  className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-warm-brown min-h-[100px] resize-y"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-silver-gray gap-3">
              <a
                href={`mailto:${selected.email ?? ''}?subject=${encodeURIComponent('Re: Your message')}${reply ? `&body=${encodeURIComponent(reply)}` : ''}`}
                className="text-sm text-warm-brown hover:underline"
              >
                Open in Email Client
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
                >
                  Close
                </button>
                <button
                  onClick={() => void handleSaveStatus()}
                  disabled={saving}
                  className="px-5 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : 'Save Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
