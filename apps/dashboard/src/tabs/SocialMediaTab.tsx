import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from '../components/Modal';
import type { OrgConfig, Animal } from '../lib/api';
import { getAnimals } from '../lib/api';

interface SocialMediaTabProps {
  orgId: number;
  orgConfig: OrgConfig;
}

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',   specs: '1200 × 630 px' },
  { key: 'instagram', label: 'Instagram',  specs: '1080 × 1080 px' },
  { key: 'twitter',   label: 'Twitter / X', specs: '1600 × 900 px' },
  { key: 'linkedin',  label: 'LinkedIn',   specs: '1200 × 627 px' },
  { key: 'tiktok',    label: 'TikTok',     specs: '1080 × 1920 px (9:16 video)' },
  { key: 'youtube',   label: 'YouTube',    specs: '1280 × 720 px thumbnail' },
] as const;

type PlatformKey = typeof PLATFORMS[number]['key'];

const TONES = ['friendly', 'professional', 'playful', 'urgent', 'heartwarming'] as const;

const TEMPLATES = [
  {
    key: 'new_arrival',
    label: 'New Arrival',
    icon: '🐾',
    template: `Meet {name}! 🐾 This adorable {species} just arrived at {org_name} and needs a forever home.\n\n{name} is {age} old, {size}, and full of love to give. Could you be the one?\n\n📍 {location}\n🔗 Apply to adopt: {adoption_url}\n\n#RescueDog #AdoptDontShop #NewArrival #{org_hashtag}`,
  },
  {
    key: 'adoption_success',
    label: 'Adoption Success',
    icon: '🎉',
    template: `Congratulations to {name} and their new family! 🎊\n\nFrom rescue to forever home — this is exactly why we do what we do. Thank you for choosing to adopt!\n\n{name} is living their best life now. Welcome home! 🏡💕\n\n#AdoptionSuccess #ForeverHome #HappyEnding #{org_hashtag}`,
  },
  {
    key: 'fundraiser',
    label: 'Fundraiser',
    icon: '💛',
    template: `Every dollar helps us save more lives. 💛\n\n{org_name} is raising funds for {purpose}. Help us reach our goal!\n\n🎯 Goal: {goal_amount}\n💰 Raised so far: {amount_raised}\n🔗 Donate: {donate_url}\n\nNo amount is too small — every contribution makes a difference. Thank you! ❤️\n\n#Fundraiser #RescueDogs #{org_hashtag}`,
  },
  {
    key: 'volunteer_need',
    label: 'Volunteer Needed',
    icon: '🙋',
    template: `We need YOU! 🙋 {org_name} is looking for volunteers to help with {volunteer_role}.\n\nNo experience needed — just a big heart and love for animals!\n\n📅 When: {schedule}\n📍 Where: {location}\n\nInterested? DM us or visit our website to sign up.\n\n#Volunteer #AnimalRescue #MakeADifference #{org_hashtag}`,
  },
  {
    key: 'success_story',
    label: 'Success Story',
    icon: '⭐',
    template: `{name}'s Story ⭐\n\nWhen {name} came to us, {their_story}. Today, they're thriving in their forever home with {family_description}.\n\nEvery rescue has a story. Every story deserves a happy ending. 💕\n\n#SuccessStory #RescueDog #HappyEnding #{org_hashtag}`,
  },
  {
    key: 'event',
    label: 'Event',
    icon: '📅',
    template: `Join us! 📅 {event_name}\n\n📆 Date: {event_date}\n⏰ Time: {event_time}\n📍 Location: {event_location}\n\n{event_description}\n\nBring the whole family — FREE event, all are welcome! 🐾\n\n#AdoptionEvent #RescueDogs #{org_hashtag}`,
  },
];

interface GeneratedResult {
  platform: PlatformKey;
  content: string;
  photo_url: string;
  copied: boolean;
  imageCopied: boolean;
  showSpecs: boolean;
}

export default function SocialMediaTab({ orgId, orgConfig }: SocialMediaTabProps) {
  // ── Template section ──
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeCopied, setComposeCopied] = useState(false);
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState('');

  // ── AI Generator section ──
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformKey>>(new Set(['facebook', 'instagram']));
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [tone, setTone] = useState('friendly');
  const [customContext, setCustomContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    getAnimals(orgId, 'Available').then(setAnimals).catch(() => {});
  }, [orgId]);

  const openTemplate = (t: typeof TEMPLATES[number]) => {
    const text = t.template
      .replace(/{org_name}/g, orgConfig.name)
      .replace(/{org_hashtag}/g, orgConfig.name.replace(/\s+/g, '').toLowerCase());
    setComposeText(text);
    setSelectedTemplateLabel(t.label);
    setComposeCopied(false);
    setComposeOpen(true);
  };

  const copyCompose = () => {
    void navigator.clipboard.writeText(composeText);
    setComposeCopied(true);
    setTimeout(() => setComposeCopied(false), 2000);
  };

  const togglePlatform = (key: PlatformKey) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (selectedPlatforms.size === 0) {
      setGenError('Select at least one platform.');
      return;
    }
    setGenerating(true);
    setGenError('');
    setResults([]);
    const animal = animals.find((a) => String(a.id) === selectedAnimalId);
    const generated: GeneratedResult[] = [];

    const subdomain = orgConfig.subdomain ?? 'mbpr';
    const endpoint = `https://${subdomain}.preview.barkhaus.io/api/admin/generate-social-content`;

    for (const platform of selectedPlatforms) {
      const payload = {
        platform,
        animal_id: selectedAnimalId || undefined,
        animal_name: animal?.name,
        tone,
        context: customContext,
        org_name: orgConfig.name,
      };
      console.log(`[generate-social-content] POST ${endpoint}`, payload);
      try {
        const res = await axios.post<{ content?: string; text?: string; post?: string; photo_url?: string }>(
          endpoint,
          payload
        );
        console.log(`[generate-social-content] response (${platform}):`, res.data);
        const content = res.data.content ?? res.data.text ?? res.data.post ?? '';
        const photo_url = res.data.photo_url ?? '';
        generated.push({ platform, content, photo_url, copied: false, imageCopied: false, showSpecs: false });
      } catch (err) {
        console.error(`[generate-social-content] error (${platform}):`, err);
        generated.push({
          platform,
          content: `[Content generation for ${platform} is not available — connect the AI endpoint to enable this feature.]`,
          photo_url: '',
          copied: false,
          imageCopied: false,
          showSpecs: false,
        });
      }
    }
    setResults(generated);
    setGenerating(false);
  };

  const copyResult = (idx: number) => {
    void navigator.clipboard.writeText(results[idx].content);
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, copied: true } : r)));
    setTimeout(
      () => setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, copied: false } : r))),
      2000
    );
  };

  const toggleSpecs = (idx: number) => {
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, showSpecs: !r.showSpecs } : r)));
  };

  const copyImageUrl = (idx: number) => {
    const url = results[idx].photo_url;
    if (!url) return;
    void navigator.clipboard.writeText(url);
    setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, imageCopied: true } : r)));
    setTimeout(
      () => setResults((prev) => prev.map((r, i) => (i === idx ? { ...r, imageCopied: false } : r))),
      2000
    );
  };

  const downloadImage = async (idx: number) => {
    const url = results[idx].photo_url;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.split('.').pop()?.split('?')[0] ?? 'jpg';
      const filename = `${results[idx].platform}-photo.${ext}`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error('[downloadImage] failed:', err);
    }
  };

  const platformInfo = (key: string) => PLATFORMS.find((p) => p.key === key);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Quick Post Templates ── */}
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">Post Templates</h2>
          <p className="text-sm text-stone mt-1">
            Pick a template to open a compose window with pre-filled copy and hashtags.
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => openTemplate(t)}
                className="p-4 rounded-xl border border-silver-gray text-left hover:border-warm-brown hover:bg-sand transition group"
              >
                <p className="text-3xl mb-2">{t.icon}</p>
                <p className="text-sm font-semibold text-deep-taupe group-hover:text-warm-brown">{t.label}</p>
                <p className="text-xs text-stone mt-0.5 capitalize">{t.key.replace(/_/g, ' ')}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Content Generator ── */}
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="px-6 py-5 border-b border-silver-gray">
          <h2 className="text-2xl font-serif font-semibold text-deep-taupe">AI Content Generator</h2>
          <p className="text-sm text-stone mt-1">Generate platform-optimized posts with AI.</p>
        </div>
        <div className="p-6 space-y-5">
          {/* Platforms */}
          <div>
            <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-2">
              Select Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => togglePlatform(p.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    selectedPlatforms.has(p.key)
                      ? 'bg-warm-brown text-white border-warm-brown'
                      : 'border-silver-gray text-deep-taupe hover:bg-cloud'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Animal selector */}
            <div>
              <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
                Feature an Animal (optional)
              </label>
              <select
                value={selectedAnimalId}
                onChange={(e) => setSelectedAnimalId(e.target.value)}
                className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">No specific animal</option>
                {animals.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.breed ?? a.species ?? 'Dog'})
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
              >
                {TONES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="block text-xs font-semibold text-stone uppercase tracking-wider mb-1">
              Additional Context (optional)
            </label>
            <textarea
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value)}
              placeholder="E.g. Hosting an adoption event this Saturday, 50% off adoption fees this week…"
              className="w-full border border-silver-gray rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white min-h-[80px] resize-y"
            />
          </div>

          {genError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{genError}</p>}

          <button
            onClick={() => void handleGenerate()}
            disabled={generating || selectedPlatforms.size === 0}
            className="px-6 py-2.5 font-semibold text-sm bg-warm-brown text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition"
          >
            {generating
              ? 'Generating…'
              : `Generate for ${selectedPlatforms.size} Platform${selectedPlatforms.size !== 1 ? 's' : ''}`}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-semibold text-stone uppercase tracking-wider">Results</h3>
              {results.map((r, idx) => {
                const info = platformInfo(r.platform);
                return (
                  <div key={r.platform} className="border border-silver-gray rounded-xl overflow-hidden">
                    {/* Header row */}
                    <div className="bg-gray-50 border-b border-silver-gray px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-deep-taupe">{info?.label ?? r.platform}</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => toggleSpecs(idx)}
                          className="px-3 py-1.5 text-xs border border-silver-gray rounded-lg text-stone hover:bg-cloud transition"
                        >
                          {r.showSpecs ? 'Hide Specs' : 'Optimize Media'}
                        </button>
                        <button
                          onClick={() => copyResult(idx)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                            r.copied
                              ? 'bg-green-100 text-green-700'
                              : 'border border-warm-brown text-warm-brown hover:bg-sand'
                          }`}
                        >
                          {r.copied ? 'Copied!' : 'Copy Text'}
                        </button>
                        {r.photo_url && (
                          <>
                            <button
                              onClick={() => copyImageUrl(idx)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                                r.imageCopied
                                  ? 'bg-green-100 text-green-700'
                                  : 'border border-silver-gray text-deep-taupe hover:bg-cloud'
                              }`}
                            >
                              {r.imageCopied ? 'Copied!' : 'Copy Image URL'}
                            </button>
                            <button
                              onClick={() => void downloadImage(idx)}
                              className="px-3 py-1.5 text-xs font-semibold border border-silver-gray rounded-lg text-deep-taupe hover:bg-cloud transition"
                            >
                              Download Image
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {r.showSpecs && info && (
                      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700">
                        <span className="font-semibold">Image specs:</span> {info.specs}
                      </div>
                    )}
                    {/* Content + photo side by side when photo is available */}
                    <div className={`p-4 ${r.photo_url ? 'flex gap-4 items-start' : ''}`}>
                      {r.photo_url && (
                        <img
                          src={r.photo_url}
                          alt="Animal photo"
                          className="w-28 h-28 rounded-xl object-cover border border-silver-gray flex-shrink-0"
                        />
                      )}
                      <p className="text-sm text-deep-taupe whitespace-pre-wrap flex-1">{r.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <Modal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        title={`Compose — ${selectedTemplateLabel}`}
        size="lg"
        footer={
          <>
            <button
              onClick={() => setComposeOpen(false)}
              className="px-4 py-2 text-sm border border-stone rounded-lg text-deep-taupe hover:bg-cloud transition"
            >
              Close
            </button>
            <button
              onClick={copyCompose}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition ${
                composeCopied ? 'bg-green-600 text-white' : 'bg-warm-brown text-white hover:opacity-90'
              }`}
            >
              {composeCopied ? 'Copied!' : 'Copy All'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-stone">
            Replace <span className="font-mono bg-cloud px-1 rounded">{'{tokens}'}</span> with your content before posting.
          </p>
          <textarea
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            className="w-full border border-silver-gray rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-warm-brown bg-white min-h-[220px] resize-y font-mono"
          />
        </div>
      </Modal>
    </div>
  );
}
