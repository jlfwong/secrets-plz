/** Extract the env var name from a NoxKey secret path (last path segment). */
export function envVarNameFromSecretPath(secretPath: string): string {
  const trimmed = secretPath.trim();
  if (trimmed.length === 0) {
    throw new Error('NoxKey secret_path must not be empty');
  }
  const segments = trimmed.split('/').filter((s) => s.length > 0);
  if (segments.length < 2) {
    throw new Error(
      `NoxKey secret_path must be org/project/ENV_VAR, got: ${secretPath}`,
    );
  }
  return segments[segments.length - 1]!;
}

/** Parse the single-use Bash handoff path from a noxkey `get` text response. */
export function parseHandoffPath(responseText: string): string {
  const match =
    /source\s+'([^']+\.sh)'/.exec(responseText) ??
    /source\s+"([^"]+\.sh)"/.exec(responseText);
  if (!match?.[1]) {
    throw new Error(
      'NoxKey get response did not include a source handoff path',
    );
  }
  return match[1];
}

/** Parse env var names from "Loads: $FOO, $BAR" lines in a noxkey `get` response. */
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
