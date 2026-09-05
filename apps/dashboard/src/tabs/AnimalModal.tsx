import { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import ImageUpload from '../components/ImageUpload';
import { type Animal } from '../lib/api';
import { uploadImage } from '../lib/upload';
import { supabase } from '../lib/supabase';

interface AnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Animal>) => Promise<void>;
  animal: Animal | null;
  orgId: number;
  isMBPR?: boolean;
}

const STATUS_OPTIONS = [
  'Available', 'Published', 'Pending', 'Adopted', 'Medical', 'Hold',
  'Foster', 'Returned', 'Deceased',
];

type ImageField = 'image_url' | 'additional_image_1' | 'additional_image_2' | 'additional_image_3' | 'additional_image_4';

export default function AnimalModal({ isOpen, onClose, onSave, animal, orgId, isMBPR = false }: AnimalModalProps) {
  const isEditing = !!animal;

  const defaultForm: Partial<Animal> = {
    name: '', species: 'Dog', breed: '', age: '', gender: '', size: '',
    weight: '', status: 'Available', intake_date: '', adoption_fee: undefined,
    description: '', image_url: '',
    special_needs: false,
    good_with_kids: false, good_with_cats: false,
    good_with_dogs: false, spayed_neutered: false, vaccinated: false, microchip: false,
  };

  const [form, setForm] = useState<Partial<Animal>>(defaultForm);
  const [imageFiles, setImageFiles] = useState<Partial<Record<ImageField, File | null>>>({});
  const [vetFiles, setVetFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const vetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (animal) {
      setForm({ ...animal });
    } else {
      setForm(defaultForm);
    }
    setImageFiles({});
    setVetFiles(null);
    setError('');
    setSuccess('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal, isOpen]);

  const handleChange = (field: keyof Animal, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: ImageField, file: File | null) => {
    setImageFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!form.name?.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form };

      // Upload main + additional images
      // NOTE: Make sure animals table has photo_url column:
      // ALTER TABLE animals ADD COLUMN IF NOT EXISTS photo_url text;
      const fields: ImageField[] = ['image_url', 'additional_image_1', 'additional_image_2', 'additional_image_3', 'additional_image_4'];
      for (const field of fields) {
        const file = imageFiles[field];
        if (file) {
          const animalId = animal?.id;
          console.log(`Starting upload for animal ${animalId ?? 'new'}, field: ${field}`);
          const url = await uploadImage(file, 'animals', orgId);
          console.log('Upload response:', url);
          (data as Record<string, unknown>)[field] = url;
          // Update form preview immediately
          handleChange(field as keyof Animal, url);
          // For main image, also save to photo_url column if it exists.
          // Run in Supabase SQL Editor if needed:
          // ALTER TABLE animals ADD COLUMN IF NOT EXISTS photo_url text;
          if (field === 'image_url' && animalId) {
            console.log('Saving photo_url to animals table:', url);
            supabase.from('animals').update({ photo_url: url }).eq('id', animalId).select().then(
              ({ data, error }) => {
                console.log('Photo save data:', data);
                console.log('Photo save error:', JSON.stringify(error));
              }
            );
          }
        }
      }

      // Remove photo_url — not a standard animals column.
      delete (data as Record<string, unknown>)['photo_url'];

      // Normalize any { url: '...' } object fields to plain strings.
      // additional_image_* and new_owner_photo may arrive from the DB as objects;
      // Supabase returns 400 if you PATCH a text column with a JS object.
      const objectImageFields = [
        'additional_image_1', 'additional_image_2',
        'additional_image_3', 'additional_image_4',
        'new_owner_photo',
      ] as const;
      for (const f of objectImageFields) {
        const v = (data as Record<string, unknown>)[f];
        if (v !== null && v !== undefined && typeof v === 'object') {
          (data as Record<string, unknown>)[f] = (v as { url?: string }).url ?? null;
        }
      }

      await onSave(data);
      setSuccess(isEditing ? 'Animal updated!' : 'Animal added!');
      setTimeout(() => { onClose(); }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save animal.');
    } finally {
      setSaving(false);
    }
  };

  const imageUrl = (field: ImageField): string => {
    const val = form[field];
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && 'url' in val) return (val as { url?: string }).url ?? '';
    return '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit – ${animal?.name}` : 'Add New Animal'}
      size="xl"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="px-6 py-2 text-sm font-semibold bg-warm-brown text-white rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEditing ? 'Update' : 'Add Animal'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        {success && <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3">{success}</p>}

        {/* Core info */}
        <section>
          <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name *">
              <input className={inputCls} value={form.name ?? ''} onChange={(e) => handleChange('name', e.target.value)} />
            </Field>
            <Field label="Species *">
              <select className={inputCls} value={form.species ?? 'Dog'} onChange={(e) => handleChange('species', e.target.value)}>
                {['Dog', 'Cat', 'Rabbit', 'Bird', 'Other'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Breed">
              <input className={inputCls} value={form.breed ?? ''} onChange={(e) => handleChange('breed', e.target.value)} />
            </Field>
            <Field label="Age">
              <input className={inputCls} value={form.age ?? ''} onChange={(e) => handleChange('age', e.target.value)} placeholder="e.g. 2 years" />
            </Field>
            <Field label="Gender">
              <select className={inputCls} value={form.gender ?? ''} onChange={(e) => handleChange('gender', e.target.value)}>
                <option value="">Unknown</option>
                <option>Male</option>
                <option>Female</option>
              </select>
            </Field>
            <Field label="Size">
              <select className={inputCls} value={form.size ?? ''} onChange={(e) => handleChange('size', e.target.value)}>
                <option value="">Unknown</option>
                {['Small', 'Medium', 'Large', 'XLarge'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Weight (lbs)">
              <input className={inputCls} value={form.weight ?? ''} onChange={(e) => handleChange('weight', e.target.value)} />
            </Field>
            <Field label="Status *">
              <select className={inputCls} value={form.status ?? 'Available'} onChange={(e) => handleChange('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Intake Date">
              <input type="date" className={inputCls} value={form.intake_date ?? ''} onChange={(e) => handleChange('intake_date', e.target.value)} />
            </Field>
            <Field label="Adoption Fee ($)">
              <input type="number" className={inputCls} value={form.adoption_fee ?? ''} onChange={(e) => handleChange('adoption_fee', parseFloat(e.target.value) || undefined)} />
            </Field>
          </div>
          <div className="mt-4 space-y-3">
            <Field label="Description">
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={form.description ?? ''}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </Field>
            <Field label="Special Needs">
              <textarea
                className={`${inputCls} min-h-[60px] resize-y`}
                value={typeof form.special_needs === 'string' ? form.special_needs : (form.special_needs ? 'Yes' : '')}
                onChange={(e) => handleChange('special_needs', e.target.value)}
                placeholder="Describe any special needs, medical conditions, or care requirements…"
              />
            </Field>
          </div>
        </section>

        {/* Checkboxes */}
        <section>
          <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3">Traits &amp; Medical</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              ['good_with_kids', 'Good with Kids'],
              ['good_with_cats', 'Good with Cats'],
              ['good_with_dogs', 'Good with Dogs'],
              ['spayed_neutered', 'Spayed/Neutered'],
              ['vaccinated', 'Vaccinated'],
              ['microchip', 'Microchipped'],
            ] as [keyof Animal, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!(form[key] as boolean)}
                  onChange={(e) => handleChange(key, e.target.checked)}
                  className="w-4 h-4 accent-warm-brown"
                />
                <span className="text-deep-taupe">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Images */}
        <section>
          <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3">Images</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ImageUpload
              label="Main Photo"
              currentUrl={imageUrl('image_url')}
              onUrlChange={(url) => handleChange('image_url', url)}
              onFileChange={(f) => handleFileChange('image_url', f)}
            />
            {(['additional_image_1', 'additional_image_2', 'additional_image_3', 'additional_image_4'] as ImageField[]).map((field, i) => (
              <ImageUpload
                key={field}
                label={`Photo ${i + 2}`}
                currentUrl={imageUrl(field)}
                onUrlChange={(url) => handleChange(field as keyof Animal, url)}
                onFileChange={(f) => handleFileChange(field, f)}
              />
            ))}
          </div>
        </section>

        {/* MBPR Internal Use */}
        {isMBPR && (
          <section>
            <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3 pt-2 border-t border-silver-gray">
              MBPR — Internal Use
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="MBPR Internal ID">
                <input className={inputCls} value={form.mbpr_internal_id ?? ''} onChange={(e) => handleChange('mbpr_internal_id', e.target.value)} />
              </Field>
              <Field label="Est. Adoption Date">
                <input type="date" className={inputCls} value={form.estimated_adoption_date ?? ''} onChange={(e) => handleChange('estimated_adoption_date', e.target.value)} />
              </Field>
              <Field label="New Name (post-adoption)">
                <input className={inputCls} value={form.new_name ?? ''} onChange={(e) => handleChange('new_name', e.target.value)} />
              </Field>
              <Field label="Acquired From">
                <input className={inputCls} value={form.acquired_from ?? ''} onChange={(e) => handleChange('acquired_from', e.target.value)} />
              </Field>
              <Field label="Acquired From — Original Name">
                <input className={inputCls} value={form.acquired_from_original_name ?? ''} onChange={(e) => handleChange('acquired_from_original_name', e.target.value)} />
              </Field>
              <Field label="Acquired From — Shelter ID">
                <input className={inputCls} value={form.acquired_from_shelter_id ?? ''} onChange={(e) => handleChange('acquired_from_shelter_id', e.target.value)} />
              </Field>
              <Field label="Foster Name">
                <input className={inputCls} value={form.foster_name ?? ''} onChange={(e) => handleChange('foster_name', e.target.value)} />
              </Field>
              <Field label="Foster Contact">
                <input className={inputCls} value={form.foster_contact ?? ''} onChange={(e) => handleChange('foster_contact', e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="New Owner Photo (URL)">
                <ImageUpload
                  label="New Owner Photo"
                  currentUrl={
                    typeof form.new_owner_photo === 'string'
                      ? form.new_owner_photo
                      : (form.new_owner_photo as { url?: string } | null)?.url ?? ''
                  }
                  onUrlChange={(url) => handleChange('new_owner_photo', url)}
                  onFileChange={() => {}}
                />
              </Field>
              <Field label="Vet File Uploads">
                <input
                  ref={vetInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setVetFiles(e.target.files)}
                  className="w-full border border-silver-gray rounded-lg px-3 py-2 text-sm bg-white"
                />
                {vetFiles && vetFiles.length > 0 && (
                  <p className="text-xs text-stone mt-1">{vetFiles.length} file(s) selected</p>
                )}
              </Field>
            </div>
          </section>
        )}

        {/* MBPR Public Information */}
        {isMBPR && (
          <section>
            <h3 className="text-sm font-semibold text-stone uppercase tracking-wider mb-3 pt-2 border-t border-silver-gray">
              MBPR — Public Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Breed Primary">
                <input className={inputCls} value={form.breed_primary ?? ''} onChange={(e) => handleChange('breed_primary', e.target.value)} />
              </Field>
              <Field label="Breed Secondary">
                <input className={inputCls} value={form.breed_secondary ?? ''} onChange={(e) => handleChange('breed_secondary', e.target.value)} />
              </Field>
              <Field label="Breed Third">
                <input className={inputCls} value={form.breed_third ?? ''} onChange={(e) => handleChange('breed_third', e.target.value)} />
              </Field>
              <Field label="Markings — Color">
                <input className={inputCls} value={form.markings_color ?? ''} onChange={(e) => handleChange('markings_color', e.target.value)} />
              </Field>
              <Field label="Markings — Coat">
                <input className={inputCls} value={form.markings_coat ?? ''} onChange={(e) => handleChange('markings_coat', e.target.value)} />
              </Field>
              <Field label="Markings — Eye Color">
                <input className={inputCls} value={form.markings_eye_color ?? ''} onChange={(e) => handleChange('markings_eye_color', e.target.value)} />
              </Field>
              <Field label="Grooming">
                <input className={inputCls} value={form.grooming ?? ''} onChange={(e) => handleChange('grooming', e.target.value)} />
              </Field>
              <Field label="Orphan or Mother">
                <select className={inputCls} value={form.orphan_or_mother ?? ''} onChange={(e) => handleChange('orphan_or_mother', e.target.value)}>
                  <option value="">Unknown</option>
                  <option value="orphan">Orphan</option>
                  <option value="mother">Mother</option>
                </select>
              </Field>
              <Field label="Mother Name">
                <input className={inputCls} value={form.mother_name ?? ''} onChange={(e) => handleChange('mother_name', e.target.value)} />
              </Field>
              <Field label="YouTube Video URL">
                <input className={inputCls} value={form.youtube_video_url ?? ''} onChange={(e) => handleChange('youtube_video_url', e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Temperament">
                <textarea
                  className={`${inputCls} min-h-[60px] resize-y`}
                  value={form.temperament ?? ''}
                  onChange={(e) => handleChange('temperament', e.target.value)}
                  placeholder="Describe the animal's temperament…"
                />
              </Field>
            </div>
            <div className="mt-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.birthday_estimated}
                  onChange={(e) => handleChange('birthday_estimated', e.target.checked)}
                  className="w-4 h-4 accent-warm-brown"
                />
                <span className="text-deep-taupe">Birthday is estimated</span>
              </label>
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

const inputCls = 'w-full border border-silver-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white text-deep-taupe';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-stone uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
