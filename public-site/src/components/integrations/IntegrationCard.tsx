import React from "react";

type Props = {
  provider: 'google'|'mailchimp'|'klaviyo'|'brevo'|'givebutter'|'canva'|'petfinder';
  title: string;
  description: string;
  status?: 'connected'|'disconnected'|'error';
  onConnect: () => void;
  onDisconnect?: () => void;
};

export default function IntegrationCard({
  title, description, status='disconnected', onConnect, onDisconnect
}: Props){
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex items-start justify-between shadow-sm">
      <div className="max-w-[70%]">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-zinc-600 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded capitalize ${
            status==='connected' ? 'bg-green-100 text-green-700' :
            status==='error' ? 'bg-red-100 text-red-700' :
            'bg-zinc-100 text-zinc-700'
          }`}
        >
          {status}
        </span>
        {status==='connected' ? (
          <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50" onClick={onDisconnect}>
            Disconnect
          </button>
        ) : (
          <button className="rounded-lg bg-black text-white px-3 py-1.5 text-sm hover:opacity-90" onClick={onConnect}>
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
