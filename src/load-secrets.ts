import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  envVarNameFromSecretPath,
  parseHandoffPath,
  parseLoadedVarNames,
} from './secret-paths.js';
import {
  decodeBashAssignmentValue,
  findAssignmentRhs,
} from './handoff-parse.js';

export class SecretLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretLoadError';
  }
}

export type SecretMapping = Record<string, string>;

/** Secret values keyed by the env var names from the input mapping. */
export type LoadedSecrets<TMapping extends SecretMapping> = {
  [K in keyof TMapping]: string;
};
export type LoadSecretsOptions = {
  /** Session duration for single-path fetches (e.g. `'4h'`). Ignored when fetching multiple paths. */
  session?: string;
};

function resolveTsxCliPath(): string {
  return fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
}

function resolveMcpGetChildPath(): string {
  return fileURLToPath(
    new URL('./backends/noxkey/mcp-get-child.ts', import.meta.url),
  );
}

type McpGetChildOutput = {
  text: string;
  isError: boolean;
};

/** Call the default MCP backend `get` tool synchronously (blocks; spawns a short-lived child process). */
function callGetSync(
  secretPaths: readonly string[],
  options: LoadSecretsOptions = {},
): McpGetChildOutput {
  const payload = JSON.stringify({ secret_paths: secretPaths, options });
  try {
    const stdout = execFileSync(
      process.execPath,
      [resolveTsxCliPath(), resolveMcpGetChildPath()],
      {
        input: payload,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    return JSON.parse(stdout) as McpGetChildOutput;
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'stderr' in err &&
      typeof err.stderr === 'string' &&
      err.stderr.trim().length > 0
    ) {
      process.stderr.write(err.stderr);
    }
    throw err;
  }
}

function secretsFromGetText(
  text: string,
  expectedVarNames: readonly string[],
): Record<string, string> {
  const handoffPath = parseHandoffPath(text);
  const varNames =
    expectedVarNames.length > 0
      ? expectedVarNames
      : parseLoadedVarNames(text);

  const loaded = readVarsFromHandoff(handoffPath, varNames);
  for (const name of expectedVarNames) {
    if (loaded[name] === undefined || loaded[name].length === 0) {
      throw new SecretLoadError(
        `Secret handoff did not load expected env var: ${name}`,
      );
    }
  }
  return loaded;
}

/**
 * Read secrets from a Bash handoff script by parsing its assignment lines.
 * Deletes the single-use handoff file afterward (no `source` — avoids a second
 * shell round-trip; values are never loaded via parameter expansion).
 */
export function readVarsFromHandoff(
  handoffPath: string,
  varNames: readonly string[],
): Record<string, string> {
  if (varNames.length === 0) {
    return {};
  }

  const handoffContents = readFileSync(handoffPath, 'utf8');
  const out: Record<string, string> = {};

  for (const name of varNames) {
    const rhs = findAssignmentRhs(handoffContents, name);
    if (rhs === undefined) {
      throw new SecretLoadError(
        `Secret handoff did not define env var: ${name}`,
      );
    }
    try {
      out[name] = decodeBashAssignmentValue(rhs);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'failed to parse handoff assignment';
      throw new SecretLoadError(message);
    }
  }

  try {
    rmSync(handoffPath, { force: true });
    rmSync(dirname(handoffPath), { recursive: true, force: true });
  } catch {
    // Best-effort cleanup; the backend may also remove handoffs on source.
  }

  return out;
}

/** Fetch secrets for the given env var mapping. */
export function loadSecrets<const TMapping extends SecretMapping>(
  mapping: TMapping,
  options: LoadSecretsOptions = {},
): LoadedSecrets<TMapping> {
  const entries = Object.entries(mapping) as [keyof TMapping & string, TMapping[keyof TMapping]][];
  if (entries.length === 0) {
    return {} as LoadedSecrets<TMapping>;
  }

  const secretPaths = [...new Set(entries.map(([, path]) => path))];
  const backendVarNames = secretPaths.map(envVarNameFromSecretPath);
  const { text, isError } = callGetSync(secretPaths, options);
  if (isError) {
    throw new SecretLoadError(text || 'secret get failed');
  }

  const loadedByBackendVar = secretsFromGetText(text, backendVarNames);
  const result = {} as LoadedSecrets<TMapping>;
  for (const [envName, secretPath] of entries) {
    const backendVar = envVarNameFromSecretPath(secretPath);
    const value = loadedByBackendVar[backendVar];
    if (value === undefined || value.length === 0) {
      throw new SecretLoadError(
        `Secret handoff did not load secret for ${String(envName)} (${secretPath})`,
      );
    }
    result[envName] = value;
  }
  return result;
}
