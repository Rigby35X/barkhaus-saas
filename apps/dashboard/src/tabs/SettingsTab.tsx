import { useState, useRef, useEffect } from 'react';
import type { OrgConfig } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { uploadImage } from '../lib/upload';

interface SettingsTabProps {
  orgId: number;
  orgConfig: OrgConfig;
}

const HEADING_FONT_OPTIONS = ['Noto Serif Display', 'Playfair Display', 'Lora', 'Merriweather', 'Georgia'];
const BODY_FONT_OPTIONS = ['Poppins', 'DM Sans', 'Inter', 'Source Sans 3', 'Roboto'];
const FONT_OPTIONS = ['Inter', 'Poppins', 'Playfair Display', 'Lato', 'Montserrat', 'Raleway', 'Open Sans', 'Noto Serif Display', 'Merriweather'];
const FONT_SCALE_OPTIONS = ['Small', 'Medium', 'Large', 'Extra Large'];
const EMAIL_PROVIDERS = ['None', 'SendGrid', 'Custom SMTP'];
const DOMAIN_PROVIDERS = ['None', 'GoDaddy', 'Namecheap', 'Google Domains', 'Cloudflare', 'Other'];
const SECURITY_OPTIONS = ['TLS', 'SSL', 'None'];

interface CsvRow { [key: string]: string }

export default function SettingsTab({ orgId, orgConfig }: SettingsTabProps) {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('organization');

  // ── Organization ──
  const [org, setOrg] = useState({
    name: orgConfig.name,
    ein_tax_id: '',
    phone: orgConfig.contact.phone,
    email: orgConfig.contact.email,
    contact_email: orgConfig.contact.email,
    address: orgConfig.contact.address,
    city: '',
    state: '',
    zip: '',
    website: '',
    facebook: orgConfig.social.facebook,
    instagram: orgConfig.social.instagram,
    twitter: orgConfig.social.twitter ?? '',
    youtube: '',
  });

  // ── Branding ──
  const [branding, setBranding] = useState({
    heading_font: 'Inter',
    body_font: 'Poppins',
    font_scale: 'Medium',
    color_primary: orgConfig.colors.primary,
    color_secondary: orgConfig.colors.secondary,
    color_accent: '#c8956b',
    color_text: '#4d4c4c',
    color_background: '#e9e8e6',
    heading_color: '#4d4c4c',
    body_text_color: '#4d4c4c',
    link_color: '#804e3f',
    logo_dark_url: orgConfig.logo,
    logo_light_url: '',
    favicon_url: '',
  });

  // ── Email ──
  const [emailCfg, setEmailCfg] = useState({
    provider: 'None',
    primary_email: orgConfig.contact.email,
    smtp_server: '',
    smtp_port: '587',
    security: 'TLS',
  });

  // ── Domain ──
  const [domain, setDomain] = useState({
    provider: 'None',
    domain_name: '',
    login_url: '',
    username: '',
    account_id: '',
  });

  // ── CSV Import ──
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMsg, setCsvMsg] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  // ── Logo upload ──
  const [logoUploading, setLogoUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [pendingLogoField, setPendingLogoField] = useState<string>('logo_dark_url');

  // ── Shared save state ──
  const [saving, setSaving] = useState(false);

  // ── Required organizations table columns ──
  // Run once in Supabase SQL Editor if settings save/load fails:
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS secondary_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accent_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS text_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS background_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_light_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_dark_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS heading_font text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS body_font text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS font_scale text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS heading_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS body_text_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS link_color text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS facebook_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS instagram_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS twitter_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS youtube_url text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_provider text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_email text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_server text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_port text;
  // ALTER TABLE organizations ADD COLUMN IF NOT EXISTS smtp_security text;

  // Load live org data on mount — use ?? (not ||) so empty-string saves are respected
  useEffect(() => {
    console.log('[SettingsTab] Loading org data from Supabase, id:', orgId);
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error('[SettingsTab] Failed to load org data:', error);
          return;
        }
        console.log('[SettingsTab] Loaded org data:', data);
        setOrg((prev) => ({
          ...prev,
          name: (data.name as string) ?? prev.name,
          ein_tax_id: (data.ein as string) ?? prev.ein_tax_id,
          phone: (data.phone as string) ?? prev.phone,
          email: (data.email as string) ?? prev.email,
          contact_email: (data.contact_email as string) ?? prev.contact_email,
          address: (data.address as string) ?? prev.address,
          city: (data.city as string) ?? prev.city,
          state: (data.state as string) ?? prev.state,
          zip: (data.zip_code as string) ?? prev.zip,
          website: (data.website as string) ?? prev.website,
          facebook: (data.facebook_url as string) ?? prev.facebook,
          instagram: (data.instagram_url as string) ?? prev.instagram,
          twitter: (data.twitter_url as string) ?? prev.twitter,
          youtube: (data.youtube_url as string) ?? prev.youtube,
        }));
        setBranding((prev) => ({
          ...prev,
          heading_font: (data.heading_font as string) ?? prev.heading_font,
          body_font: (data.body_font as string) ?? prev.body_font,
          font_scale: (data.font_scale as string) ?? prev.font_scale,
          color_primary: (data.primary_color as string) ?? prev.color_primary,
          color_secondary: (data.secondary_color as string) ?? prev.color_secondary,
          color_accent: (data.accent_color as string) ?? prev.color_accent,
          color_text: (data.text_color as string) ?? prev.color_text,
          color_background: (data.background_color as string) ?? prev.color_background,
          heading_color: (data.heading_color as string) ?? prev.heading_color,
          body_text_color: (data.body_text_color as string) ?? prev.body_text_color,
          link_color: (data.link_color as string) ?? prev.link_color,
          logo_dark_url: (data.logo_dark_url as string) ?? prev.logo_dark_url,
          logo_light_url: (data.logo_light_url as string) ?? prev.logo_light_url,
          favicon_url: (data.favicon_url as string) ?? prev.favicon_url,
        }));
        setEmailCfg((prev) => ({
          ...prev,
          provider: (data.email_provider as string) ?? prev.provider,
          primary_email: (data.primary_email as string) ?? prev.primary_email,
          smtp_server: (data.smtp_server as string) ?? prev.smtp_server,
          smtp_port: (data.smtp_port as string) ?? prev.smtp_port,
          security: (data.smtp_security as string) ?? prev.security,
        }));
        setDomain((prev) => ({
          ...prev,
          domain_name: (data.custom_domain as string) ?? prev.domain_name,
        }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const uploadLogo = async (file: File, fieldKey: string) => {
    setLogoUploading(fieldKey);
    try {
      console.log('Starting logo upload for', fieldKey);
      const url = await uploadImage(file, 'logos', orgId);
      console.log('Upload response url:', url);

      // Update local state
      setBranding((prev) => ({ ...prev, [fieldKey]: url }));

      // Save to Supabase organizations table
      const dbField = fieldKey === 'logo_dark_url' ? 'logo_dark_url' : fieldKey === 'logo_light_url' ? 'logo_light_url' : 'favicon_url';
      const { data: logoSaveData, error: logoSaveError } = await supabase.from('organizations').update({ [dbField]: url }).eq('id', orgId).select();
      console.log('Logo save data:', logoSaveData);
      console.log('Logo save error:', JSON.stringify(logoSaveError));
      if (logoSaveError) {
        console.error('Failed to save logo to DB:', logoSaveError);
        showToast('Upload failed — could not save to database', 'error');
      } else {
        console.log('Logo saved to DB:', dbField, url);
        showToast('Logo uploaded!', 'success');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      showToast(err instanceof Error ? err.message : 'Upload failed — please try again.', 'error');
    } finally {
      setLogoUploading(null);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadLogo(file, pendingLogoField);
    e.target.value = '';
  };

  const save = async () => {
    setSaving(true);
    try {
      let updates: Record<string, unknown> = {};
      if (activeSection === 'organization') {
        updates = {
          name: org.name,
          ein: org.ein_tax_id,
          phone: org.phone,
          email: org.email,
          contact_email: org.contact_email,
          address: org.address,
          city: org.city,
          state: org.state,
          zip_code: org.zip,
          website: org.website,
          facebook_url: org.facebook,
          instagram_url: org.instagram,
        };
      } else if (activeSection === 'branding') {
        updates = {
          heading_font: branding.heading_font,
          body_font: branding.body_font,
          font_scale: branding.font_scale,
          primary_color: branding.color_primary,
          secondary_color: branding.color_secondary,
          accent_color: branding.color_accent,
          text_color: branding.color_text,
          background_color: branding.color_background,
          heading_color: branding.heading_color,
          body_text_color: branding.body_text_color,
          link_color: branding.link_color,
          logo_dark_url: branding.logo_dark_url,
          logo_light_url: branding.logo_light_url,
          favicon_url: branding.favicon_url,
        };
      } else if (activeSection === 'social') {
        updates = {
          facebook_url: org.facebook,
          instagram_url: org.instagram,
          twitter_url: org.twitter,
          youtube_url: org.youtube,
        };
      } else if (activeSection === 'email') {
        updates = {
          email_provider: emailCfg.provider,
          primary_email: emailCfg.primary_email,
          smtp_server: emailCfg.smtp_server,
          smtp_port: emailCfg.smtp_port,
          smtp_security: emailCfg.security,
        };
      } else if (activeSection === 'domain') {
        updates = { custom_domain: domain.domain_name };
      }
      console.log(`[SettingsTab] Saving [${activeSection}]:`, updates);
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', orgId);
      if (error) throw error;
      console.log('[SettingsTab] Save successful');
      if (activeSection === 'organization') {
        showToast('Organization info saved \u2713', 'success');
      } else if (activeSection === 'branding') {
        showToast('Branding saved \u2713', 'success');
      } else {
        showToast('Saved \u2713', 'success');
      }
    } catch (err) {
      console.error('[SettingsTab] Save error:', err);
      showToast('Save failed \u2014 please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) { setCsvMsg('CSV appears empty.'); return; }
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1, 6).map((line) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row: CsvRow = {};
        headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
        return row;
      });
      setCsvHeaders(headers);
      setCsvPreview(rows);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const cols = ['name', 'species', 'breed', 'age', 'gender', 'size', 'status', 'description', 'good_with_kids', 'good_with_cats', 'good_with_dogs', 'spayed_neutered', 'vaccinated', 'microchip', 'image_url'];
    const example = ['Buddy', 'Dog', 'Labrador Mix', '2 years', 'Male', 'Large', 'Available', 'Sweet and playful', 'true', 'true', 'true', 'true', 'true', 'false', ''];
    const csv = [cols.join(','), example.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animal-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvMsg('');
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('org_id', String(orgId));
      await fetch('/api/admin/animals/bulk-import', { method: 'POST', body: formData });
      setCsvMsg(`Import complete — ${csvPreview.length}+ animals processed.`);
    } catch {
      setCsvMsg('Import failed. Check your CSV format and try again.');
    } finally {
      setCsvImporting(false);
    }
  };

  const SECTIONS = [
    { key: 'organization', label: 'Organization' },
    { key: 'branding', label: 'Branding' },
    { key: 'social', label: 'Social Media' },
    { key: 'email', label: 'Email' },
    { key: 'domain', label: 'Domain' },
    { key: 'csv-import', label: 'Animal Import' },
    { key: 'api', label: 'API Config' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Settings</h2>
          <p className="text-sm text-stone mt-0.5">ID: {orgId} · {orgConfig.name}</p>
        </div>

        <div className="flex flex-col md:flex-row" style={{ minHeight: 560 }}>
          {/* Section nav */}
          <nav className="w-full md:w-48 border-b md:border-b-0 md:border-r border-silver-gray p-3 flex-shrink-0 flex md:flex-col overflow-x-auto gap-1 md:space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeSection === s.key ? 'bg-dove text-warm-brown font-semibold' : 'text-deep-taupe hover:bg-cloud'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Section content */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-serif font-semibold text-deep-taupe">
                {SECTIONS.find((s) => s.key === activeSection)?.label}
              </h3>
              {activeSection !== 'csv-import' && activeSection !== 'api' && (
                <div className="flex items-center gap-3">
                  <button onClick={() => void save()} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Organization ── */}
            {activeSection === 'organization' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SField label="Organization Name">
                  <input className={inp} value={org.name} onChange={(e) => setOrg((p) => ({ ...p, name: e.target.value }))} />
                </SField>
                <SField label="EIN / Tax ID">
                  <input className={inp} value={org.ein_tax_id} onChange={(e) => setOrg((p) => ({ ...p, ein_tax_id: e.target.value }))} placeholder="XX-XXXXXXX" />
                </SField>
                <SField label="Phone">
                  <input className={inp} value={org.phone} onChange={(e) => setOrg((p) => ({ ...p, phone: e.target.value }))} />
                </SField>
                <SField label="Email">
                  <input type="email" className={inp} value={org.email} onChange={(e) => setOrg((p) => ({ ...p, email: e.target.value }))} />
                </SField>
                <SField label="Contact Email">
                  <input type="email" className={inp} value={org.contact_email} onChange={(e) => setOrg((p) => ({ ...p, contact_email: e.target.value }))} />
                </SField>
                <SField label="Website">
                  <input type="url" className={inp} value={org.website} onChange={(e) => setOrg((p) => ({ ...p, website: e.target.value }))} placeholder="https://…" />
                </SField>
                <SField label="Address" cls="sm:col-span-2">
                  <input className={inp} value={org.address} onChange={(e) => setOrg((p) => ({ ...p, address: e.target.value }))} />
                </SField>
                <SField label="City">
                  <input className={inp} value={org.city} onChange={(e) => setOrg((p) => ({ ...p, city: e.target.value }))} />
                </SField>
                <SField label="State">
                  <input className={inp} value={org.state} onChange={(e) => setOrg((p) => ({ ...p, state: e.target.value }))} maxLength={2} />
                </SField>
                <SField label="ZIP">
                  <input className={inp} value={org.zip} onChange={(e) => setOrg((p) => ({ ...p, zip: e.target.value }))} />
                </SField>
                <SField label="Facebook URL">
                  <input type="url" className={inp} value={org.facebook} onChange={(e) => setOrg((p) => ({ ...p, facebook: e.target.value }))} placeholder="https://facebook.com/…" />
                </SField>
                <SField label="Instagram URL">
                  <input type="url" className={inp} value={org.instagram} onChange={(e) => setOrg((p) => ({ ...p, instagram: e.target.value }))} placeholder="https://instagram.com/…" />
                </SField>
              </div>
            )}

            {/* ── Branding ── */}
            {activeSection === 'branding' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SField label="Heading Font">
                    <select className={inp} value={branding.heading_font} onChange={(e) => setBranding((p) => ({ ...p, heading_font: e.target.value }))}>
                      {HEADING_FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </SField>
                  <SField label="Body Font">
                    <select className={inp} value={branding.body_font} onChange={(e) => setBranding((p) => ({ ...p, body_font: e.target.value }))}>
                      {BODY_FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}
                    </select>
                  </SField>
                  <SField label="Font Scale">
                    <select className={inp} value={branding.font_scale} onChange={(e) => setBranding((p) => ({ ...p, font_scale: e.target.value }))}>
                      {FONT_SCALE_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </SField>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Brand Colors</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {([
                      ['color_primary', 'Primary'],
                      ['color_secondary', 'Secondary'],
                      ['color_accent', 'Accent'],
                      ['color_text', 'Text'],
                      ['color_background', 'Background'],
                    ] as [keyof typeof branding, string][]).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <label className="block text-xs text-stone">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={branding[key] as string}
                            onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))}
                            className="w-10 h-9 rounded-lg border border-silver-gray cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={branding[key] as string}
                            onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))}
                            maxLength={7}
                            className="flex-1 border border-silver-gray rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-3">Typography Colors</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {([
                      ['heading_color', 'Heading Color'],
                      ['body_text_color', 'Body Text Color'],
                      ['link_color', 'Link Color'],
                    ] as [keyof typeof branding, string][]).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <label className="block text-xs text-stone">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={branding[key] as string}
                            onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))}
                            className="w-10 h-9 rounded-lg border border-silver-gray cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={branding[key] as string}
                            onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))}
                            maxLength={7}
                            className="flex-1 border border-silver-gray rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-stone uppercase tracking-wider">Logos &amp; Favicon</p>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleLogoFileChange(e)} />
                  {([
                    ['logo_dark_url', 'Dark Logo URL'],
                    ['logo_light_url', 'Light Logo URL'],
                    ['favicon_url', 'Favicon URL'],
                  ] as [keyof typeof branding, string][]).map(([key, label]) => (
                    <SField key={key} label={label}>
                      <div className="flex gap-2">
                        <input type="url" className={`${inp} flex-1`} value={branding[key] as string} onChange={(e) => setBranding((p) => ({ ...p, [key]: e.target.value }))} placeholder="https://…" />
                        <button
                          type="button"
                          onClick={() => { setPendingLogoField(String(key)); logoInputRef.current?.click(); }}
                          disabled={!!logoUploading}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-silver-gray rounded-lg hover:bg-cloud transition disabled:opacity-50 whitespace-nowrap"
                        >
                          {logoUploading === String(key) && (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {logoUploading === String(key) ? 'Uploading…' : 'Upload'}
                        </button>
                        {branding[key] && (
                          <img src={branding[key] as string} alt={label} className="h-9 w-9 rounded-lg object-contain border border-silver-gray bg-cloud" />
                        )}
                      </div>
                    </SField>
                  ))}
                </div>
              </div>
            )}

            {/* ── Social Media ── */}
            {activeSection === 'social' && (
              <div className="space-y-4">
                <SField label="Instagram URL">
                  <input type="url" className={inp} value={org.instagram} onChange={(e) => setOrg((p) => ({ ...p, instagram: e.target.value }))} placeholder="https://instagram.com/…" />
                </SField>
                <SField label="Facebook URL">
                  <input type="url" className={inp} value={org.facebook} onChange={(e) => setOrg((p) => ({ ...p, facebook: e.target.value }))} placeholder="https://facebook.com/…" />
                </SField>
                <SField label="Twitter / X URL">
                  <input type="url" className={inp} value={org.twitter} onChange={(e) => setOrg((p) => ({ ...p, twitter: e.target.value }))} placeholder="https://twitter.com/…" />
                </SField>
                <SField label="YouTube URL">
                  <input type="url" className={inp} value={org.youtube} onChange={(e) => setOrg((p) => ({ ...p, youtube: e.target.value }))} placeholder="https://youtube.com/…" />
                </SField>
              </div>
            )}

            {/* ── Email ── */}
            {activeSection === 'email' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SField label="Email Provider">
                  <select className={inp} value={emailCfg.provider} onChange={(e) => setEmailCfg((p) => ({ ...p, provider: e.target.value }))}>
                    {EMAIL_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </SField>
                <SField label="Primary Email">
                  <input type="email" className={inp} value={emailCfg.primary_email} onChange={(e) => setEmailCfg((p) => ({ ...p, primary_email: e.target.value }))} />
                </SField>
                <SField label="SMTP Server">
                  <input className={inp} value={emailCfg.smtp_server} onChange={(e) => setEmailCfg((p) => ({ ...p, smtp_server: e.target.value }))} placeholder="smtp.example.com" />
                </SField>
                <SField label="SMTP Port">
                  <input type="number" className={inp} value={emailCfg.smtp_port} onChange={(e) => setEmailCfg((p) => ({ ...p, smtp_port: e.target.value }))} />
                </SField>
                <SField label="Security">
                  <select className={inp} value={emailCfg.security} onChange={(e) => setEmailCfg((p) => ({ ...p, security: e.target.value }))}>
                    {SECURITY_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </SField>
              </div>
            )}

            {/* ── Domain ── */}
            {activeSection === 'domain' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SField label="Domain Provider">
                  <select className={inp} value={domain.provider} onChange={(e) => setDomain((p) => ({ ...p, provider: e.target.value }))}>
                    {DOMAIN_PROVIDERS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </SField>
                <SField label="Domain Name">
                  <input className={inp} value={domain.domain_name} onChange={(e) => setDomain((p) => ({ ...p, domain_name: e.target.value }))} placeholder="yourrescue.org" />
                </SField>
                <SField label="Registrar Login URL">
                  <input type="url" className={inp} value={domain.login_url} onChange={(e) => setDomain((p) => ({ ...p, login_url: e.target.value }))} placeholder="https://…" />
                </SField>
                <SField label="Username">
                  <input className={inp} value={domain.username} onChange={(e) => setDomain((p) => ({ ...p, username: e.target.value }))} />
                </SField>
                <SField label="Account ID">
                  <input className={inp} value={domain.account_id} onChange={(e) => setDomain((p) => ({ ...p, account_id: e.target.value }))} />
                </SField>
              </div>
            )}

            {/* ── CSV Import ── */}
            {activeSection === 'csv-import' && (
              <div className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Required columns: <span className="font-mono">name, species</span></p>
                  <p>Optional: breed, age, gender, size, status, description, good_with_kids, good_with_cats, good_with_dogs, spayed_neutered, vaccinated, microchip, image_url</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCsvChange}
                    className="flex-1 border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white"
                  />
                  <button
                    onClick={downloadTemplate}
                    className="px-4 py-2 text-sm border border-stone rounded-xl text-deep-taupe hover:bg-cloud transition flex-shrink-0"
                  >
                    Download Template
                  </button>
                </div>

                {csvPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone uppercase tracking-wider mb-2">Preview (first 5 rows)</p>
                    <div className="rounded-xl border border-silver-gray overflow-x-auto">
                      <table className="text-xs w-full">
                        <thead className="bg-gray-50 border-b border-silver-gray">
                          <tr>
                            {csvHeaders.map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-stone font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-silver-gray">
                          {csvPreview.map((row, i) => (
                            <tr key={i} className="hover:bg-cloud">
                              {csvHeaders.map((h) => (
                                <td key={h} className="px-3 py-2 text-deep-taupe">{row[h] ?? ''}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {csvMsg && (
                  <p className={`text-sm px-3 py-2 rounded-xl ${csvMsg.includes('failed') || csvMsg.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                    {csvMsg}
                  </p>
                )}

                <button
                  onClick={() => void handleImport()}
                  disabled={!csvFile || csvImporting}
                  className="px-6 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition"
                >
                  {csvImporting ? 'Importing…' : 'Import Animals'}
                </button>
              </div>
            )}

            {/* ── API Config ── */}
            {activeSection === 'api' && (
              <div className="space-y-3 text-sm">
                {[
                  ['VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL],
                  ['VITE_SUPABASE_ANON_KEY', import.meta.env.VITE_SUPABASE_ANON_KEY],
                ].map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center bg-cloud rounded-xl px-4 py-3">
                    <span className="font-mono text-xs text-stone">{key}</span>
                    <span className={`text-xs font-mono ${val ? 'text-green-600' : 'text-red-500'}`}>
                      {val ? '✓ Set' : '✗ Not set'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white text-deep-taupe';

function SField({ label, children, cls }: { label: string; children: React.ReactNode; cls?: string }) {
  return (
    <div className={`space-y-1 ${cls ?? ''}`}>
      <label className="block text-xs font-semibold text-stone uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
