import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import NativeAnimals from '../features/animals/NativeAnimals';
import { CsvOnboarding, createCsvOnboardingHttpClient } from '../features/imports';
import { getPlatformApiUrl } from '../lib/platform-http';
import { platformAccessToken } from '../lib/platform-session';
import type { NativeAnimalsProps } from '../features/animals/NativeAnimals';

export default function AnimalWorkspaceTab(props: NativeAnimalsProps) {
  const [params, setParams] = useSearchParams();
  const importing = params.get('animalMode') === 'import';
  const client = useMemo(() => {
    try { return createCsvOnboardingHttpClient({endpoint:getPlatformApiUrl('imports'),accessToken:platformAccessToken}); }
    catch { return null; }
  }, []);
  function choose(mode: 'manage' | 'import') {
    const next = new URLSearchParams(params);
    if (mode === 'import') next.set('animalMode', 'import'); else next.delete('animalMode');
    setParams(next);
  }
  return <div className="space-y-6">
    <nav aria-label="Animal workspace" className="flex gap-4">
      <button aria-current={!importing ? 'page' : undefined} onClick={() => choose('manage')}>Manage animals</button>
      <button aria-current={importing ? 'page' : undefined} onClick={() => choose('import')}>Import CSV</button>
    </nav>
    {importing ? client ? <CsvOnboarding key={props.orgId} orgId={props.orgId} canImport={props.canEdit === true} client={client} />
      : <p role="status">CSV imports are not available for this workspace yet. Please contact your administrator.</p>
      : <NativeAnimals {...props} />}
  </div>;
}
