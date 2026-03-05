import { useState, useEffect } from 'react';

interface PawsAnimalFormProps {
  animal: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function PawsAnimalForm({ animal, onSave, onCancel }: PawsAnimalFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(animal || {});

  useEffect(() => {
    if (animal) {
      setFormData(animal);
    }
  }, [animal]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'background', label: 'Background & Foster' },
    { id: 'health', label: 'Health & Medical' },
    { id: 'vaccinations', label: 'Vaccinations' },
    { id: 'adoption', label: 'Adoption Details' },
    { id: 'images', label: 'Images & Files' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-deep-taupe">
            {animal ? 'Edit Puppy' : 'Add New Puppy'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code || ''}
                    onChange={(e) => handleChange('code', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dog ID
                  </label>
                  <input
                    type="text"
                    value={formData.dog_id || ''}
                    onChange={(e) => handleChange('dog_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
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
                    Pup's New Name
                  </label>
                  <input
                    type="text"
                    value={formData.pups_new_name || ''}
                    onChange={(e) => handleChange('pups_new_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    Breed
                  </label>
                  <input
                    type="text"
                    value={formData.breed || ''}
                    onChange={(e) => handleChange('breed', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Size When Grown
                  </label>
                  <select
                    value={formData.estimated_size_when_grown || ''}
                    onChange={(e) => handleChange('estimated_size_when_grown', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    <option value="Medium: 25-50 lbs">Medium: 25-50 lbs</option>
                    <option value="Large: 50-80 lbs">Large: 50-80 lbs</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pup Birthday
                  </label>
                  <input
                    type="date"
                    value={formData.pup_birthday?.split('T')[0] || ''}
                    onChange={(e) => handleChange('pup_birthday', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age (weeks)
                  </label>
                  <input
                    type="number"
                    value={formData.pup_is_currently_this_many_weeks_old || ''}
                    onChange={(e) =>
                      handleChange('pup_is_currently_this_many_weeks_old', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intake Date
                  </label>
                  <input
                    type="date"
                    value={formData.intake_date?.split('T')[0] || ''}
                    onChange={(e) => handleChange('intake_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
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
                    Chip Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.chip_manufacturer || ''}
                    onChange={(e) => handleChange('chip_manufacturer', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Status
                  </label>
                  <select
                    value={formData.entry_status || ''}
                    onChange={(e) => handleChange('entry_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Select...</option>
                    <option value="New">New</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Available">Available</option>
                    <option value="Adopted">Adopted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Markings
                </label>
                <textarea
                  value={formData.markings || ''}
                  onChange={(e) => handleChange('markings', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  My Story
                </label>
                <textarea
                  value={formData.my_story || ''}
                  onChange={(e) => handleChange('my_story', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          {/* Background & Foster Tab */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Background & Foster Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.born_in_our_care || false}
                    onChange={(e) => handleChange('born_in_our_care', e.target.checked)}
                    className="mr-2"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Born in our care?
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acquired From
                  </label>
                  <input
                    type="text"
                    value={formData.acquired_from || ''}
                    onChange={(e) => handleChange('acquired_from', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Located
                  </label>
                  <input
                    type="text"
                    value={formData.located || ''}
                    onChange={(e) => handleChange('located', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Who is Fostering
                  </label>
                  <input
                    type="text"
                    value={formData.who_is_fostering || ''}
                    onChange={(e) => handleChange('who_is_fostering', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foster's Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.fosters_phone_number || ''}
                    onChange={(e) => handleChange('fosters_phone_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foster's Address
                  </label>
                  <input
                    type="text"
                    value={formData.fosters_address || ''}
                    onChange={(e) => handleChange('fosters_address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {formData.born_in_our_care && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={formData.mothers_name || ''}
                        onChange={(e) => handleChange('mothers_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Males in Litter
                      </label>
                      <input
                        type="number"
                        value={formData.males_in_litter || ''}
                        onChange={(e) => handleChange('males_in_litter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Females in Litter
                      </label>
                      <input
                        type="number"
                        value={formData.females_in_litter || ''}
                        onChange={(e) => handleChange('females_in_litter', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Health & Medical Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Health & Medical Information</h3>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  checked={formData.has_an_illness || false}
                  onChange={(e) => handleChange('has_an_illness', e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm font-medium text-gray-700">
                  Has an illness?
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Medical Details
                </label>
                <textarea
                  value={formData.additional_medical_details || ''}
                  onChange={(e) => handleChange('additional_medical_details', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Spay/Neuter Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Spay/Neuter Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_dog_fixed || false}
                      onChange={(e) => handleChange('is_dog_fixed', e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Is dog fixed?
                    </label>
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
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reason for Delay in Spaying/Neutering
                    </label>
                    <textarea
                      value={formData.reason_for_delay_in_spaying_neutering || ''}
                      onChange={(e) =>
                        handleChange('reason_for_delay_in_spaying_neutering', e.target.value)
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Weight Log Section */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Weight Log</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 5, 6, 7, 8].map((num) => (
                    <div key={num} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Weight Entry #{num}
                      </label>
                      <input
                        type="date"
                        value={formData[`weight_log_date_of_weight_${num}`]?.split('T')[0] || ''}
                        onChange={(e) =>
                          handleChange(`weight_log_date_of_weight_${num}`, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Date"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={formData[`weight_log_weight_${num}`] || ''}
                        onChange={(e) =>
                          handleChange(`weight_log_weight_${num}`, e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Weight (lbs)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Vaccinations Tab */}
          {activeTab === 'vaccinations' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Vaccination Records</h3>

              {/* Bordatella */}
              <div className="border p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Bordatella</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.vaccinations_bordatella || false}
                      onChange={(e) =>
                        handleChange('vaccinations_bordatella', e.target.checked)
                      }
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Administered
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Administered
                    </label>
                    <input
                      type="date"
                      value={
                        formData.vaccinations_bordatella_date_administered?.split('T')[0] || ''
                      }
                      onChange={(e) =>
                        handleChange('vaccinations_bordatella_date_administered', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Administered At
                    </label>
                    <input
                      type="text"
                      value={formData.vaccinations_bordatella_administered_at || ''}
                      onChange={(e) =>
                        handleChange('vaccinations_bordatella_administered_at', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* DAPP Series */}
              {[1, 2, 3].map((num) => (
                <div key={num} className="border p-4 rounded-lg">
                  <h4 className="font-semibold mb-3">DAPP {num}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData[`vaccinations_dapp_${num}`] || false}
                        onChange={(e) =>
                          handleChange(`vaccinations_dapp_${num}`, e.target.checked)
                        }
                        className="mr-2"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Administered
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Administered
                      </label>
                      <input
                        type="date"
                        value={
                          formData[`vaccinations_dapp_${num}_date_administered`]?.split('T')[0] ||
                          ''
                        }
                        onChange={(e) =>
                          handleChange(
                            `vaccinations_dapp_${num}_date_administered`,
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Administered At
                      </label>
                      <input
                        type="text"
                        value={formData[`vaccinations_dapp_${num}_administered_at`] || ''}
                        onChange={(e) =>
                          handleChange(
                            `vaccinations_dapp_${num}_administered_at`,
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Rabies */}
              <div className="border p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Rabies</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.vaccinations_rabies || false}
                      onChange={(e) => handleChange('vaccinations_rabies', e.target.checked)}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Administered
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Administered
                    </label>
                    <input
                      type="date"
                      value={
                        formData.vaccinations_rabies_date_administered?.split('T')[0] || ''
                      }
                      onChange={(e) =>
                        handleChange('vaccinations_rabies_date_administered', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Administered At
                    </label>
                    <input
                      type="text"
                      value={formData.vaccinations_rabies_administered_at || ''}
                      onChange={(e) =>
                        handleChange('vaccinations_rabies_administered_at', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Adoption Details Tab */}
          {activeTab === 'adoption' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">Adoption Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adopter Name
                  </label>
                  <input
                    type="text"
                    value={formData.puppy_placement_name || ''}
                    onChange={(e) => handleChange('puppy_placement_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adopter Email
                  </label>
                  <input
                    type="email"
                    value={formData.puppy_placement_about_you_2_email || ''}
                    onChange={(e) =>
                      handleChange('puppy_placement_about_you_2_email', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adoption Fee
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.puppy_placement_adoption_fee || ''}
                    onChange={(e) => handleChange('puppy_placement_adoption_fee', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <input
                    type="text"
                    value={formData.puppy_placement_payment_method || ''}
                    onChange={(e) =>
                      handleChange('puppy_placement_payment_method', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adoption Date
                  </label>
                  <input
                    type="date"
                    value={formData.puppy_placement_adoption_date?.split('T')[0] || ''}
                    onChange={(e) =>
                      handleChange('puppy_placement_adoption_date', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Signature
                  </label>
                  <input
                    type="text"
                    value={formData.adoption_contract_signature || ''}
                    onChange={(e) =>
                      handleChange('adoption_contract_signature', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Private Notes
                </label>
                <textarea
                  value={formData.puppy_placement_private_notes || ''}
                  onChange={(e) =>
                    handleChange('puppy_placement_private_notes', e.target.value)
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Adoption Contract Checkboxes */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Adoption Contract Agreements</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'vaccinations', label: 'Vaccinations' },
                    { key: 'veterinary_approval', label: 'Veterinary Approval' },
                    { key: 'shelter', label: 'Shelter' },
                    { key: 'health', label: 'Health' },
                    { key: 'financial_responsibility', label: 'Financial Responsibility' },
                    { key: 'microchip', label: 'Microchip' },
                    { key: 'bathing', label: 'Bathing' },
                    { key: 'introductions', label: 'Introductions' },
                    { key: 'food', label: 'Food' },
                    { key: 'treats', label: 'Treats' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData[`adoption_contract_${item.key}`] || false}
                        onChange={(e) =>
                          handleChange(`adoption_contract_${item.key}`, e.target.checked)
                        }
                        className="mr-2"
                      />
                      <label className="text-sm text-gray-700">{item.label}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Images & Files</h3>
              <p className="text-sm text-gray-600 mb-4">
                Note: Image upload functionality requires additional file upload integration.
                For now, you can manage images through the Xano dashboard.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Main Image URL
                  </label>
                  <input
                    type="text"
                    value={formData.main_image?.url || ''}
                    onChange={(e) =>
                      handleChange('main_image', { ...formData.main_image, url: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="https://..."
                  />
                </div>

                {[1, 2, 3, 4].map((num) => (
                  <div key={num}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Image {num} URL
                    </label>
                    <input
                      type="text"
                      value={formData[`additional_image_${num}`]?.url || ''}
                      onChange={(e) =>
                        handleChange(`additional_image_${num}`, {
                          ...formData[`additional_image_${num}`],
                          url: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="https://..."
                    />
                  </div>
                ))}
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
              {animal ? 'Update Puppy' : 'Create Puppy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
