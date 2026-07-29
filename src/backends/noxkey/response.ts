/** Parse the single-use Bash handoff path from a NoxKey MCP `get` text response. */
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

/** Parse env var names from "Loads: $FOO, $BAR" lines in a NoxKey `get` response. */
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
