import { useState, useEffect } from 'react';

interface CommunicationsTabProps {
  orgId?: number;
}

interface Submission {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  message?: string;
  created_at?: string;
  [key: string]: unknown;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDisplayName(sub: Submission): string {
  if (sub.name) return sub.name as string;
  if (sub.first_name || sub.last_name) return `${sub.first_name ?? ''} ${sub.last_name ?? ''}`.trim();
  return '—';
}

function getMessagePreview(sub: Submission): string {
  const msg = sub.message as string | undefined;
  if (!msg) return '—';
  return msg.length > 80 ? msg.slice(0, 80) + '…' : msg;
}

export default function CommunicationsTab({ orgId = 9 }: CommunicationsTabProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Submission | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('[CommunicationsTab] Fetching submissions for org_id:', orgId);
      const res = await fetch(
        `https://xz6u-fpaz-praf.n7e.xano.io/api:0Mx5oX0z/submissions?org_id=${orgId}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as Submission[];
      console.log('[CommunicationsTab] Loaded submissions:', data.length);
      setSubmissions(data);
    } catch (err) {
      console.error('[CommunicationsTab] Error fetching submissions:', err);
      setError('Unable to connect — submissions may be temporarily unavailable');
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Form Submissions</h2>
            <p className="text-sm text-stone mt-1">Contact form submissions from your website.</p>
          </div>
          <button
            onClick={() => void load()}
            className="px-4 py-2 text-sm border border-stone rounded-xl text-deep-taupe hover:bg-cloud transition"
          >
            Refresh
          </button>
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
              <p className="text-gray-500 mb-3">{error}</p>
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
              <div className="text-5xl mb-4">📥</div>
              <p className="text-lg font-semibold text-deep-taupe mb-2">No submissions yet</p>
              <p className="text-sm text-gray-500 max-w-sm">
                Contact form submissions will appear here.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && submissions.length > 0 && (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="rounded-xl border border-silver-gray overflow-hidden min-w-[600px] mx-4 sm:mx-0">
                <div className="bg-gray-50 border-b border-silver-gray px-4 py-3 grid grid-cols-5 gap-3 text-xs font-semibold text-stone uppercase tracking-wider">
                  <span>Date</span>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Message</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-silver-gray">
                  {submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="px-4 py-3 grid grid-cols-5 gap-3 items-center hover:bg-cloud transition text-sm"
                    >
                      <span className="text-stone text-xs">{formatDate(sub.created_at)}</span>
                      <span className="font-medium text-deep-taupe truncate">{getDisplayName(sub)}</span>
                      <span className="text-stone truncate">{sub.email ?? '—'}</span>
                      <span className="text-stone text-xs truncate">{getMessagePreview(sub)}</span>
                      <div className="flex justify-end">
                        <button
                          onClick={() => setSelected(sub)}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-silver-gray">
              <span className="font-serif font-semibold text-deep-taupe text-lg">
                {getDisplayName(selected)}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <dl>
                {Object.entries(selected)
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

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-silver-gray">
              <a
                href={`mailto:${selected.email ?? ''}?subject=Re: Your message`}
                className="text-sm text-warm-brown hover:underline"
              >
                Reply by email
              </a>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
