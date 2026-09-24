export type PublicAnimal = {
  form_id?: string;
  entry_id?: string;
  animal_key?: string;
  id?: string | number;
  name: string;
  status?: string;
  code?: string;
  breed?: string;
  age?: string;
  birthday?: string;
  gender?: string;
  size?: string;
  story?: string;
  description?: string;
  image_url?: string;
  primary_photo?: string;
  photos?: string[];
  litter?: string;
  availability?: string;
};

type AnimalApiListResponse = {
  form_id?: string;
  count?: number;
  animals?: PublicAnimal[];
};

const API_BASE = (import.meta.env.PUBLIC_ANIMALS_API_BASE || "https://animals-proxy.vercel.app").replace(/\/$/, "");

const fallback: PublicAnimal[] = [
  { name:"Rocket", status:"Available Now", breed:"Australian Cattle Dog / Mix", gender:"Male", size:"Medium, grown", image_url:"https://missionbaypuppyrescue.org/cdn/shop/files/fGT316vhT0-rU8gCrayexQ_97593c5f-9a3b-4c8f-88ab-e5c619b83289_1200x1200.jpg?v=1787949564", litter:"The 17!" },
  { name:"Liberty", status:"Available Now", breed:"Australian Cattle Dog / Mix", gender:"Female", size:"Medium, grown", image_url:"https://missionbaypuppyrescue.org/cdn/shop/files/fGT316vhT0-rU8gCrayexQ_33f34ac5-e50e-457b-8ea1-79d23812d814_1200x1200.jpg?v=1787949952", litter:"The 17!" },
  { name:"Captain", status:"Available Now", breed:"Australian Cattle Dog / Mix", gender:"Male", size:"Medium, grown", image_url:"https://missionbaypuppyrescue.org/cdn/shop/files/fGT316vhT0-rU8gCrayexQ_4a73e74a-e59f-4e12-87a9-04cf0403e91f_1200x1200.jpg?v=1787949454", litter:"The 17!" },
  { name:"Glory", status:"Available Now", breed:"Australian Cattle Dog / Mix", gender:"Female", size:"Medium, grown", image_url:"https://missionbaypuppyrescue.org/cdn/shop/files/fGT316vhT0-rU8gCrayexQ_0f7869ce-6513-4ec1-82f9-dde97ae70632_1200x1200.jpg?v=1787949827", litter:"The 17!" }
];

function normalizeAnimal(animal: any): PublicAnimal {
  const photos = Array.isArray(animal?.photos) ? animal.photos.filter(Boolean) : [];
  const primary = animal?.primary_photo || animal?.image_url || photos[0] || "";
  return {
    ...animal,
    name: animal?.name || "Available pup",
    status: animal?.status || animal?.availability || animal?.code || "Available Now",
    story: animal?.story || animal?.description || "",
    description: animal?.description || animal?.story || "",
    image_url: primary,
    primary_photo: primary,
    photos,
    litter: animal?.litter || "Available Pups",
  };
}

export async function getPublicAnimals(_locals?: any): Promise<PublicAnimal[]> {
  try {
    const response = await fetch(API_BASE + "/api/animals", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Animal API HTTP " + response.status);
    const data = await response.json() as AnimalApiListResponse;
    const animals = Array.isArray(data?.animals) ? data.animals.map(normalizeAnimal) : [];
    if (animals.length) return animals;
  } catch (error) {
    console.warn("Live Cognito animal API unavailable; using preview fallback.", error);
  }
  return fallback;
}

export async function getPublicAnimal(animalKey: string): Promise<PublicAnimal | null> {
  if (!animalKey || !/^dog-\d+-\d+$/.test(animalKey)) return null;

  try {
    const response = await fetch(API_BASE + "/api/animals/" + encodeURIComponent(animalKey), {
      headers: { Accept: "application/json" },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Animal API HTTP " + response.status);
    return normalizeAnimal(await response.json());
  } catch (error) {
    console.error("Unable to load live animal detail.", error);
    return null;
  }
}
