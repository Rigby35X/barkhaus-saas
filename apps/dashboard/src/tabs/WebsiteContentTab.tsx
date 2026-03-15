import { useState, useEffect, useRef } from 'react';
import { fetchWebsiteContent, saveWebsiteContentSection, updateWebsiteSection, ORGANIZATIONS, type WebsiteSection } from '../lib/api';

const FONT_OPTIONS = ['Inter', 'Poppins', 'Playfair Display', 'Lato', 'Montserrat', 'Raleway', 'Open Sans', 'Noto Serif Display', 'Merriweather'];
const SECTION_FONT_SCALE_OPTIONS = ['', 'Small', 'Medium', 'Large', 'Extra Large'];

interface WebsiteContentTabProps {
  orgId: number;
}

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'url' | 'image';
}

interface SectionDef {
  key: string;
  label: string;
  fields: FieldDef[];
}

interface PageDef {
  key: string;
  label: string;
  sections: SectionDef[];
}

// Section keys match what apps/tenant-site/src/pages/*.astro reads from content-fetcher.
// page_slug values must match the first arg of fetchAllPageData() in each tenant page.
const PAGES: PageDef[] = [
  {
    key: 'homepage',
    label: 'Homepage',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'subheadline', label: 'Subheadline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'button_text', label: 'Button Text' },
          { key: 'button_link', label: 'Button Link', type: 'url' },
          { key: 'background_image_url', label: 'Background Image URL', type: 'url' },
        ],
      },
      {
        key: 'about_us',
        label: 'About Us',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'featured_image_url', label: 'Featured Image URL', type: 'url' },
          { key: 'secondary_image_url', label: 'Secondary Image URL', type: 'url' },
        ],
      },
      {
        key: 'what_we_do',
        label: 'What We Do',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'subheadline', label: 'Subheadline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'featured_image_url', label: 'Featured Image URL', type: 'image' },
          { key: 'secondary_image_url', label: 'Secondary Image URL', type: 'image' },
        ],
      },
      {
        key: 'faq_section',
        label: 'FAQ',
        fields: [
          { key: 'headline', label: 'Section Headline' },
          { key: 'faq_question_1', label: 'FAQ 1 Question' },
          { key: 'faq_answer_1', label: 'FAQ 1 Answer', type: 'textarea' },
          { key: 'faq_question_2', label: 'FAQ 2 Question' },
          { key: 'faq_answer_2', label: 'FAQ 2 Answer', type: 'textarea' },
          { key: 'faq_question_3', label: 'FAQ 3 Question' },
          { key: 'faq_answer_3', label: 'FAQ 3 Answer', type: 'textarea' },
          { key: 'faq_question_4', label: 'FAQ 4 Question' },
          { key: 'faq_answer_4', label: 'FAQ 4 Answer', type: 'textarea' },
          { key: 'faq_question_5', label: 'FAQ 5 Question' },
          { key: 'faq_answer_5', label: 'FAQ 5 Answer', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'about',
    label: 'About',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'background_image_url', label: 'Background Image URL', type: 'url' },
        ],
      },
      {
        key: 'our_story',
        label: 'Our Story',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'featured_image_url', label: 'Featured Image URL', type: 'url' },
          { key: 'secondary_image_url', label: 'Secondary Image URL', type: 'url' },
        ],
      },
      {
        key: 'what_we_do_expanded',
        label: 'What We Do',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'team',
        label: 'Team',
        fields: [
          { key: 'headline', label: 'Section Headline' },
          { key: 'body_text', label: 'Intro Text', type: 'textarea' },
        ],
      },
      {
        key: 'faq_section',
        label: 'FAQ',
        fields: [
          { key: 'headline', label: 'Section Headline' },
          { key: 'faq_question_1', label: 'FAQ 1 Question' },
          { key: 'faq_answer_1', label: 'FAQ 1 Answer', type: 'textarea' },
          { key: 'faq_question_2', label: 'FAQ 2 Question' },
          { key: 'faq_answer_2', label: 'FAQ 2 Answer', type: 'textarea' },
          { key: 'faq_question_3', label: 'FAQ 3 Question' },
          { key: 'faq_answer_3', label: 'FAQ 3 Answer', type: 'textarea' },
          { key: 'faq_question_4', label: 'FAQ 4 Question' },
          { key: 'faq_answer_4', label: 'FAQ 4 Answer', type: 'textarea' },
          { key: 'faq_question_5', label: 'FAQ 5 Question' },
          { key: 'faq_answer_5', label: 'FAQ 5 Answer', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'contact',
    label: 'Contact',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'contact_info',
        label: 'Contact Info',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'subheadline', label: 'Subheadline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'background_image_url', label: 'Background Image URL', type: 'image' },
        ],
      },
    ],
  },
  {
    key: 'animals',
    label: 'Animals',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Intro Text', type: 'textarea' },
        ],
      },
      {
        key: 'adoption_process',
        label: 'Adoption Process',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'more_info',
        label: 'More Info',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'adopted_gallery',
        label: 'Adopted Gallery',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'featured_image_url', label: 'Featured Image URL', type: 'image' },
        ],
      },
    ],
  },
  {
    key: 'donate',
    label: 'Donate',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'impact',
        label: 'Impact',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
          { key: 'featured_image_url', label: 'Featured Image URL', type: 'image' },
        ],
      },
    ],
  },
  {
    key: 'events',
    label: 'Events',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Intro Text', type: 'textarea' },
        ],
      },
      {
        key: 'upcoming',
        label: 'Upcoming Events',
        fields: [
          { key: 'headline', label: 'Section Headline' },
          { key: 'body_text', label: 'Intro Text', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'applications',
    label: 'Applications',
    sections: [
      {
        key: 'hero',
        label: 'Hero',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Intro Text', type: 'textarea' },
        ],
      },
      {
        key: 'adoption_application',
        label: 'Adoption Application',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'foster_application',
        label: 'Foster Application',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        key: 'volunteer_application',
        label: 'Volunteer Application',
        fields: [
          { key: 'headline', label: 'Headline' },
          { key: 'body_text', label: 'Body Text', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'global',
    label: 'Footer',
    sections: [
      {
        key: 'footer',
        label: 'Footer',
        fields: [
          { key: 'footer_organization_name', label: 'Organization Name' },
          { key: 'footer_address_line_one', label: 'Address Line 1' },
          { key: 'footer_address_line_two', label: 'Address Line 2' },
          { key: 'footer_address_city', label: 'City' },
          { key: 'footer_address_state', label: 'State' },
          { key: 'footer_address_zip', label: 'ZIP' },
          { key: 'footer_phone', label: 'Phone' },
          { key: 'footer_email', label: 'Email' },
          { key: 'footer_ein', label: 'EIN / Tax ID' },
          { key: 'footer_copyright', label: 'Copyright Text' },
        ],
      },
    ],
  },
];

export default function WebsiteContentTab({ orgId }: WebsiteContentTabProps) {
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState('homepage');
  const [activeSectionKey, setActiveSectionKey] = useState('hero');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pendingImageField, setPendingImageField] = useState<string>('');

  // Typography overrides per section (stored as JSONB `typography` column in website_content)
  // Run once in Supabase SQL Editor if not yet added:
  // ALTER TABLE website_content ADD COLUMN IF NOT EXISTS typography jsonb;
  const [typographyEditing, setTypographyEditing] = useState({ heading_color: '', body_text_color: '', heading_font: '', font_size_scale: '' });
  const [showTypography, setShowTypography] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchWebsiteContent(orgId);
        setSections(data);
      } catch {
        setError('Could not load website content.');
      } finally {
        setLoading(false);
      }
    };
    if (orgId) void load();
    else setLoading(false);
  }, [orgId]);

  // Hydrate typography overrides when the active section changes
  useEffect(() => {
    const page = PAGES.find((p) => p.key === activePage) ?? PAGES[0];
    const sectionDef = page.sections.find((s) => s.key === activeSectionKey) ?? page.sections[0];
    const section = sections.find(
      (s) => (s.page_slug as string | undefined) === activePage &&
        (s.section_key ?? s.section) === sectionDef?.key
    );
    const typo = section?.typography;
    if (typo && typeof typo === 'object' && !Array.isArray(typo)) {
      const t = typo as Record<string, string>;
      setTypographyEditing({
        heading_color: t.heading_color ?? '',
        body_text_color: t.body_text_color ?? '',
        heading_font: t.heading_font ?? '',
        font_size_scale: t.font_size_scale ?? '',
      });
    } else {
      setTypographyEditing({ heading_color: '', body_text_color: '', heading_font: '', font_size_scale: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, activeSectionKey, sections]);

  const currentPage = PAGES.find((p) => p.key === activePage) ?? PAGES[0];
  const currentSectionDef = currentPage.sections.find((s) => s.key === activeSectionKey) ?? currentPage.sections[0];

  // Find the matching live section — must match both page_slug and section_key
  const liveSection = sections.find(
    (s) =>
      (s.page_slug as string | undefined) === activePage &&
      (s.section_key ?? s.section) === currentSectionDef?.key
  );

  const handleEdit = (key: string, value: string) => {
    setEditing((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (key: string): string => {
    if (key in editing) return editing[key];
    if (liveSection) {
      const val = liveSection[key];
      return typeof val === 'string' ? val : '';
    }
    return '';
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Include typography overrides only when the panel is open (user explicitly set/cleared them)
      const typographyPayload = showTypography
        ? { typography: Object.values(typographyEditing).some(v => v) ? typographyEditing : null }
        : {};
      const fullContent = { ...editing, ...typographyPayload };
      if (liveSection) {
        console.log('[WebsiteContentTab] updating existing section id:', liveSection.id, fullContent);
        const updated = await updateWebsiteSection(liveSection.id, fullContent);
        setSections((prev) => prev.map((s) => (s.id === liveSection.id ? { ...s, ...updated } : s)));
      } else {
        console.log('[WebsiteContentTab] creating new section:', activePage, currentSectionDef?.key, fullContent);
        const created = await saveWebsiteContentSection(orgId, activePage, currentSectionDef?.key ?? '', fullContent);
        setSections((prev) => [...prev, created]);
      }
      setEditing({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('[WebsiteContentTab] save error:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (pageKey: string) => {
    setActivePage(pageKey);
    const page = PAGES.find((p) => p.key === pageKey);
    if (page?.sections[0]) setActiveSectionKey(page.sections[0].key);
    setEditing({});
    setShowTypography(false);
  };

  const handleImageUpload = async (file: File, fieldKey: string) => {
    setUploadingField(fieldKey);
    setUploadError('');
    try {
      const org = ORGANIZATIONS[orgId];
      const subdomain = org?.subdomain ?? 'mbpr';
      const endpoint = `https://${subdomain}.preview.barkhaus.io/api/upload-image`;
      const formData = new FormData();
      formData.append('image', file);
      formData.append('orgId', String(orgId));
      formData.append('section', activePage);
      console.log(`[WebsiteContentTab] Uploading image for field ${fieldKey} to ${endpoint}`);
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const json = await res.json() as { url?: string };
      const url = json.url ?? '';
      console.log(`[WebsiteContentTab] Uploaded image URL:`, url);
      handleEdit(fieldKey, url);
    } catch (err) {
      console.error('[WebsiteContentTab] Image upload error:', err);
      setUploadError('Upload failed — check console.');
      setTimeout(() => setUploadError(''), 4000);
    } finally {
      setUploadingField(null);
    }
  };

  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingImageField) return;
    await handleImageUpload(file, pendingImageField);
    e.target.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Website Content</h2>
            <p className="text-sm text-stone mt-1">Edit each section of your public-facing website.</p>
          </div>
          {(() => {
            const org = ORGANIZATIONS[orgId];
            const previewUrl = org?.subdomain
              ? `https://${org.subdomain}.preview.barkhaus.io`
              : org?.siteUrl ?? null;
            return previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-semibold border border-warm-brown text-warm-brown rounded-xl hover:bg-dove transition"
              >
                View Website ↗
              </a>
            ) : null;
          })()}
        </div>

        {loading && <p className="p-6 text-stone text-center">Loading content…</p>}
        {error && (
          <div className="p-6 text-center">
            <p className="text-4xl mb-3">🌐</p>
            <p className="font-serif font-semibold text-deep-taupe">Content Not Available</p>
            <p className="text-sm text-stone mt-1">{error}</p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col lg:flex-row" style={{ minHeight: 560 }}>
            {/* Page list */}
            <div className="w-full lg:w-40 border-b lg:border-b-0 lg:border-r border-silver-gray flex-shrink-0">
              <div className="p-2">
                <p className="text-xs font-semibold text-stone uppercase tracking-wider px-2 py-1">Pages</p>
                {PAGES.map((page) => (
                  <button
                    key={page.key}
                    onClick={() => handlePageChange(page.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      activePage === page.key ? 'bg-dove text-warm-brown font-semibold' : 'text-deep-taupe hover:bg-cloud'
                    }`}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Section list (for pages with multiple sections) */}
            {currentPage.sections.length > 1 && (
              <div className="w-full lg:w-44 border-b lg:border-b-0 lg:border-r border-silver-gray flex-shrink-0">
                <div className="p-2">
                  <p className="text-xs font-semibold text-stone uppercase tracking-wider px-2 py-1">Sections</p>
                  {currentPage.sections.map((sec) => (
                    <button
                      key={sec.key}
                      onClick={() => { setActiveSectionKey(sec.key); setEditing({}); setShowTypography(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        activeSectionKey === sec.key ? 'bg-cloud text-warm-brown font-semibold' : 'text-deep-taupe hover:bg-cloud'
                      }`}
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Field editor */}
            <div className="flex-1 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-serif font-semibold text-deep-taupe">{currentSectionDef?.label}</h3>
                  {!liveSection && !error && (
                    <p className="text-xs text-stone mt-0.5">No content saved for this section yet.</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving || Object.keys(editing).length === 0}
                    className="px-5 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {currentSectionDef && (
                <div className="space-y-4">
                  {/* Hidden file input for image uploads */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => void handleImageInputChange(e)}
                  />
                  {uploadError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
                  )}
                  {currentSectionDef.fields.map((field) => {
                    const val = getValue(field.key);
                    const isLong = field.type === 'textarea';
                    const isImage = field.type === 'image' || (field.type === 'url' && field.key.includes('image'));
                    return (
                      <div key={field.key} className="space-y-1">
                        <label className="block text-xs font-semibold text-stone uppercase tracking-wider">
                          {field.label}
                        </label>
                        {isLong ? (
                          <textarea
                            value={val}
                            onChange={(e) => handleEdit(field.key, e.target.value)}
                            className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown min-h-[100px] resize-y bg-white"
                          />
                        ) : isImage ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="url"
                              value={val}
                              onChange={(e) => handleEdit(field.key, e.target.value)}
                              placeholder="https://…"
                              className="flex-1 border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
                            />
                            <button
                              type="button"
                              disabled={!!uploadingField}
                              onClick={() => { setPendingImageField(field.key); imageInputRef.current?.click(); }}
                              className="px-3 py-2 text-xs border border-silver-gray rounded-xl hover:bg-cloud transition disabled:opacity-50 whitespace-nowrap"
                            >
                              {uploadingField === field.key ? 'Uploading…' : 'Upload'}
                            </button>
                            {val && (
                              <img src={val} alt={field.label} className="h-9 w-9 rounded-lg object-cover border border-silver-gray bg-cloud flex-shrink-0" />
                            )}
                          </div>
                        ) : (
                          <input
                            type={field.type === 'url' ? 'url' : 'text'}
                            value={val}
                            onChange={(e) => handleEdit(field.key, e.target.value)}
                            placeholder={field.type === 'url' ? 'https://…' : ''}
                            className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* ── Typography Overrides ── */}
                  <div className="border border-silver-gray rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowTypography((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-deep-taupe hover:bg-cloud transition"
                    >
                      <span>Typography Overrides <span className="text-xs font-normal text-stone ml-1">(optional — overrides global settings for this section)</span></span>
                      <span className="text-stone text-xs">{showTypography ? '▲' : '▼'}</span>
                    </button>
                    {showTypography && (
                      <div className="border-t border-silver-gray p-4 space-y-4 bg-cloud">
                        <p className="text-xs text-stone">Leave fields empty to use the global branding settings. Set a value to override just this section.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Heading Color */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-stone uppercase tracking-wider">Heading Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={typographyEditing.heading_color || '#4d4c4c'}
                                onChange={(e) => setTypographyEditing((p) => ({ ...p, heading_color: e.target.value }))}
                                className="w-10 h-9 rounded-lg border border-silver-gray cursor-pointer p-0.5 bg-white"
                              />
                              <input
                                type="text"
                                value={typographyEditing.heading_color}
                                onChange={(e) => setTypographyEditing((p) => ({ ...p, heading_color: e.target.value }))}
                                placeholder="Leave empty for global"
                                maxLength={7}
                                className="flex-1 border border-silver-gray rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
                              />
                              {typographyEditing.heading_color && (
                                <button type="button" onClick={() => setTypographyEditing((p) => ({ ...p, heading_color: '' }))} className="text-xs text-stone hover:text-deep-taupe">✕</button>
                              )}
                            </div>
                          </div>
                          {/* Body Text Color */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-stone uppercase tracking-wider">Body Text Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={typographyEditing.body_text_color || '#4d4c4c'}
                                onChange={(e) => setTypographyEditing((p) => ({ ...p, body_text_color: e.target.value }))}
                                className="w-10 h-9 rounded-lg border border-silver-gray cursor-pointer p-0.5 bg-white"
                              />
                              <input
                                type="text"
                                value={typographyEditing.body_text_color}
                                onChange={(e) => setTypographyEditing((p) => ({ ...p, body_text_color: e.target.value }))}
                                placeholder="Leave empty for global"
                                maxLength={7}
                                className="flex-1 border border-silver-gray rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white"
                              />
                              {typographyEditing.body_text_color && (
                                <button type="button" onClick={() => setTypographyEditing((p) => ({ ...p, body_text_color: '' }))} className="text-xs text-stone hover:text-deep-taupe">✕</button>
                              )}
                            </div>
                          </div>
                          {/* Heading Font */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-stone uppercase tracking-wider">Heading Font</label>
                            <select
                              value={typographyEditing.heading_font}
                              onChange={(e) => setTypographyEditing((p) => ({ ...p, heading_font: e.target.value }))}
                              className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white text-deep-taupe"
                            >
                              <option value="">— Use global font —</option>
                              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>
                          {/* Font Size Scale */}
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-stone uppercase tracking-wider">Font Size Scale</label>
                            <select
                              value={typographyEditing.font_size_scale}
                              onChange={(e) => setTypographyEditing((p) => ({ ...p, font_size_scale: e.target.value }))}
                              className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white text-deep-taupe"
                            >
                              {SECTION_FONT_SCALE_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s === '' ? '— Use global scale —' : s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
