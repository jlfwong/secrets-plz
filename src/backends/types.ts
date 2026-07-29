import type {
  LoadedSecrets,
  LoadSecretsOptions,
  SecretMapping,
} from '../types.js';

export type SecretsBackend = {
  load<const TMapping extends SecretMapping>(
    mapping: TMapping,
    options?: LoadSecretsOptions,
  ): LoadedSecrets<TMapping>;
};
