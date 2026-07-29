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

/** Extract the backend key name from a secret path (last path segment). */
export function envVarNameFromSecretPath(secretPath: string): string {
  validateSecretPath(secretPath);
  const segments = secretPath.trim().split('/').filter((s) => s.length > 0);
  return segments[segments.length - 1]!;
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

/** Parse the single-use Bash handoff path from an MCP `get` text response. */
export function parseHandoffPath(responseText: string): string {
  const match =
    /source\s+'([^']+\.sh)'/.exec(responseText) ??
    /source\s+"([^"]+\.sh)"/.exec(responseText);
  if (!match?.[1]) {
    throw new Error(
      'get response did not include a source handoff path',
    );
  }
  return match[1];
}

/** Parse env var names from "Loads: $FOO, $BAR" lines in an MCP `get` response. */
export function parseLoadedVarNames(responseText: string): string[] {
  const names: string[] = [];
  for (const line of responseText.split('\n')) {
    const loadsMatch = /^Loads:\s*(.+)$/.exec(line.trim());
    if (!loadsMatch?.[1]) {
      continue;
    }
    for (const match of loadsMatch[1].matchAll(/\$([A-Za-z_][A-Za-z0-9_]*)/g)) {
      names.push(match[1]!);
    }
  }
  return names;
}

export function mcpTextContent(result: {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}): string {
  const content = result.content ?? [];
  const parts = content
    .filter((block) => block.type === 'text' && block.text !== undefined)
    .map((block) => block.text!);
  return parts.join('\n');
}
