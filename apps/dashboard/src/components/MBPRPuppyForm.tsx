import { useState, useEffect } from 'react';

interface MBPRPuppyFormProps {
  puppy: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function MBPRPuppyForm({ puppy, onSave, onCancel }: MBPRPuppyFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(puppy || {});

  useEffect(() => {
    if (puppy) {
      setFormData(puppy);
    }
  }, [puppy]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addMedicalNote = () => {
    const notes = formData.medical_notes || [];
    handleChange('medical_notes', [...notes, { date: new Date().toISOString().split('T')[0], note: '', files: [] }]);
  };

  const updateMedicalNote = (index: number, field: string, value: any) => {
    const notes = [...(formData.medical_notes || [])];
    notes[index] = { ...notes[index], [field]: value };
    handleChange('medical_notes', notes);
  };

  const removeMedicalNote = (index: number) => {
    const notes = [...(formData.medical_notes || [])];
    notes.splice(index, 1);
    handleChange('medical_notes', notes);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'background', label: 'Breed & Background' },
    { id: 'story', label: 'Story & Photos' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-deep-taupe">
            {puppy ? 'Edit Puppy' : 'Add New Puppy'}
          </h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-warm-brown text-warm-brown'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INTERNAL FIELDS */}
                <div className="md:col-span-2">
                  <p className="text-sm text-red-600 mb-2">Internal Fields (Not shown on website)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">
                    Code/Status *
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="Available">Available</option>
                    <option value="Pending">Pending</option>
                    <option value="Adopted">Adopted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">
                    MBPR Internal ID (e.g., Jan25-1)
                  </label>
                  <input
                    type="text"
                    value={formData.mbpr_internal_id || ''}
                    onChange={(e) => handleChange('mbpr_internal_id', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md"
                    placeholder="Jan25-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">
                    Is the dog fixed?
                  </label>
                  <select
                    value={formData.is_fixed === true ? 'yes' : formData.is_fixed === false ? 'no' : ''}
                    onChange={(e) => handleChange('is_fixed', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : null)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md"
                  >
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">
                    Estimated Adoption Date
                  </label>
                  <input
                    type="date"
                    value={formData.estimated_adoption_date?.split('T')[0] || ''}
                    onChange={(e) => handleChange('estimated_adoption_date', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-red-600 mb-1">
                    Pup's New Name (from owner)
                  </label>
                  <input
                    type="text"
                    value={formData.pups_new_name_from_owner || ''}
                    onChange={(e) => handleChange('pups_new_name_from_owner', e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md"
                  />
                </div>

                {/* PUBLIC FIELDS */}
                <div className="md:col-span-2 mt-4">
                  <p className="text-sm text-gray-600 mb-2">Public Fields (Shown on website)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dog Name *
                  </label>
                  <input
                    type="text"
                    value={formData.dog_name || ''}
                    onChange={(e) => handleChange('dog_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Litter Name
                  </label>
                  <input
                    type="text"
                    value={formData.litter_name || ''}
                    onChange={(e) => handleChange('litter_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={formData.birthday?.split('T')[0] || ''}
                    onChange={(e) => handleChange('birthday', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.birthday_is_estimated || false}
                    onChange={(e) => handleChange('birthday_is_estimated', e.target.checked)}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Birthday is Estimated
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Microchip Number
                  </label>
                  <input
                    type="text"
                    value={formData.microchip_number || ''}
                    onChange={(e) => handleChange('microchip_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Microchip Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.microchip_manufacturer || ''}
                    onChange={(e) => handleChange('microchip_manufacturer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Background & Breed Tab */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Breed, Background & Medical</h3>

              {/* Breed Section */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-700">Breed (for Petfinder)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Breed
                    </label>
                    <input
                      type="text"
                      value={formData.breed_primary || ''}
                      onChange={(e) => handleChange('breed_primary', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Husky"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Breed
                    </label>
                    <input
                      type="text"
                      value={formData.breed_secondary || ''}
                      onChange={(e) => handleChange('breed_secondary', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Cattle Dog"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mixed/Other
                    </label>
                    <input
                      type="text"
                      value={formData.breed_mix || ''}
                      onChange={(e) => handleChange('breed_mix', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Mixed mutt"
                    />
                  </div>
                </div>
              </div>

              {/* Markings */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-700">Markings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coat Color
                    </label>
                    <input
                      type="text"
                      value={formData.coat_color || ''}
                      onChange={(e) => handleChange('coat_color', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Eye Color
                    </label>
                    <input
                      type="text"
                      value={formData.eye_color || ''}
                      onChange={(e) => handleChange('eye_color', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coat Type
                    </label>
                    <input
                      type="text"
                      value={formData.coat_type || ''}
                      onChange={(e) => handleChange('coat_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Short, Long, Curly"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grooming Maintenance
                    </label>
                    <input
                      type="text"
                      value={formData.grooming_maintenance || ''}
                      onChange={(e) => handleChange('grooming_maintenance', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g., Low, Medium, High"
                    />
                  </div>
                </div>
              </div>

              {/* Temperament */}
              <div>
                <h4 className="font-semibold mb-3 text-gray-700">Temperament</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Good with Kids?
                    </label>
                    <input
                      type="text"
                      value={formData.temperament_good_with_kids || ''}
                      onChange={(e) => handleChange('temperament_good_with_kids', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Good with Dogs?
                    </label>
                    <input
                      type="text"
                      value={formData.temperament_good_with_dogs || ''}
                      onChange={(e) => handleChange('temperament_good_with_dogs', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Good with Cats?
                    </label>
                    <input
                      type="text"
                      value={formData.temperament_good_with_cats || ''}
                      onChange={(e) => handleChange('temperament_good_with_cats', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Temperament Notes
                  </label>
                  <textarea
                    value={formData.temperament_notes || ''}
                    onChange={(e) => handleChange('temperament_notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Adult Size
                </label>
                <select
                  value={formData.estimated_adult_size || ''}
                  onChange={(e) => handleChange('estimated_adult_size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select...</option>
                  <option value="Small: 0-25 lbs">Small: 0-25 lbs</option>
                  <option value="Medium: 25-50 lbs">Medium: 25-50 lbs</option>
                  <option value="Large: 50-80 lbs">Large: 50-80 lbs</option>
                  <option value="Extra Large: 80+ lbs">Extra Large: 80+ lbs</option>
                </select>
              </div>

              {/* INTERNAL BACKGROUND FIELDS */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3 text-red-600">Background/History (Internal)</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Orphan or Mother?
                    </label>
                    <input
                      type="text"
                      value={formData.orphan_or_mother || ''}
                      onChange={(e) => handleChange('orphan_or_mother', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Mother's Name (if applicable)
                    </label>
                    <input
                      type="text"
                      value={formData.mothers_name || ''}
                      onChange={(e) => handleChange('mothers_name', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Acquired From
                    </label>
                    <input
                      type="text"
                      value={formData.acquired_from || ''}
                      onChange={(e) => handleChange('acquired_from', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Dog's Original Name (from shelter)
                    </label>
                    <input
                      type="text"
                      value={formData.dogs_original_name_from_shelter || ''}
                      onChange={(e) => handleChange('dogs_original_name_from_shelter', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-red-600 mb-1">
                      Shelter ID Info
                    </label>
                    <input
                      type="text"
                      value={formData.shelter_id_info || ''}
                      onChange={(e) => handleChange('shelter_id_info', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_with_foster || false}
                      onChange={(e) => handleChange('is_with_foster', e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-red-600">
                      Is with a foster?
                    </label>
                  </div>
                  {formData.is_with_foster && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-red-600 mb-1">
                          Foster Name
                        </label>
                        <input
                          type="text"
                          value={formData.foster_name || ''}
                          onChange={(e) => handleChange('foster_name', e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-red-600 mb-1">
                          Foster Contact Info
                        </label>
                        <input
                          type="text"
                          value={formData.foster_contact_info || ''}
                          onChange={(e) => handleChange('foster_contact_info', e.target.value)}
                          className="w-full px-3 py-2 border border-red-300 rounded-md"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Medical Notes */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-700">Medical Notes (Public)</h4>
                  <button
                    type="button"
                    onClick={addMedicalNote}
                    className="text-sm bg-warm-brown text-white px-3 py-1 rounded hover:bg-opacity-90"
                  >
                    + Add Note
                  </button>
                </div>
                {(formData.medical_notes || []).map((note: any, index: number) => (
                  <div key={index} className="border p-3 rounded mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={note.date || ''}
                          onChange={(e) => updateMedicalNote(index, 'date', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Note
                        </label>
                        <textarea
                          value={note.note || ''}
                          onChange={(e) => updateMedicalNote(index, 'note', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedicalNote(index)}
                      className="text-xs text-red-600 hover:underline mt-2"
                    >
                      Remove Note
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Story & Photos Tab */}
          {activeTab === 'story' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Story, Vaccinations & Photos</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dog's Story
                </label>
                <textarea
                  value={formData.dog_story || ''}
                  onChange={(e) => handleChange('dog_story', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Tell this puppy's story..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vaccination Info
                  </label>
                  <textarea
                    value={formData.vaccination_info || ''}
                    onChange={(e) => handleChange('vaccination_info', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="List vaccinations..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spay/Neuter Date
                  </label>
                  <input
                    type="date"
                    value={formData.spay_neuter_date?.split('T')[0] || ''}
                    onChange={(e) => handleChange('spay_neuter_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    File upload for spay/neuter certificate can be added later
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adoption Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.adoption_fee || ''}
                    onChange={(e) => handleChange('adoption_fee', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Photos */}
              <div>
                <h4 className="font-semibold mb-3">Photos (Max 5)</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Note: Direct image upload requires additional integration. For now, images can be managed through Xano dashboard.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <div key={num}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Photo {num} URL
                      </label>
                      <input
                        type="url"
                        value={formData[`photo_${num}`]?.url || ''}
                        onChange={(e) =>
                          handleChange(`photo_${num}`, { ...formData[`photo_${num}`], url: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      YouTube Video URL
                    </label>
                    <input
                      type="url"
                      value={formData.youtube_video_url || ''}
                      onChange={(e) => handleChange('youtube_video_url', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Owner Photo URL
                    </label>
                    <input
                      type="url"
                      value={formData.owner_photo?.url || ''}
                      onChange={(e) =>
                        handleChange('owner_photo', { ...formData.owner_photo, url: e.target.value })
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-warm-brown text-white rounded-md hover:bg-opacity-90"
            >
              {puppy ? 'Update Puppy' : 'Create Puppy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
