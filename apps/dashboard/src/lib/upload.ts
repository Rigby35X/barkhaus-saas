const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const BUCKET = 'animal-images';

/** Draws an image onto a canvas, scales it down to fit maxWidthPx, and re-encodes it as JPEG. */
export function compressImage(file: File, maxWidthPx = 1200, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scale = Math.min(1, maxWidthPx / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image compression failed: canvas context unavailable.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('Image compression failed: could not export blob.'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image compression failed: could not load image.'));
    };

    img.src = objectUrl;
  });
}

/** Uploads a file directly to Supabase Storage and returns its public URL. */
export async function uploadImage(file: File, folder: string, orgId: number): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Image upload failed: Supabase Storage is not configured.');
  }

  let body: Blob = file;
  let contentType = file.type;
  let safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  if (file.type.startsWith('image/')) {
    const compressed = await compressImage(file, 1200, 0.82);
    console.log(`[uploadImage] compressed ${file.name}: ${file.size}b -> ${compressed.size}b`);
    body = compressed;
    contentType = 'image/jpeg';
    safeName = safeName.replace(/\.[^.]+$/, '') + '.jpg';
  }

  const path = `${orgId}/${folder}/${Date.now()}-${safeName}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': contentType,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Image upload failed (${res.status}): ${text || res.statusText}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
