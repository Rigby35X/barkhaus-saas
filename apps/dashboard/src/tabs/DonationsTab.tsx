interface DonationsTabProps {
  orgId: number;
}

export default function DonationsTab({ orgId: _orgId }: DonationsTabProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="text-6xl mb-6">💝</div>
          <h2 className="text-2xl font-bold text-deep-taupe mb-3">Donation Tracking — Coming Soon</h2>
          <p className="text-gray-500 max-w-md mb-8">
            Accept and track donations to fund your rescue operations.
          </p>
          <ul className="text-left text-sm text-gray-600 mb-8 space-y-2">
            <li>✓ Accept online donations via Stripe</li>
            <li>✓ Track donor history and recurring giving</li>
            <li>✓ Generate tax receipts automatically</li>
            <li>✓ Launch monthly giving programs</li>
          </ul>
          <a
            href="mailto:hello@barkhaus.io?subject=Donations Feature Request"
            className="bg-[#804e3f] text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition font-semibold"
          >
            Request Early Access
          </a>
        </div>
      </div>
    </div>
  );
}
