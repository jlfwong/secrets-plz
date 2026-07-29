import type { SecretsBackend } from '../types.js';
import { fetchNoxkeySecrets } from './fetch.js';

export const noxkeyBackend: SecretsBackend = {
  load: fetchNoxkeySecrets,
};
