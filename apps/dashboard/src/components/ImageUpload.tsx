import { useState, useRef, type ChangeEvent } from 'react';

interface ImageUploadProps {
  label: string;
  currentUrl?: string;
  onUrlChange: (url: string) => void;
  onFileChange: (file: File | null) => void;
}

export default function ImageUpload({ label, currentUrl, onUrlChange, onFileChange }: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentUrl ?? '');
  const [urlInput, setUrlInput] = useState<string>(currentUrl ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlInput = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);
    onUrlChange(val);
    if (val) setPreviewUrl(val);
    else setPreviewUrl('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-deep-taupe">{label}</label>

      {/* Preview */}
      {previewUrl && (
        <div className="relative w-32 h-32">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg border border-silver-gray"
            onError={() => setPreviewUrl('')}
          />
          <button
            type="button"
            onClick={() => {
              setPreviewUrl('');
              setUrlInput('');
              onUrlChange('');
              onFileChange(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* File upload */}
      <div
        className="border-2 border-dashed border-silver-gray rounded-lg p-4 text-center cursor-pointer hover:border-stone transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <svg className="w-6 h-6 mx-auto text-stone mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-xs text-stone">Click to upload</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      {/* URL input */}
      <input
        type="url"
        placeholder="Or paste image URL..."
        value={urlInput}
        onChange={handleUrlInput}
        className="w-full border border-silver-gray rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown"
      />
    </div>
  );
}
