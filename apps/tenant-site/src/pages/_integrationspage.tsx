import React, { useEffect, useState } from "react";
import IntegrationCard from "../components/integrations/IntegrationCard";

type LinkedAccount = {
  provider: string;
  status: 'connected'|'disconnected'|'error';
};

type LinkedStatusResponse = {
  linked: Record<string, LinkedAccount>;
};

export default function IntegrationsPage(){
  const [linked, setLinked] = useState<Record<string, LinkedAccount>>({});

  useEffect(() => {
    // Load status from your API/Xano; keep simple here with a local fetch.
    const loadStatus = async () => {
      try {
        const res = await fetch('/api/integrations/status');
        if (!res.ok) return;
        const data = (await res.json()) as Partial<LinkedStatusResponse>;
        if (data?.linked) {
          setLinked(data.linked);
        }
      } catch {
        // ignore network errors for now
      }
    };

    void loadStatus();
  }, []);

  const startConnect = (provider: string) => {
    // Redirect begins OAuth
    window.location.href = `/api/integrations/${provider}/start`;
  };

  const disconnect = async (provider: string) => {
    await fetch(`/api/integrations/${provider}/disconnect`, { method: 'POST' });
    setLinked((prev) => ({ ...prev, [provider]: { provider, status: 'disconnected' }}));
  };

  const cards = [
    { provider: 'google', title: 'Gmail', desc: 'Send replies, manage threads, label messages from Barkhaus.' },
    { provider: 'givebutter', title: 'Givebutter', desc: 'Sync donations into Barkhaus automatically.' },
    { provider: 'mailchimp', title: 'Mailchimp', desc: 'Add subscribers and trigger welcome campaigns.' },
    { provider: 'klaviyo', title: 'Klaviyo', desc: 'Add profiles and post events for flows.' },
    { provider: 'brevo', title: 'Brevo', desc: 'Transactional emails & contact lists.' },
    { provider: 'canva', title: 'Canva', desc: 'Import brand assets into your Media tab.' },
    { provider: 'petfinder', title: 'Petfinder', desc: 'Pull adoptable animals directly into Barkhaus.' },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="text-sm text-zinc-600">
        Connect your tools. Tokens are stored per-organization (multi-tenant).
      </p>

      <div className="grid gap-3">
        {cards.map(c => (
          <IntegrationCard
            key={c.provider}
            provider={c.provider as any}
            title={c.title}
            description={c.desc}
            status={linked[c.provider]?.status ?? 'disconnected'}
            onConnect={() => startConnect(c.provider)}
            onDisconnect={() => disconnect(c.provider)}
          />
        ))}
      </div>
    </div>
  );
}
