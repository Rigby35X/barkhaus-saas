import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useTenant } from '../hooks/useTenant';
import { fetchAllWebsiteContent, updateWebsiteSection } from '../lib/xano';

const PAGES = ['homepage', 'about', 'contact', 'animals', 'donate', 'events'];
const EDITABLE_FIELDS = ['headline', 'subheadline', 'body_text', 'button_text', 'button_link'];

export default function Content() {
  const { orgId } = useTenant();
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState('homepage');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  const { data: allSections = [], isLoading } = useQuery({
    queryKey: ['website-content', orgId],
    queryFn: () => fetchAllWebsiteContent(orgId),
    enabled: !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: number; content: Record<string, string> }) =>
      updateWebsiteSection(sectionId, content),
    onSuccess: (_, { sectionId }) => {
      queryClient.invalidateQueries({ queryKey: ['website-content', orgId] });
      setSaveStatus(s => ({ ...s, [sectionId]: 'saved' }));
      setEditingSection(null);
      setTimeout(() => setSaveStatus(s => ({ ...s, [sectionId]: 'idle' })), 2000);
    },
    onError: (_, { sectionId }) => {
      setSaveStatus(s => ({ ...s, [sectionId]: 'error' }));
    },
  });

  const pageSections = allSections.filter(
    (s: any) => s.page_slug === selectedPage || s.page_slug === 'global'
  );

  const handleEdit = (section: any) => {
    const values: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(f => { values[f] = section[f] || ''; });
    setEditValues(values);
    setEditingSection(section.section_key);
  };

  const handleSave = (section: any) => {
    setSaveStatus(s => ({ ...s, [section.id]: 'saving' }));
    saveMutation.mutate({ sectionId: section.id, content: editValues });
  };

  if (isLoading) {
    return <Layout><div className="p-8">Loading content...</div></Layout>;
  }

  return (
    <Layout>
      <div>
        <h1 className="text-3xl font-bold text-deep-taupe mb-6">Website Content</h1>

        {/* Page selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PAGES.map(page => (
            <button
              key={page}
              onClick={() => { setSelectedPage(page); setEditingSection(null); }}
              className={`px-4 py-2 rounded capitalize ${
                selectedPage === page ? 'bg-warm-brown text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {pageSections.length === 0 && (
          <div className="bg-white p-6 rounded-lg shadow text-gray-500">
            No content sections found for this page.
          </div>
        )}

        <div className="space-y-4">
          {pageSections.map((section: any) => {
            const isEditing = editingSection === section.section_key;
            const status = saveStatus[section.id] || 'idle';

            return (
              <div key={section.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-semibold text-lg text-deep-taupe capitalize">
                    {section.section_key.replace(/_/g, ' ')}
                    <span className="ml-2 text-xs text-gray-400">({section.page_slug})</span>
                  </h2>
                  {!isEditing ? (
                    <button
                      onClick={() => handleEdit(section)}
                      className="text-warm-brown hover:underline text-sm"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(section)}
                        disabled={status === 'saving'}
                        className="bg-warm-brown text-white px-4 py-1 rounded text-sm hover:bg-opacity-90 disabled:opacity-50"
                      >
                        {status === 'saving' ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="bg-gray-200 text-gray-700 px-4 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {status === 'saved' && (
                  <p className="text-green-600 text-sm mb-2">Saved successfully!</p>
                )}
                {status === 'error' && (
                  <p className="text-red-600 text-sm mb-2">Error saving. Please try again.</p>
                )}

                {isEditing ? (
                  <div className="space-y-3">
                    {EDITABLE_FIELDS.map(field => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-600 mb-1 capitalize">
                          {field.replace(/_/g, ' ')}
                        </label>
                        {field === 'body_text' ? (
                          <textarea
                            value={editValues[field]}
                            onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                            rows={4}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                        ) : (
                          <input
                            type="text"
                            value={editValues[field]}
                            onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <dl className="space-y-1">
                    {EDITABLE_FIELDS.map(field => section[field] ? (
                      <div key={field} className="flex gap-2 text-sm">
                        <dt className="text-gray-500 capitalize min-w-28">{field.replace(/_/g, ' ')}:</dt>
                        <dd className="text-gray-800 truncate">{section[field]}</dd>
                      </div>
                    ) : null)}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
