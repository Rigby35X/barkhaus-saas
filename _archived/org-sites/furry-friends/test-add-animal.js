/**
 * Test script to add a new animal via the admin API
 * This demonstrates that the admin dashboard can successfully add animals to Xano
 */

const testAnimal = {
  name: "Buddy",
  species: "dog",
  breed: "Golden Retriever",
  age: 4,
  gender: "Male",
  size: "Large",
  weight: "70 lbs",
  status: "Available",
  intake_date: "2024-01-20",
  adoption_fee: 300,
  image_url: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400",
  description: "Buddy is a friendly and energetic Golden Retriever who loves playing fetch and swimming. He's great with kids and other dogs, making him the perfect family companion.",
  special_needs: false,
  good_with_kids: true,
  good_with_cats: false,
  good_with_dogs: true,
  spayed_neutered: true,
  vaccinated: true,
  microchip: true,
  orgId: "3"
};

async function testAddAnimal() {
  try {
    console.log('🐕 Testing animal addition via admin API...');
    
    const response = await fetch('http://localhost:4322/api/admin/animals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testAnimal)
    });

    if (response.ok) {
      const newAnimal = await response.json();
      console.log('✅ Successfully added animal:', newAnimal.name);
      console.log('📋 Animal ID:', newAnimal.id);
      console.log('🌐 You can now view this animal at: http://localhost:4322/our-animals/');
      console.log('📄 Animal details page: http://localhost:4322/animal-details/' + newAnimal.id);
    } else {
      const error = await response.text();
      console.error('❌ Failed to add animal:', response.status, error);
    }
  } catch (error) {
    console.error('❌ Error testing animal addition:', error);
  }
}

// Run the test
testAddAnimal();
