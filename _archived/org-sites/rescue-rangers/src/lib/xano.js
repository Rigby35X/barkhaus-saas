/**
 * Xano API Integration for Animal Rescue Website (Multi-Tenant)
 *
 * This module handles all API calls to your Xano database for animal data.
 * Supports multi-tenant architecture with organization-specific data.
 */

// Xano configuration from environment variables
const XANO_BASE_URL = import.meta.env.PUBLIC_XANO_BASE_URL || import.meta.env.VITE_XANO_BASE_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:wPrzs4Mr';
const XANO_ANIMALS_URL = import.meta.env.VITE_XANO_ANIMALS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:Od874PbA';
const XANO_ORGANIZATIONS_URL = import.meta.env.VITE_XANO_ORGANIZATIONS_URL || 'https://xz6u-fpaz-praf.n7e.xano.io/api:siXQEdjz';

// API Tokens
const XANO_ANIMALS_TOKEN = import.meta.env.VITE_XANO_ANIMALS_TOKEN || '165XkoniNXylFdNKgO_aCvmAIcQ';
const XANO_ORGANIZATIONS_TOKEN = import.meta.env.VITE_XANO_ORGANIZATIONS_TOKEN || 'YOUR_ORGANIZATIONS_TOKEN_HERE';

// Organization ID - this should come from your site configuration
const ORG_ID = import.meta.env.PUBLIC_ORG_ID || import.meta.env.VITE_DEFAULT_ORG_ID || '3';

/**
 * Get headers for API requests (includes auth tokens)
 * @param {string} endpoint - The endpoint type ('animals', 'organizations', etc.)
 * @returns {Object} Headers object
 */
function getHeaders(endpoint = 'animals') {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Add appropriate token based on endpoint
  switch (endpoint) {
    case 'animals':
      if (XANO_ANIMALS_TOKEN) {
        headers['Authorization'] = `Bearer ${XANO_ANIMALS_TOKEN}`;
      }
      break;
    case 'organizations':
      if (XANO_ORGANIZATIONS_TOKEN) {
        headers['Authorization'] = `Bearer ${XANO_ORGANIZATIONS_TOKEN}`;
      }
      break;
    default:
      // Use base token if available
      const baseToken = import.meta.env.VITE_XANO_AUTH_TOKEN;
      if (baseToken) {
        headers['Authorization'] = `Bearer ${baseToken}`;
      }
  }

  return headers;
}

/**
 * Fetch all animals for a specific organization from Xano database
 * @param {string} orgId - Organization ID (optional, defaults to configured ORG_ID)
 * @returns {Promise<Array>} Array of animal objects
 */
export async function getAllAnimals(orgId = ORG_ID) {
  try {
    const response = await fetch(`${XANO_ANIMALS_URL}/orgs/${orgId}/animals`, {
      headers: getHeaders('animals')
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const animals = await response.json();
    
    // Transform Xano data to match our expected format
    return animals.map(animal => ({
      id: animal.id.toString(),
      name: animal.name,
      type: animal.species === 'dog' ? 'Dog' : animal.species === 'cat' ? 'Cat' : 'Dog',
      breed: animal.breed,
      age: animal.age + ' years',
      gender: animal.gender,
      size: animal.size || 'Medium',
      weight: animal.weight || 'Unknown',
      status: animal.status || 'Available',
      arrivalDate: animal.intake_date || new Date(animal.created_at).toISOString().split('T')[0],
      image: animal.image_url || '/assets/images/animals/placeholder.jpg',
      images: animal.images && Array.isArray(animal.images) ? animal.images : [animal.image_url || '/assets/images/animals/placeholder.jpg'],
      description: animal.description || animal.description_long || 'No description available',
      specialNeeds: animal.special_needs ? true : false,
      goodWithKids: animal.good_with_kids || false,
      goodWithCats: animal.good_with_cats || false,
      goodWithDogs: animal.good_with_dogs || false,
      personality: animal.training_notes ? animal.training_notes.split(',').map(trait => trait.trim()) : ['Friendly', 'Loving'],
      medicalInfo: {
        spayedNeutered: animal.spayed_neutered || false,
        vaccinated: animal.vaccinated || false,
        microchipped: animal.microchip || false,
        specialNeeds: animal.special_needs ? true : false,
        medicalNotes: animal.medical_notes || 'No medical notes'
      },
      adoptionFee: animal.adoption_fee || 250,
      fosterable: true,
      energyLevel: animal.energy_level || 'Medium',
      trainingLevel: 'Basic'
    }));
  } catch (error) {
    console.error('Error fetching animals from Xano:', error);
    
    // Return fallback data if Xano is unavailable
    return getFallbackAnimals();
  }
}

/**
 * Fetch a single animal by ID from Xano database
 * @param {string} id - The animal ID
 * @param {string} orgId - Organization ID (optional, defaults to configured ORG_ID)
 * @returns {Promise<Object|null>} Animal object or null if not found
 */
export async function getAnimalById(id, orgId = ORG_ID) {
  try {
    // Note: Based on your API structure, using dogs_id parameter
    const response = await fetch(`${XANO_ANIMALS_URL}/orgs/${orgId}/animals/${id}`, {
      headers: getHeaders('animals')
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const animal = await response.json();
    
    // Transform single animal data
    return {
      id: animal.id.toString(),
      name: animal.name,
      type: animal.species === 'dog' ? 'Dog' : animal.species === 'cat' ? 'Cat' : 'Dog',
      breed: animal.breed,
      age: animal.age + ' years',
      gender: animal.gender,
      size: animal.size || 'Medium',
      weight: animal.weight || 'Unknown',
      status: animal.status || 'Available',
      arrivalDate: animal.intake_date || new Date(animal.created_at).toISOString().split('T')[0],
      image: animal.image_url || '/assets/images/animals/placeholder.jpg',
      images: animal.images && Array.isArray(animal.images) ? animal.images : [animal.image_url || '/assets/images/animals/placeholder.jpg'],
      description: animal.description || animal.description_long || 'No description available',
      specialNeeds: animal.special_needs ? true : false,
      goodWithKids: animal.good_with_kids || false,
      goodWithCats: animal.good_with_cats || false,
      goodWithDogs: animal.good_with_dogs || false,
      personality: animal.training_notes ? animal.training_notes.split(',').map(trait => trait.trim()) : ['Friendly', 'Loving'],
      medicalInfo: {
        spayedNeutered: animal.spayed_neutered || false,
        vaccinated: animal.vaccinated || false,
        microchipped: animal.microchip || false,
        specialNeeds: animal.special_needs ? true : false,
        medicalNotes: animal.medical_notes || 'No medical notes'
      },
      adoptionFee: animal.adoption_fee || 250,
      fosterable: true,
      energyLevel: animal.energy_level || 'Medium',
      trainingLevel: 'Basic'
    };
  } catch (error) {
    console.error(`Error fetching animal ${id} from Xano:`, error);
    return null;
  }
}

/**
 * Fallback animal data in case Xano is unavailable
 * This ensures the site still works during development or if API is down
 */
function getFallbackAnimals() {
  return [
    {
      id: "1",
      name: "Luna",
      type: "Dog",
      breed: "Golden Retriever Mix",
      age: "3 years",
      gender: "Female",
      size: "Large",
      weight: "65 lbs",
      status: "Available",
      arrivalDate: "2024-01-15",
      image: "/assets/images/animals/placeholder.jpg",
      images: ["/assets/images/animals/placeholder.jpg"],
      description: "Luna is a sweet and gentle girl who loves playing fetch and cuddling on the couch.",
      specialNeeds: false,
      goodWithKids: true,
      goodWithCats: true,
      goodWithDogs: true,
      personality: ["Gentle and calm", "Loves to play fetch", "Great with children"],
      medicalInfo: {
        spayedNeutered: true,
        vaccinated: true,
        microchipped: true,
        specialNeeds: false,
        medicalNotes: ''
      },
      adoptionFee: 250,
      fosterable: true,
      energyLevel: "Medium",
      trainingLevel: "Basic"
    },
    {
      id: "2",
      name: "Max",
      type: "Dog",
      breed: "German Shepherd Mix",
      age: "2 years",
      gender: "Male",
      size: "Large",
      weight: "70 lbs",
      status: "Available",
      arrivalDate: "2024-02-01",
      image: "/assets/images/animals/placeholder.jpg",
      images: ["/assets/images/animals/placeholder.jpg"],
      description: "Max is an energetic and loyal companion who loves outdoor adventures.",
      specialNeeds: false,
      goodWithKids: true,
      goodWithCats: false,
      goodWithDogs: true,
      personality: ["Energetic", "Loyal", "Loves outdoor activities"],
      medicalInfo: {
        spayedNeutered: true,
        vaccinated: true,
        microchipped: true,
        specialNeeds: false,
        medicalNotes: ''
      },
      adoptionFee: 300,
      fosterable: true,
      energyLevel: "High",
      trainingLevel: "Intermediate"
    }
  ];
}

/**
 * Get available animals (filter out adopted/pending)
 * @param {string} orgId - Organization ID (optional, defaults to configured ORG_ID)
 * @returns {Promise<Array>} Array of available animals
 */
export async function getAvailableAnimals(orgId = ORG_ID) {
  const allAnimals = await getAllAnimals(orgId);
  return allAnimals.filter(animal =>
    animal.status && (
      animal.status.includes('Available') ||
      animal.status === 'Available' ||
      animal.status === 'available'
    )
  );
}

/**
 * Get animals by type (Dog, Cat, etc.)
 * @param {string} type - Animal type to filter by
 * @param {string} orgId - Organization ID (optional, defaults to configured ORG_ID)
 * @returns {Promise<Array>} Array of animals of specified type
 */
export async function getAnimalsByType(type, orgId = ORG_ID) {
  const allAnimals = await getAllAnimals(orgId);
  return allAnimals.filter(animal =>
    animal.type.toLowerCase() === type.toLowerCase()
  );
}

/**
 * Get organization information from Xano
 * @param {string} orgId - Organization ID (optional, defaults to configured ORG_ID)
 * @returns {Promise<Object|null>} Organization object or null if not found
 */
export async function getOrganization(orgId = ORG_ID) {
  try {
    const response = await fetch(`${XANO_ORGANIZATIONS_URL}/organizations/${orgId}`, {
      headers: getHeaders('organizations')
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const org = await response.json();

    // Transform organization data to match template format
    return {
      id: org.id,
      name: org.name,
      email: org.email,
      phone: org.phone,
      address: org.address,
      website: org.website,
      description: org.description,
      logo: org.logo,
      primaryColor: org.primary_color || '#2E8B57',
      secondaryColor: org.secondary_color || '#1a5f3f',
      socialMedia: {
        facebook: org.facebook_url,
        instagram: org.instagram_url,
        twitter: org.twitter_url
      }
    };
  } catch (error) {
    console.error(`Error fetching organization ${orgId}:`, error);
    return null;
  }
}

/**
 * Set the organization ID for API calls
 * Useful for switching between organizations in multi-tenant setup
 * @param {string} newOrgId - New organization ID to use
 */
export function setOrganizationId(newOrgId) {
  // Note: This would typically be handled by environment variables
  // or a more sophisticated state management system in production
  console.log(`Switching to organization: ${newOrgId}`);
  // In a real implementation, you might update a global state or config
}
