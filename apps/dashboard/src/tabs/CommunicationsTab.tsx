import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

interface CommunicationsTabProps {
  orgId: number;
}

interface Submission {
  id: number;
  org_id: number;
  form_type: 'contact' | 'waitlist' | string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  status: 'new' | 'read' | 'replied' | 'archived' | string;
  admin_notes?: string;
  created_at?: string;
  [key: string]: unknown;
}

const SUBMISSIONS_BASE = 'https://xz6u-fpaz-praf.n7e.xano.io/api:0Mx5oX0z';
const TOKEN = import.meta.env.VITE_XANO_ANIMALS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ';

const xanoSubmissions = axios.create({
  baseURL: SUBMISSIONS_BASE,
  headers: { Authorization: `Bearer ${TOKEN}` },
});

const FORM_TYPES = ['', 'contact', 'waitlist'];
const STATUSES = ['', 'new', 'read', 'replied', 'archived'];

const STATUS_LABEL: Record<string, string> = {
  '': 'All', new: 'New', read: 'Read', replied: 'Replied', archived: 'Archived',
};

export default function CommunicationsTab({ orgId }: CommunicationsTabProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState<string>('read');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { org_id: String(orgId) };
      if (filterType) params.form_type = filterType;
      if (filterStatus) params.status = filterStatus;
      const res = await xanoSubmissions.get<Submission[]>('/submissions', { params });
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError('Could not load submissions. Endpoint may not be live yet.');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) load();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, filterType, filterStatus]);

  const openSubmission = (sub: Submission) => {
    setSelected(sub);
    setReplyText(sub.admin_notes ?? '');
    setNewStatus(sub.status === 'new' ? 'read' : sub.status);
    setSaveMsg('');
    // mark as read if new
    if (sub.status === 'new') {
      void patchStatus(sub.id, 'read', sub.admin_notes ?? '');
    }
  };

  const patchStatus = async (id: number, status: string, notes: string) => {
    await xanoSubmissions.patch(`/submissions/${id}`, { status, admin_notes: notes });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await patchStatus(selected.id, newStatus, replyText);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === selected.id ? { ...s, status: newStatus, admin_notes: replyText } : s
        )
      );
      setSaveMsg('Saved!');
      setSelected((prev) => prev ? { ...prev, status: newStatus, admin_notes: replyText } : prev);
    } catch {
      setSaveMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    all: submissions.length,
    new: submissions.filter((s) => s.status === 'new').length,
    unread: submissions.filter((s) => s.status === 'new' || s.status === 'read').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Form Submissions</h2>
            <p className="text-sm text-stone mt-0.5">
              Inbox for contact and waitlist messages from your website.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {counts.new > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                {counts.new} new
              </span>
            )}
            <button
              onClick={load}
              className="px-4 py-2 text-sm border border-stone rounded-xl text-deep-taupe hover:bg-cloud transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
            >
              <option value="">All Form Types</option>
              {FORM_TYPES.slice(1).map((t) => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>

            <div className="flex gap-1 bg-cloud rounded-xl p-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filterStatus === s
                      ? 'bg-white shadow-sm text-warm-brown font-semibold'
                      : 'text-stone hover:text-deep-taupe'
                  }`}
                >
                  {STATUS_LABEL[s]}
                  {s === 'new' && counts.new > 0 && (
                    <span className="ml-1 bg-red-100 text-red-600 px-1.5 rounded-full text-xs">{counts.new}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-serif font-semibold text-deep-taupe">Submissions Inbox</p>
              <p className="text-sm text-stone mt-1 max-w-sm mx-auto">{error}</p>
              <p className="text-xs text-stone mt-2 font-mono">{SUBMISSIONS_BASE}/submissions</p>
            </div>
          )}

          {loading && <p className="text-center py-10 text-stone">Loading submissions…</p>}

          {/* Empty */}
          {!loading && !error && submissions.length === 0 && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">📬</p>
              <p className="font-serif font-semibold text-deep-taupe">No submissions found</p>
              <p className="text-sm text-stone mt-1">Submissions from your website forms will appear here.</p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && submissions.length > 0 && (
            <div className="overflow-x-auto">
            <div className="rounded-xl border border-silver-gray overflow-hidden">
              <div className="hidden sm:grid grid-cols-5 gap-3 bg-gray-50 border-b border-silver-gray px-4 py-3 text-xs font-semibold text-stone uppercase tracking-wider">
                <span>From</span>
                <span>Email</span>
                <span>Type</span>
                <span>Date</span>
                <span>Status</span>
              </div>
              <div className="divide-y divide-silver-gray">
                {submissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => openSubmission(sub)}
                    className={`grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-3 px-4 py-3 cursor-pointer hover:bg-cloud transition text-sm ${
                      sub.status === 'new' ? 'bg-blue-50 hover:bg-blue-100' : ''
                    }`}
                  >
                    <span className="font-medium text-deep-taupe flex items-center gap-1">
                      {sub.status === 'new' && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      {sub.first_name} {sub.last_name}
                    </span>
                    <span className="text-stone truncate">{sub.email ?? '—'}</span>
                    <span className="text-stone capitalize">{sub.form_type}</span>
                    <span className="text-stone text-xs">
                      {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}
                    </span>
                    <span><StatusBadge status={sub.status} /></span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Submission Details"
        size="lg"
        footer={
          <>
            <button
              onClick={() => setSelected(null)}
              className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            {saveMsg && (
              <p className={`text-sm px-3 py-2 rounded-xl ${saveMsg === 'Saved!' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {saveMsg}
              </p>
            )}

            {/* Contact details */}
            <div className="grid grid-cols-2 gap-3 text-sm bg-cloud rounded-xl p-4">
              <div><span className="text-stone font-medium">Name:</span><br /><span className="text-deep-taupe">{selected.first_name} {selected.last_name}</span></div>
              <div><span className="text-stone font-medium">Email:</span><br /><span className="text-deep-taupe">{selected.email ?? '—'}</span></div>
              <div><span className="text-stone font-medium">Phone:</span><br /><span className="text-deep-taupe">{selected.phone ?? '—'}</span></div>
              <div><span className="text-stone font-medium">Form:</span><br /><span className="text-deep-taupe capitalize">{selected.form_type}</span></div>
              <div><span className="text-stone font-medium">Date:</span><br /><span className="text-deep-taupe">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</span></div>
              <div><span className="text-stone font-medium">Status:</span><br /><StatusBadge status={selected.status} /></div>
            </div>

            {/* Message */}
            {selected.message && (
              <div>
                <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-1">Message</p>
                <p className="text-sm text-deep-taupe bg-cloud rounded-xl p-3 whitespace-pre-wrap">{selected.message}</p>
              </div>
            )}

            {/* Other fields */}
            {Object.entries(selected)
              .filter(([k]) => !['id', 'org_id', 'form_type', 'first_name', 'last_name', 'email', 'phone', 'message', 'status', 'admin_notes', 'created_at'].includes(k))
              .filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([key, val]) => (
                <div key={key}>
                  <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-deep-taupe">{String(val)}</p>
                </div>
              ))}

            {/* Update status */}
            <div>
              <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Update Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              >
                {['new', 'read', 'replied', 'archived'].map((s) => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Admin notes / reply */}
            <div>
              <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Admin Notes / Reply</label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add notes or draft a reply…"
                className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown min-h-[100px] resize-y bg-white"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
