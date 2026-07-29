import { validateSecretPath } from '../../mapping.js';

/** NoxKey names handoff vars after the last segment of the secret path. */
export function envVarNameFromSecretPath(secretPath: string): string {
  validateSecretPath(secretPath);
  const segments = secretPath.trim().split('/').filter((s) => s.length > 0);
  return segments[segments.length - 1]!;
}
