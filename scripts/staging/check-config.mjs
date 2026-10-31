import { pathToFileURL } from 'node:url';
import { validateStagingConfig } from './config.mjs';

export function checkConfig(env = process.env) {
  validateStagingConfig(env);
  return 'Staging configuration validated locally; runtime must remain gated. No network requests made.';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(checkConfig()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
