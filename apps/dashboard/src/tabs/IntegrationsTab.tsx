import { useMemo } from 'react';
import { ConnectorPanel, createConnectorClient } from '../features/connectors';
import type { OrganizationRole } from '../lib/access';
import { getPlatformApiUrl } from '../lib/platform-http';
import { platformAccessToken } from '../lib/platform-session';

export default function IntegrationsTab({orgId,role='viewer'}:{orgId:number;role?:OrganizationRole}) {
  const client = useMemo(() => {
    try { return createConnectorClient({endpoint:getPlatformApiUrl('connectors'),accessToken:platformAccessToken}); }
    catch { return null; }
  }, []);
  return <section className="space-y-6">
    <h2 className="text-2xl">Animal data connections</h2>
    <p>Manage animals in BarkHaus using manual entry or CSV, or keep supported existing software connected. A connection is optional.</p>
    {client ? <ConnectorPanel key={orgId} orgId={orgId} role={role} client={client} />
      : <p role="status">Connections are not available for this workspace yet. Please contact your administrator.</p>}
    <p>Cognito requires a configured connection for your organization. Google Sheets and additional providers are not available yet.</p>
  </section>;
}
