// REQUIRED: Run the policies table migration in Supabase before using this tab.
// See apps/dashboard/src/lib/api.ts → ensurePoliciesTable() for the SQL.
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ORGANIZATIONS } from '../lib/api';

interface PoliciesTabProps {
  orgId: number;
}

const POLICY_TYPES = [
  { key: 'privacy_policy', label: 'Privacy Policy' },
  { key: 'cookie_policy', label: 'Cookie Policy' },
  { key: 'terms_of_use', label: 'Terms of Use' },
  { key: 'adoption_agreement', label: 'Adoption Agreement' },
  { key: 'foster_agreement', label: 'Foster Agreement' },
  { key: 'volunteer_waiver', label: 'Volunteer Waiver' },
  { key: 'photo_media_release', label: 'Photo/Media Release' },
] as const;

type PolicyKey = typeof POLICY_TYPES[number]['key'];

export default function PoliciesTab({ orgId }: PoliciesTabProps) {
  const [activePolicy, setActivePolicy] = useState<PolicyKey>('privacy_policy');
  const [policies, setPolicies] = useState<Record<PolicyKey, string>>({
    privacy_policy: '',
    cookie_policy: '',
    terms_of_use: '',
    adoption_agreement: '',
    foster_agreement: '',
    volunteer_waiver: '',
    photo_media_release: '',
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('policies')
          .select('policy_type, content')
          .eq('org_id', orgId);
        if (data) {
          const updates: Partial<Record<PolicyKey, string>> = {};
          for (const row of data) {
            const key = row.policy_type as PolicyKey;
            if (key in policies) updates[key] = row.content ?? '';
          }
          setPolicies((prev) => ({ ...prev, ...updates }));
        }
      } catch {
        // table may not exist yet — silently ignore
      } finally {
        setLoading(false);
      }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setSaveMsg('');
    try {
      const subdomain = ORGANIZATIONS[orgId]?.subdomain ?? 'mbpr';
      const endpoint = `https://${subdomain}.preview.barkhaus.io/api/admin/generate-policy`;
      console.log(`[generate-policy] POST ${endpoint}`, { orgId, policyType: activePolicy });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, policyType: activePolicy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { content?: string; error?: string };
      if (json.content) {
        setPolicies((prev) => ({ ...prev, [activePolicy]: json.content! }));
      }
    } catch (err) {
      console.error('Policy generation error:', err);
      setSaveMsg('Generation failed. Check API configuration.');
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const { error } = await supabase
        .from('policies')
        .upsert(
          { org_id: orgId, policy_type: activePolicy, content: policies[activePolicy], updated_at: new Date().toISOString() },
          { onConflict: 'org_id,policy_type' }
        );
      if (error) throw error;
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (err) {
      console.error('Policy save error:', err);
      setSaveMsg('Failed to save.');
      setTimeout(() => setSaveMsg(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(policies[activePolicy]);
    setSaveMsg('Copied!');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleDownload = () => {
    const label = POLICY_TYPES.find((p) => p.key === activePolicy)?.label ?? activePolicy;
    const blob = new Blob([policies[activePolicy]], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentLabel = POLICY_TYPES.find((p) => p.key === activePolicy)?.label ?? '';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Policies</h2>
          <p className="text-sm text-stone mt-1">Generate and manage legal policies for your organization.</p>
        </div>

        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <p className="text-xs text-amber-800">
            <strong>Disclaimer:</strong> AI-generated policies are for reference only and do not constitute legal advice.
            Please have a qualified attorney review any documents before use.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row" style={{ minHeight: 560 }}>
          {/* Policy type nav */}
          <div className="w-full lg:w-52 border-b lg:border-b-0 lg:border-r border-silver-gray flex-shrink-0">
            <div className="p-2">
              <p className="text-xs font-semibold text-stone uppercase tracking-wider px-2 py-1">Policy Type</p>
              {POLICY_TYPES.map((pt) => (
                <button
                  key={pt.key}
                  onClick={() => { setActivePolicy(pt.key); setSaveMsg(''); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                    activePolicy === pt.key ? 'bg-dove text-warm-brown font-semibold' : 'text-deep-taupe hover:bg-cloud'
                  }`}
                >
                  {pt.label}
                  {policies[pt.key] && (
                    <span className="ml-1.5 text-xs text-green-600">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-serif font-semibold text-deep-taupe">{currentLabel}</h3>
              <div className="flex items-center gap-2">
                {saveMsg && (
                  <span className={`text-sm font-medium ${saveMsg === 'Saved!' || saveMsg === 'Copied!' ? 'text-green-600' : 'text-red-600'}`}>
                    {saveMsg}
                  </span>
                )}
                <button
                  onClick={() => void handleGenerate()}
                  disabled={generating}
                  className="px-4 py-2 text-sm font-semibold border border-warm-brown text-warm-brown rounded-xl hover:bg-dove disabled:opacity-40 transition"
                >
                  {generating ? 'Generating…' : 'Generate with AI'}
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!policies[activePolicy]}
                  className="px-4 py-2 text-sm border border-silver-gray rounded-xl text-deep-taupe hover:bg-cloud disabled:opacity-40 transition"
                >
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!policies[activePolicy]}
                  className="px-4 py-2 text-sm border border-silver-gray rounded-xl text-deep-taupe hover:bg-cloud disabled:opacity-40 transition"
                >
                  Download
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving || !policies[activePolicy]}
                  className="px-5 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-stone text-sm text-center py-8">Loading…</p>
            ) : (
              <textarea
                value={policies[activePolicy]}
                onChange={(e) => setPolicies((prev) => ({ ...prev, [activePolicy]: e.target.value }))}
                placeholder={`Click "Generate with AI" to create a ${currentLabel}, or type your own content here.`}
                className="flex-1 w-full border border-silver-gray rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown resize-none bg-white min-h-[400px]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
