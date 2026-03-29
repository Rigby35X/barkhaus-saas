interface EventsTabProps {
  orgId: number;
}

export default function EventsTab({ orgId: _orgId }: EventsTabProps) {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-silver-gray shadow-sm">
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <div className="text-6xl mb-6">📅</div>
          <h2 className="text-2xl font-bold text-deep-taupe mb-3">Events Management — Coming Soon</h2>
          <p className="text-gray-500 max-w-md mb-8">
            Track and promote your adoption events, fundraisers, and community activities.
          </p>
          <ul className="text-left text-sm text-gray-600 mb-8 space-y-2">
            <li>✓ Create event listings with dates, locations, and descriptions</li>
            <li>✓ Share events directly to Facebook and Instagram</li>
            <li>✓ Track RSVPs and attendee counts</li>
            <li>✓ Send automated reminders to registered attendees</li>
          </ul>
          <a
            href="mailto:hello@barkhaus.io?subject=Events Feature Request"
            className="bg-[#804e3f] text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition font-semibold"
          >
            Request Early Access
          </a>
        </div>
      </div>
    </div>
  );
}
