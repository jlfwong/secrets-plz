import { defaultBackend } from './backends/default.js';
import { SecretLoadError } from './errors.js';
import type {
  LoadedSecrets,
  LoadSecretsOptions,
  SecretMapping,
} from './types.js';

export { SecretLoadError };
export type { LoadedSecrets, LoadSecretsOptions, SecretMapping };

/** Fetch secrets for the given env var mapping via the default backend. */
export function loadSecrets<const TMapping extends SecretMapping>(
  mapping: TMapping,
  options: LoadSecretsOptions = {},
): LoadedSecrets<TMapping> {
  return defaultBackend().load(mapping, options);
}
