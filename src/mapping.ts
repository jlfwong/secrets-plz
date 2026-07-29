/** Validate a secret path (org/project/KEY). */
export function validateSecretPath(secretPath: string): void {
  const trimmed = secretPath.trim();
  if (trimmed.length === 0) {
    throw new Error('secret_path must not be empty');
  }
  const segments = trimmed.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) {
    throw new Error(
      `secret_path must be org/project/KEY, got: ${secretPath}`,
    );
  }
}

const ENV_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Parse `ENV_NAME=secret_path` (CLI and tooling). */
export function parseEnvSecretMappingEntry(entry: string): {
  envName: string;
  secretPath: string;
} {
  const trimmed = entry.trim();
  const eq = trimmed.indexOf('=');
  if (eq <= 0) {
    throw new Error(`Expected ENV_NAME=secret_path, got: ${entry}`);
  }
  const envName = trimmed.slice(0, eq);
  const secretPath = trimmed.slice(eq + 1).trim();
  if (!ENV_VAR_NAME_RE.test(envName)) {
    throw new Error(`Invalid env var name: ${envName}`);
  }
  validateSecretPath(secretPath);
  return { envName, secretPath };
}

/** Parse multiple `ENV_NAME=secret_path` entries into a mapping. */
export function parseEnvSecretMapping(
  entries: readonly string[],
): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const entry of entries) {
    const { envName, secretPath } = parseEnvSecretMappingEntry(entry);
    mapping[envName] = secretPath;
  }
  return mapping;
}
