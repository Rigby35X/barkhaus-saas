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
const PHOTO_BASE = "https://animals-proxy.vercel.app";


function normalizePhotoUrl(value: any): string {
  const url = String(value || "").trim();
  if (!url) return "";

  // Public animal photo URLs may have been generated on an older Vercel
  // preview hostname. Re-anchor any known proxy photo path to the currently
  // configured API base so expired preview aliases cannot break images.
  try {
    const parsed = new URL(url);
    if (parsed.pathname.includes("/api/animals/") && parsed.pathname.includes("/photo/")) {
      return PHOTO_BASE + parsed.pathname + parsed.search;
    }
  } catch {
    if (url.startsWith("/api/animals/")) return PHOTO_BASE + url;
  }

  return url;
}

function normalizeAnimal(animal: any): PublicAnimal {
  const photos = Array.isArray(animal?.photos)
    ? animal.photos.filter(Boolean).map(normalizePhotoUrl)
    : [];
  const primary = normalizePhotoUrl(animal?.primary_photo || animal?.image_url || photos[0] || "");
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
  return [];
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
