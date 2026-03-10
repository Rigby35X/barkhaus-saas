import type { TabKey } from '../components/Sidebar';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // data-tour attribute value
  tab?: TabKey;           // navigate to this tab before showing
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Barkhaus!',
    description: "You're about to get a quick tour of your animal rescue dashboard. We'll walk through every major feature so you can hit the ground running.",
    targetSelector: 'sidebar-header',
    tab: 'overview',
    placement: 'right',
  },
  {
    id: 'overview',
    title: 'Dashboard Overview',
    description: 'Your home base. See key stats at a glance — total animals, pending applications, upcoming events, and recent donations — all updated in real time.',
    targetSelector: 'stat-cards',
    tab: 'overview',
    placement: 'bottom',
  },
  {
    id: 'animals-nav',
    title: 'Animals',
    description: 'Manage every animal in your care. Add new intakes, update statuses, upload photos, and track adoption readiness from one central list.',
    targetSelector: 'tab-animals',
    placement: 'right',
  },
  {
    id: 'add-animal',
    title: 'Adding a New Animal',
    description: "Click 'Add Animal' any time you take in a new rescue. Fill in the profile, upload photos, and set the availability status — it goes live on your public site instantly.",
    targetSelector: 'add-animal-btn',
    tab: 'animals',
    placement: 'bottom',
  },
  {
    id: 'applications-nav',
    title: 'Applications',
    description: 'Review adoption, foster, and volunteer applications submitted through your public website. Approve, deny, or mark them for follow-up — all with notes.',
    targetSelector: 'tab-applications',
    placement: 'right',
  },
  {
    id: 'communications-nav',
    title: 'Communications',
    description: 'Read contact form submissions and general inquiries from visitors to your site. Reply and track the conversation thread without leaving the dashboard.',
    targetSelector: 'tab-communications',
    placement: 'right',
  },
  {
    id: 'website-content-nav',
    title: 'Website Content',
    description: "Edit every section of your public website — hero headline, about section, services, FAQ — directly from here. No code, no CMS login required.",
    targetSelector: 'tab-website-content',
    placement: 'right',
  },
  {
    id: 'social-media-nav',
    title: 'Social Media',
    description: 'Generate ready-to-post captions for Instagram, Facebook, and more using built-in AI templates. Choose a tone, pick a platform, and copy in one click.',
    targetSelector: 'tab-social-media',
    placement: 'right',
  },
  {
    id: 'settings-nav',
    title: 'Settings',
    description: "Configure your organization's branding, colors, fonts, contact info, social links, and domain. Everything that makes your public site uniquely yours.",
    targetSelector: 'tab-settings',
    placement: 'right',
  },
  {
    id: 'integrations-nav',
    title: 'Integrations',
    description: 'Connect Barkhaus with Stripe, Petfinder, and more. Integrations are coming in an upcoming release — stay tuned!',
    targetSelector: 'tab-integrations',
    placement: 'right',
  },
  {
    id: 'finish',
    title: "You're all set!",
    description: "That's the full tour. You can restart it any time using the Tour Guide button in the sidebar. Now go help some animals find their forever homes!",
    targetSelector: 'sidebar-header',
    tab: 'overview',
    placement: 'center',
  },
];

export const ONBOARDING_KEY = 'barkhausOnboardingComplete';

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}
