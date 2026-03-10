interface IntegrationsTabProps {
  orgId: number;
}

export default function IntegrationsTab({ orgId: _orgId }: IntegrationsTabProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm p-12 text-center">
        <p className="text-5xl mb-4">🔌</p>
        <h2 className="text-2xl font-serif font-semibold text-deep-taupe mb-2">Integrations</h2>
        <p className="text-lg text-stone font-medium">Coming Soon</p>
        <p className="text-sm text-stone mt-2 max-w-sm mx-auto">
          Connect Barkhaus with Stripe donations, Petfinder listings, and more — coming in a future release.
        </p>
      </div>
    </div>
  );
}
