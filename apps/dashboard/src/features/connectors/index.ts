/** Capability availability is explicit; a provider is not connected by default. */
export const connectorCapabilities=[{provider:'cognito',direction:'inbound',readiness:'synthetic-fixtures',pagination:'cursor'}] as const;
export { ConnectorPanel } from './ConnectorPanel';
export { createConnectorClient } from './client';
export type { ConnectorClient, ConnectorJobStatus, ConnectorSummary } from './types';
