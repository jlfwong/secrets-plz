import type { SecretsBackend } from './types.js';
import { noxkeyBackend } from './noxkey/index.js';

export function defaultBackend(): SecretsBackend {
  return noxkeyBackend;
}
