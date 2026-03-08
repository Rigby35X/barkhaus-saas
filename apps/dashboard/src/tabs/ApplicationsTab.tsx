import { useState, useEffect } from 'react';
import { fetchApplications, updateApplicationStatus, type Application } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

interface ApplicationsTabProps {
  orgId: number;
}

const ADOPTION_CODES = [
  '4.Approved', '1.LM', '7.Adopted: MBPR', 'Approved', 'Adopted: MBPR',
  'Z.Denied', '6.Conditional Approval', 'LM', 'Foster', 'Denied',
  'Conditional Approval', 'Call Later', '5.Approved: Adult', '8.Adopted: Other',
  '2.Call Later', '9.Foster', 'Approved: Adult', 'Returned', '3.VIP',
  'VIP', 'Adopted: Other', 'Volunteer', 'Y.Returned',
];

const STATUSES = ['new', 'under_review', 'approved', 'denied', 'completed'];

const HIDDEN_FIELDS = ['id', 'org_id', 'first_name', 'last_name', 'email', 'phone', 'form_type', 'status', 'admin_notes', 'created_at', 'adoption_code'];

export default function ApplicationsTab({ orgId }: ApplicationsTabProps) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [noteText, setNoteText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchApplications({ org_id: orgId, form_type: filterType || undefined });
      setApps(data);
    } catch {
      setError('Could not load applications. API may not be configured yet.');
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) void load();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, filterType]);

  const filtered = apps.filter((a) => {
    const term = search.toLowerCase();
    const matchSearch =
      !search ||
      `${a.first_name} ${a.last_name}`.toLowerCase().includes(term) ||
      (a.email ?? '').toLowerCase().includes(term) ||
      (a.phone ?? '').toLowerCase().includes(term) ||
      (a.status ?? '').toLowerCase().includes(term);
    const matchCode = !filterCode || (a.status ?? '') === filterCode;
    return matchSearch && matchCode;
  });

  const openApp = (app: Application) => {
    setSelectedApp(app);
    setNoteText(app.admin_notes ?? '');
    setNewStatus(app.status ?? 'new');
    setSaveMsg('');
  };

  const handleSave = async () => {
    if (!selectedApp) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await updateApplicationStatus(selectedApp.id, newStatus, noteText);
      setApps((prev) => prev.map((a) => a.id === selectedApp.id ? { ...a, status: newStatus, admin_notes: noteText } : a));
      setSaveMsg('Saved!');
      setSelectedApp((prev) => prev ? { ...prev, status: newStatus, admin_notes: noteText } : prev);
    } catch {
      setSaveMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const mailtoLink = (app: Application) => {
    const subject = encodeURIComponent(`Re: Your ${app.form_type ?? 'adoption'} application`);
    const body = encodeURIComponent(`Hi ${app.first_name},\n\nThank you for your application.\n\n`);
    return `mailto:${app.email ?? ''}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Applications</h2>
          <p className="text-sm text-stone mt-1">Manage adoption, foster, and relinquishment applications.</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="bg-cloud rounded-xl p-4 space-y-3">
            <input
              type="text"
              placeholder="Search by name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-silver-gray rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="">All Types</option>
                <option value="adoption">Adoption</option>
                <option value="foster">Foster</option>
                <option value="relinquishment">Relinquishment</option>
              </select>
              <select
                value={filterCode}
                onChange={(e) => setFilterCode(e.target.value)}
                className="border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white"
              >
                <option value="">All Codes</option>
                {ADOPTION_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => { setSearch(''); setFilterType(''); setFilterCode(''); }}
                className="border border-stone rounded-xl px-3 py-2 text-sm text-deep-taupe hover:bg-dove transition"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {error && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-serif font-semibold text-deep-taupe">Applications Coming Soon</p>
              <p className="text-sm text-stone mt-1 max-w-sm mx-auto">{error}</p>
            </div>
          )}

          {loading && <p className="text-center py-10 text-stone">Loading applications…</p>}

          {!loading && !error && filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-serif font-semibold text-deep-taupe">No applications found</p>
              <p className="text-sm text-stone mt-1">Adjust your filters or check back later.</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="rounded-xl border border-silver-gray overflow-hidden">
              <div className="bg-gray-50 border-b border-silver-gray px-4 py-3 grid grid-cols-6 gap-3 text-xs font-semibold text-stone uppercase tracking-wider">
                <span>Applicant</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Type</span>
                <span>Status/Code</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-silver-gray">
                {filtered.map((app) => (
                  <div key={app.id} className="px-4 py-3 grid grid-cols-6 gap-3 items-center hover:bg-cloud transition text-sm">
                    <span className="font-medium text-deep-taupe">{app.first_name} {app.last_name}</span>
                    <span className="text-stone truncate">{app.email}</span>
                    <span className="text-stone">{app.phone}</span>
                    <span className="text-stone capitalize">{app.form_type}</span>
                    <span><StatusBadge status={app.status ?? 'new'} /></span>
                    <div className="flex justify-end gap-2">
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
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title="Application Details"
        size="lg"
        footer={
          <>
            <button onClick={() => setSelectedApp(null)} className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition">
              Close
            </button>
            {selectedApp && (
              <a
                href={mailtoLink(selectedApp)}
                className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
              >
                Open in Email Client
              </a>
            )}
            <button onClick={() => void handleSave()} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {selectedApp && (
          <div className="space-y-4">
            {saveMsg && (
              <p className={`text-sm px-3 py-2 rounded-xl ${saveMsg === 'Saved!' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{saveMsg}</p>
            )}

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-cloud rounded-xl p-4">
              <div><span className="text-stone font-medium">Name:</span><br /><span className="text-deep-taupe">{selectedApp.first_name} {selectedApp.last_name}</span></div>
              <div><span className="text-stone font-medium">Email:</span><br /><span className="text-deep-taupe">{selectedApp.email ?? '—'}</span></div>
              <div><span className="text-stone font-medium">Phone:</span><br /><span className="text-deep-taupe">{selectedApp.phone ?? '—'}</span></div>
              <div><span className="text-stone font-medium">Type:</span><br /><span className="text-deep-taupe capitalize">{selectedApp.form_type ?? '—'}</span></div>
              <div><span className="text-stone font-medium">Date:</span><br /><span className="text-deep-taupe">{selectedApp.created_at ? new Date(selectedApp.created_at).toLocaleString() : '—'}</span></div>
              <div><span className="text-stone font-medium">Status:</span><br /><StatusBadge status={selectedApp.status ?? 'new'} /></div>
            </div>

            {/* form_data fields */}
            {selectedApp.form_data && typeof selectedApp.form_data === 'object' && Object.keys(selectedApp.form_data as object).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">Form Responses</p>
                <div className="space-y-2 bg-cloud rounded-xl p-4">
                  {Object.entries(selectedApp.form_data as Record<string, unknown>)
                    .filter(([, v]) => v !== null && v !== undefined && v !== '')
                    .map(([key, val]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-stone capitalize">{key.replace(/_/g, ' ')}: </span>
                        <span className="text-deep-taupe">{String(val)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Other fields */}
            {Object.entries(selectedApp)
              .filter(([k]) => !HIDDEN_FIELDS.includes(k) && k !== 'form_data')
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([key, val]) => (
                <div key={key} className="text-sm">
                  <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                  <p className="text-deep-taupe">{String(val)}</p>
                </div>
              ))}

            {/* Status update */}
            <div>
              <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
                {ADOPTION_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Admin notes */}
            <div>
              <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Admin Notes / Reply</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown min-h-[100px] resize-y bg-white"
                placeholder="Add notes or draft a reply…"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
