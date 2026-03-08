interface StatusBadgeProps {
  status: string;
  className?: string;
}

function getColors(status: string): string {
  const s = status.toLowerCase();
  if (s === 'available') return 'bg-green-100 text-green-800';
  if (s === 'published') return 'bg-blue-100 text-blue-800';
  if (s.includes('pending') || s === 'lm' || s === '1.lm' || s === 'call later') return 'bg-yellow-100 text-yellow-800';
  if (s.includes('adopted')) return 'bg-purple-100 text-purple-800';
  if (s === 'medical') return 'bg-red-100 text-red-800';
  if (s.includes('approved')) return 'bg-emerald-100 text-emerald-800';
  if (s.includes('denied')) return 'bg-red-100 text-red-800';
  if (s === 'foster') return 'bg-cyan-100 text-cyan-800';
  return 'bg-gray-100 text-gray-700';
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getColors(status)} ${className}`}
    >
      {status}
    </span>
  );
}
