interface DonationsTabProps {
  orgId: number;
}

export default function DonationsTab({ orgId: _orgId }: DonationsTabProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm p-12 text-center">
        <p className="text-5xl mb-4">💝</p>
        <h2 className="text-2xl font-serif font-semibold text-deep-taupe mb-2">Donations</h2>
        <p className="text-lg text-stone font-medium">Coming Soon</p>
        <p className="text-sm text-stone mt-2 max-w-sm mx-auto">
          Track donations and generate reports for your rescue organization.
        </p>
      </div>
    </div>
  );
}
