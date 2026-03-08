interface EventsTabProps {
  orgId: number;
}

export default function EventsTab({ orgId: _orgId }: EventsTabProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm p-12 text-center">
        <p className="text-5xl mb-4">📅</p>
        <h2 className="text-2xl font-serif font-semibold text-deep-taupe mb-2">Events</h2>
        <p className="text-lg text-stone font-medium">Coming Soon</p>
        <p className="text-sm text-stone mt-2 max-w-sm mx-auto">
          Manage and promote your rescue events — adoption days, fundraisers, and volunteer opportunities.
        </p>
      </div>
    </div>
  );
}
