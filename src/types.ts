export type SecretMapping = Record<string, string>;

/** Secret values keyed by the env var names from the input mapping. */
export type LoadedSecrets<TMapping extends SecretMapping> = {
  [K in keyof TMapping]: string;
};

export type LoadSecretsOptions = {
  /** Session duration for single-path fetches (e.g. `'4h'`). Ignored when fetching multiple paths. */
  session?: string;
};
