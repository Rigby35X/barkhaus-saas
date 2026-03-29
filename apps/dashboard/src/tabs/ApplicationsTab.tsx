import { useState, useEffect } from 'react';

interface ApplicationsTabProps {
  orgId?: number;
}

interface Application {
  id: number;
  org_id: number;
  form_type: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  admin_notes?: string;
  created_at?: string;
  form_data?: Record<string, unknown>;
  [key: string]: unknown;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function fetchApplicationsFromSupabase(orgId: number): Promise<Application[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/applications?org_id=eq.${orgId}&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );
  if (!res.ok) throw new Error(`Supabase error ${res.status}`);
  return res.json() as Promise<Application[]>;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function TypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    adoption: 'bg-blue-100 text-blue-700',
    foster: 'bg-purple-100 text-purple-700',
    volunteer: 'bg-green-100 text-green-700',
  };
  const color = colorMap[type?.toLowerCase()] ?? 'bg-gray-100 text-gray-600';
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

export default function ApplicationsTab({ orgId = 9 }: ApplicationsTabProps) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('[ApplicationsTab] Fetching applications for org_id:', orgId);
      const data = await fetchApplicationsFromSupabase(orgId);
      console.log('[ApplicationsTab] Loaded applications:', data.length);
      setApps(data);
    } catch (err) {
      console.error('[ApplicationsTab] Error fetching applications:', err);
      setError('Unable to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const openApp = (app: Application) => {
    setSelectedApp(app);
    setNewStatus(app.status ?? 'new');
    setSaveMsg('');
  };

  const handleSaveStatus = async () => {
    if (!selectedApp) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/applications?id=eq.${selectedApp.id}`,
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
      setApps((prev) =>
        prev.map((a) => (a.id === selectedApp.id ? { ...a, status: newStatus } : a))
      );
      setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setSaveMsg('Saved!');
    } catch (err) {
      console.error('[ApplicationsTab] Error saving status:', err);
      setSaveMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Applications</h2>
          <p className="text-sm text-stone mt-1">Manage adoption, foster, and volunteer applications.</p>
        </div>

        <div className="p-6">
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
              <p className="text-red-500 font-medium mb-3">Unable to load applications</p>
              <button
                onClick={() => void load()}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && apps.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-lg font-semibold text-deep-taupe mb-2">No applications yet</p>
              <p className="text-sm text-gray-500 max-w-sm">
                Applications submitted through your website will appear here.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && apps.length > 0 && (
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
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="px-4 py-3 grid grid-cols-6 gap-3 items-center hover:bg-cloud transition text-sm"
                    >
                      <span className="text-stone text-xs">{formatDate(app.created_at)}</span>
                      <span><TypeBadge type={app.form_type} /></span>
                      <span className="font-medium text-deep-taupe truncate">
                        {app.first_name} {app.last_name}
                      </span>
                      <span className="text-stone truncate">{app.email ?? '—'}</span>
                      <span><StatusBadge status={app.status ?? 'new'} /></span>
                      <div className="flex justify-end">
                        <button
                          onClick={() => openApp(app)}
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
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-silver-gray">
              <div className="flex items-center gap-3">
                <span className="font-serif font-semibold text-deep-taupe text-lg">
                  {selectedApp.first_name} {selectedApp.last_name}
                </span>
                <TypeBadge type={selectedApp.form_type} />
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light"
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {saveMsg && (
                <p
                  className={`text-sm px-3 py-2 rounded-xl ${
                    saveMsg === 'Saved!' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {saveMsg}
                </p>
              )}

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-cloud rounded-xl p-4">
                <div>
                  <span className="text-stone font-medium text-xs uppercase tracking-wider">Email</span>
                  <p className="text-deep-taupe mt-0.5">{selectedApp.email ?? '—'}</p>
                </div>
                <div>
                  <span className="text-stone font-medium text-xs uppercase tracking-wider">Phone</span>
                  <p className="text-deep-taupe mt-0.5">{selectedApp.phone ?? '—'}</p>
                </div>
              </div>

              {/* form_data */}
              {selectedApp.form_data &&
                typeof selectedApp.form_data === 'object' &&
                Object.keys(selectedApp.form_data).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">
                      Form Responses
                    </p>
                    <div className="bg-cloud rounded-xl p-4 max-h-64 overflow-y-auto">
                      <dl>
                        {Object.entries(selectedApp.form_data)
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
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-silver-gray gap-3">
              <a
                href={`mailto:${selectedApp.email ?? ''}`}
                className="text-sm text-warm-brown hover:underline"
              >
                Open in Email Client
              </a>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedApp(null)}
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
