/**
 * API Endpoint for Animal Management
 * Handles CRUD operations for animals via Xano
 */

// Xano Configuration
const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=600';

const XANO_CONFIG = {
    animalsUrl: import.meta.env.VITE_XANO_ANIMALS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:Od874PbA',
    token: import.meta.env.VITE_XANO_ANIMALS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ'
};

// Helper function to make Xano requests
async function makeXanoRequest(endpoint, options = {}) {
    const url = `${XANO_CONFIG.animalsUrl}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XANO_CONFIG.token}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (!response.ok) {
        let errorDetails = '';
        try {
            const errorBody = await response.json();
            errorDetails = JSON.stringify(errorBody);
        } catch (e) {
            errorDetails = await response.text();
        }
        const errorMsg = `Xano API error: ${response.status} ${response.statusText}. Details: ${errorDetails}`;
        console.error(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
    }

    try {
        return await response.json();
    } catch (e) {
        const responseText = await response.text();
        console.error('❌ Failed to parse Xano response as JSON:', responseText);
        throw new Error(`Failed to parse Xano response: ${e.message}`);
    }
}

// Helper function to normalize status values
function normalizeStatus(status) {
    if (!status) return 'Available';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('available')) return 'Available';
    if (statusLower.includes('adopted')) return 'Adopted';
    if (statusLower.includes('pending')) return 'Pending';
    if (statusLower.includes('medical')) return 'Medical';
    if (statusLower.includes('published')) return 'Published';

    return status; // Return original if no match
}

// Shared storage for fallback data
const sharedStorage = {
    animals: new Map()
};

// Helper function to get animals from shared storage
function getAnimals(orgId) {
    const orgAnimals = [];
    for (const [key, animal] of sharedStorage.animals) {
        if (animal.org === orgId) {
            orgAnimals.push(animal);
        }
    }
    return orgAnimals;
}

// GET - Fetch all animals for organization
export async function GET({ request }) {
    try {
        const url = new URL(request.url);
        const orgId = url.searchParams.get('orgId') || '9';
        
        let animals;
        try {
            // For org 9 (Mission Bay), fetch from dogs table with different schema
            if (orgId === '9') {
                const dogsData = await makeXanoRequest(`/dogs`);
                console.log('✅ Dogs fetched from Xano:', dogsData);
                console.log(`📊 Fetched ${dogsData.length} dogs from Xano`);

                // Map dogs data to animals format
                animals = dogsData.map(dog => ({
                    id: dog.id,
                    org: dog.org,
                    name: dog.Dog_Name,
                    litter_name: dog.Litter_Name || '',
                    species: 'dog',
                    breed: dog.Breed || '',
                    description: dog.My_Story || '',
                    status: normalizeStatus(dog.Code || 'Available'),
                    intake_date: dog.Intake_Date ? new Date(dog.Intake_Date).toISOString().split('T')[0] : null,
                    image_url: dog.main_image?.url || '',
                    updated_at: 0,
                    age: dog.Pup_is_currently_this_many_weeks_old ? Math.floor(dog.Pup_is_currently_this_many_weeks_old / 52) + ' years' : '',
                    gender: dog.Gender || '',
                    weight: dog.Estimated_Size_When_Grown || '',
                    color: dog.Markings || '',
                    created_at: dog.created_at || Date.now(),
                    size: dog.Estimated_Size_When_Grown?.includes('Large') ? 'Large' : 
                          dog.Estimated_Size_When_Grown?.includes('Medium') ? 'Medium' : 'Small',
                    images: {
                        main_image: dog.main_image,
                        additional_image_1: dog.additional_image_1,
                        additional_image_2: dog.additional_image_2,
                        additional_image_3: dog.additional_image_3,
                        additional_image_4: dog.additional_image_4
                    },
                    description_long: dog.My_Story || '',
                    location: '',
                    vaccinated: dog.Vaccinations === 'Yes',
                    spayed_neutered: dog.Is_Dog_Fixed || false,
                    microchip: dog.Microchip_Number ? true : false,
                    medical_notes: '',
                    special_needs: '',
                    house_trained: false,
                    energy_level: '',
                    good_with_kids: false,
                    org_description: '',
                    good_with_dogs: false,
                    good_with_cats: false,
                    training_notes: '',
                    playgroup_notes: '',
                    adoption_fee: 0,
                    adoption_fee_currency: '',
                    org_details: '',
                    is_featured: false,
                    priority: 0,
                    internal_notes: '',
                    meta_title: '',
                    meta_description: '',
                    main_image: dog.main_image,
                    additional_image_1: dog.additional_image_1,
                    additional_image_2: dog.additional_image_2,
                    additional_image_3: dog.additional_image_3,
                    additional_image_4: dog.additional_image_4
                }));
            } else {
                // For other orgs, use the standard animals endpoint
                animals = await makeXanoRequest(`/orgs/${orgId}/animals`);
                console.log('✅ Animals fetched from Xano:', animals);
            }

            // Populate shared storage as backup for fallback operations
            animals.forEach(animal => {
                sharedStorage.animals.set(animal.id, animal);
            });
            console.log(`💾 Cached ${animals.length} animals in shared storage for org ${orgId}`);
        } catch (xanoError) {
            console.warn('⚠️ Xano fetch failed, using shared storage:', xanoError.message);
            animals = getAnimals(orgId);
            if (animals.length === 0) {
                console.warn('⚠️ No animals found in shared storage for org:', orgId);
            }
        }
        
        return new Response(JSON.stringify(animals), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Cache-Control': CACHE_CONTROL_HEADER
            }
        });
    } catch (error) {
        console.error('Error in animals GET:', error);
        // Return fallback animals as last resort
        const orgId = new URL(request.url).searchParams.get('orgId') || '9';
        const fallbackAnimals = getAnimals(orgId);
        
        return new Response(JSON.stringify(fallbackAnimals), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': CACHE_CONTROL_HEADER
            }
        });
    }
}

// POST - Create new animal
export async function POST({ request }) {
    try {
        const body = await request.json();
        const { orgId = '9', ...animalData } = body;

        let newAnimal;
        try {
            // For org 9 (Mission Bay), create in dogs table with different schema
            if (orgId === '9') {
                // Helper function to map size to Xano format
                // Note: Xano only has 2 valid size options: "Medium: 25-50 lbs" and "Large: 50-80 lbs"
                const mapSizeToXanoFormat = (size) => {
                    const sizeMap = {
                        'Small': 'Medium: 25-50 lbs',        // Map Small to Medium since no Small option exists
                        'Medium': 'Medium: 25-50 lbs',
                        'Large': 'Large: 50-80 lbs',
                        'Extra Large': 'Large: 50-80 lbs'    // Map Extra Large to Large since no XL option exists
                    };
                    return sizeMap[size] || 'Medium: 25-50 lbs'; // Default to Medium if unknown
                };

                // Map admin data to dogs table schema
                const dogData = {
                    org: orgId,
                    Dog_Name: animalData.name,
                    Litter_Name: animalData.litter_name || '',
                    Breed: animalData.breed || '',
                    My_Story: animalData.description || '',
                    Code: animalData.status || 'Available',
                    Intake_Date: animalData.intake_date || null,
                    Gender: animalData.gender || '',
                    Estimated_Size_When_Grown: mapSizeToXanoFormat(animalData.weight || animalData.size || ''),
                    Markings: animalData.color || '',
                    Vaccinations: animalData.vaccinated ? 'Yes' : 'No',
                    Is_Dog_Fixed: animalData.spayed_neutered || false,
                    Microchip_Number: animalData.microchip ? 'Yes' : '',
                    // Handle age conversion (convert years to weeks if needed)
                    Pup_is_currently_this_many_weeks_old: animalData.age ?
                        (typeof animalData.age === 'string' ?
                            parseInt(animalData.age.replace(/[^\d]/g, '')) * 52 :
                            animalData.age * 52) : null
                };

                // Only include main_image if it's an object (new upload) or if explicitly provided
                // Don't send image_url string to Xano as it expects a file object with path property
                if (animalData.main_image && typeof animalData.main_image === 'object') {
                    dogData.main_image = animalData.main_image;
                }

                // Remove null/undefined values
                Object.keys(dogData).forEach(key => {
                    if (dogData[key] === null || dogData[key] === undefined || dogData[key] === '') {
                        delete dogData[key];
                    }
                });

                console.log('Creating dog with data:', dogData);

                const createdDog = await makeXanoRequest(`/dogs`, {
                    method: 'POST',
                    body: JSON.stringify(dogData)
                });

                console.log('✅ Dog created in Xano:', createdDog);

                // Map back to animals format for response
                newAnimal = {
                    id: createdDog.id,
                    org: createdDog.org,
                    name: createdDog.Dog_Name,
                    litter_name: createdDog.Litter_Name || '',
                    species: 'dog',
                    breed: createdDog.Breed || '',
                    description: createdDog.My_Story || '',
                    status: normalizeStatus(createdDog.Code || 'Available'),
                    intake_date: createdDog.Intake_Date ? new Date(createdDog.Intake_Date).toISOString().split('T')[0] : null,
                    image_url: createdDog.main_image?.url || '',
                    updated_at: Date.now(),
                    age: createdDog.Pup_is_currently_this_many_weeks_old ? Math.floor(createdDog.Pup_is_currently_this_many_weeks_old / 52) + ' years' : '',
                    gender: createdDog.Gender || '',
                    weight: createdDog.Estimated_Size_When_Grown || '',
                    color: createdDog.Markings || '',
                    created_at: createdDog.created_at || Date.now(),
                    size: createdDog.Estimated_Size_When_Grown?.includes('Large') ? 'Large' :
                          createdDog.Estimated_Size_When_Grown?.includes('Medium') ? 'Medium' : 'Small',
                    vaccinated: createdDog.Vaccinations === 'Yes',
                    spayed_neutered: createdDog.Is_Dog_Fixed || false,
                    microchip: createdDog.Microchip_Number ? true : false
                };
            } else {
                // For other orgs, use the standard animals endpoint
                const dataWithOrg = {
                    ...animalData,
                    org_id: orgId
                };

                newAnimal = await makeXanoRequest(`/orgs/${orgId}/animals`, {
                    method: 'POST',
                    body: JSON.stringify(dataWithOrg)
                });
                console.log('✅ Animal created in Xano:', newAnimal);
            }
        } catch (xanoError) {
            console.warn('⚠️ Xano create failed, using shared storage:', xanoError.message);
            // Create animal in shared storage as fallback
            const newId = Date.now();
            newAnimal = {
                id: newId,
                org: orgId,
                created_at: Date.now(),
                updated_at: Date.now(),
                ...animalData
            };
            // Store with both numeric and string keys for consistency
            sharedStorage.animals.set(newId, newAnimal);
            sharedStorage.animals.set(newId.toString(), newAnimal);
            console.log(`💾 Created animal in shared storage with ID: ${newId}`);
        }

        return new Response(JSON.stringify(newAnimal), {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('💥 Error creating animal:', error);
        const errorMsg = error.message || 'Failed to create animal';
        return new Response(JSON.stringify({ error: errorMsg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// PUT - Update animal
export async function PUT({ request }) {
    try {
        const body = await request.json();
        const { id, orgId = '9', ...animalData } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: 'Animal ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`📝 PUT request received for animal ID: ${id}, orgId: ${orgId}`);
        console.log(`📦 Animal data to update:`, animalData);

        let updatedAnimal = null;
        try {
            // For org 9 (Mission Bay), update in dogs table with different schema
            if (orgId === '9') {
                console.log(`🐕 Updating dog with ID ${id} in Xano dogs table`);
                // Helper function to map size to Xano format
                // Note: Xano only has 2 valid size options: "Medium: 25-50 lbs" and "Large: 50-80 lbs"
                const mapSizeToXanoFormat = (size) => {
                    const sizeMap = {
                        'Small': 'Medium: 25-50 lbs',        // Map Small to Medium since no Small option exists
                        'Medium': 'Medium: 25-50 lbs',
                        'Large': 'Large: 50-80 lbs',
                        'Extra Large': 'Large: 50-80 lbs'    // Map Extra Large to Large since no XL option exists
                    };
                    return sizeMap[size] || 'Medium: 25-50 lbs'; // Default to Medium if unknown
                };

                // Map admin data back to dogs table schema
                const dogData = {
                    Dog_Name: animalData.name,
                    Litter_Name: animalData.litter_name || '',
                    Breed: animalData.breed || '',
                    My_Story: animalData.description || '',
                    Code: animalData.status || 'Available',
                    Intake_Date: animalData.intake_date || null,
                    Gender: animalData.gender || '',
                    Estimated_Size_When_Grown: mapSizeToXanoFormat(animalData.weight || animalData.size || ''),
                    Markings: animalData.color || '',
                    Vaccinations: animalData.vaccinated ? 'Yes' : 'No',
                    Is_Dog_Fixed: animalData.spayed_neutered || false,
                    Microchip_Number: animalData.microchip ? 'Yes' : '',
                    // Handle age conversion (convert years back to weeks if needed)
                    Pup_is_currently_this_many_weeks_old: animalData.age ?
                        (typeof animalData.age === 'string' ?
                            parseInt(animalData.age.replace(/[^\d]/g, '')) * 52 :
                            animalData.age * 52) : null
                };

                // Only include main_image if it's an object (new upload) or if explicitly provided
                // Don't send image_url string to Xano as it expects a file object with path property
                if (animalData.main_image && typeof animalData.main_image === 'object') {
                    dogData.main_image = animalData.main_image;
                }

                // Remove null/undefined values
                Object.keys(dogData).forEach(key => {
                    if (dogData[key] === null || dogData[key] === undefined || dogData[key] === '') {
                        delete dogData[key];
                    }
                });

                console.log('🔄 Cleaned dog data for update:', dogData);
                console.log(`🔗 Making PATCH request to /dogs/${id}`);

                const updatedDog = await makeXanoRequest(`/dogs/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(dogData)
                });

                console.log('✅ Dog updated successfully in Xano:', updatedDog);

                // Map back to animals format for response
                updatedAnimal = {
                    id: updatedDog.id,
                    org: updatedDog.org,
                    name: updatedDog.Dog_Name,
                    litter_name: updatedDog.Litter_Name || '',
                    species: 'dog',
                    breed: updatedDog.Breed || '',
                    description: updatedDog.My_Story || '',
                    status: normalizeStatus(updatedDog.Code || 'Available'),
                    intake_date: updatedDog.Intake_Date ? new Date(updatedDog.Intake_Date).toISOString().split('T')[0] : null,
                    image_url: updatedDog.main_image?.url || '',
                    updated_at: Date.now(),
                    age: updatedDog.Pup_is_currently_this_many_weeks_old ? Math.floor(updatedDog.Pup_is_currently_this_many_weeks_old / 52) + ' years' : '',
                    gender: updatedDog.Gender || '',
                    weight: updatedDog.Estimated_Size_When_Grown || '',
                    color: updatedDog.Markings || '',
                    created_at: updatedDog.created_at || Date.now(),
                    size: updatedDog.Estimated_Size_When_Grown?.includes('Large') ? 'Large' :
                          updatedDog.Estimated_Size_When_Grown?.includes('Medium') ? 'Medium' : 'Small',
                    vaccinated: updatedDog.Vaccinations === 'Yes',
                    spayed_neutered: updatedDog.Is_Dog_Fixed || false,
                    microchip: updatedDog.Microchip_Number ? true : false
                };
            } else {
                // For other orgs, use the standard animals endpoint
                updatedAnimal = await makeXanoRequest(`/orgs/${orgId}/animals/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(animalData)
                });
                console.log('✅ Animal updated in Xano:', updatedAnimal);
            }
        } catch (xanoError) {
            console.warn('⚠️ Xano update failed:', xanoError.message);
            console.warn(`🔍 Attempting fallback: looking for animal ${id} in shared storage`);

            // Try to update animal in shared storage as fallback
            // Support both numeric and string IDs
            let existingAnimal = sharedStorage.animals.get(parseInt(id));
            if (!existingAnimal) {
                existingAnimal = sharedStorage.animals.get(id.toString());
            }

            if (existingAnimal) {
                console.log(`✅ Found animal in shared storage, updating it`);
                updatedAnimal = {
                    ...existingAnimal,
                    ...animalData,
                    updated_at: Date.now()
                };
                // Store with both numeric and string keys for consistency
                sharedStorage.animals.set(parseInt(id), updatedAnimal);
                sharedStorage.animals.set(id.toString(), updatedAnimal);
            } else {
                const storageKeys = Array.from(sharedStorage.animals.keys());
                console.error(`❌ Animal not found in shared storage. Looking for ID: ${id}. Available IDs:`, storageKeys);
                throw new Error(`Animal not found in Xano (${xanoError.message}) and not available in fallback storage. ID: ${id}`);
            }
        }

        if (!updatedAnimal) {
            console.error('❌ updatedAnimal is null after update attempt');
            throw new Error('Failed to update animal - no data returned');
        }

        return new Response(JSON.stringify(updatedAnimal), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('💥 Error updating animal:', error);
        const errorMsg = error.message || 'Failed to update animal';
        return new Response(JSON.stringify({ error: errorMsg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// DELETE - Delete animal
export async function DELETE({ request }) {
    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        const orgId = url.searchParams.get('orgId') || '9';

        if (!id) {
            return new Response(JSON.stringify({ error: 'Animal ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            // For org 9 (Mission Bay), delete from dogs table
            if (orgId === '9') {
                await makeXanoRequest(`/dogs/${id}`, {
                    method: 'DELETE'
                });
                console.log('✅ Dog deleted from Xano:', id);
            } else {
                // For other orgs, use the standard animals endpoint
                await makeXanoRequest(`/orgs/${orgId}/animals/${id}`, {
                    method: 'DELETE'
                });
                console.log('✅ Animal deleted from Xano:', id);
            }
        } catch (xanoError) {
            console.warn('⚠️ Xano delete failed, using shared storage:', xanoError.message);
            // Delete from shared storage as fallback
            sharedStorage.animals.delete(parseInt(id));
            sharedStorage.animals.delete(id.toString());
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('💥 Error deleting animal:', error);
        const errorMsg = error.message || 'Failed to delete animal';
        return new Response(JSON.stringify({ error: errorMsg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}
