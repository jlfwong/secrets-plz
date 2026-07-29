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

export class NoxkeyLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoxkeyLoadError';
  }
}

export type LoadNoxkeyOptions = {
  /** Passed to noxkey `get` when fetching a single path. Ignored for multiple paths. */
  session?: string;
};

function resolveTsxCliPath(): string {
  return fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url));
}

function resolveMcpGetChildPath(): string {
  return fileURLToPath(new URL('./mcp-get-child.ts', import.meta.url));
}

type McpGetChildOutput = {
  text: string;
  isError: boolean;
};

/** Call noxkey MCP `get` synchronously (blocks; spawns a short-lived child process). */
export function callNoxkeyGetSync(
  secretPaths: readonly string[],
  options: LoadNoxkeyOptions = {},
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
      throw new NoxkeyLoadError(
        `NoxKey handoff did not load expected env var: ${name}`,
      );
    }
  }
  return loaded;
}

/**
 * Read secrets from a NoxKey handoff script by parsing its assignment lines.
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
      throw new NoxkeyLoadError(
        `NoxKey handoff did not define env var: ${name}`,
      );
    }
    try {
      out[name] = decodeBashAssignmentValue(rhs);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'failed to parse handoff assignment';
      throw new NoxkeyLoadError(message);
    }
  }

  try {
    rmSync(handoffPath, { force: true });
    rmSync(dirname(handoffPath), { recursive: true, force: true });
  } catch {
    // Best-effort cleanup; NoxKey also removes handoffs on source.
  }

  return out;
}

/** Fetch secrets via noxkey MCP `get` without mutating process.env. */
export function fetchNoxkeySecrets(
  mapping: Record<string, string>,
  options: LoadNoxkeyOptions = {},
): Record<string, string> {
  const entries = Object.entries(mapping);
  if (entries.length === 0) {
    return {};
  }

  const secretPaths = [...new Set(entries.map(([, path]) => path))];
  const noxkeyVarNames = secretPaths.map(envVarNameFromSecretPath);
  const { text, isError } = callNoxkeyGetSync(secretPaths, options);
  if (isError) {
    throw new NoxkeyLoadError(text || 'noxkey get failed');
  }

  const loadedByNoxkeyVar = secretsFromGetText(text, noxkeyVarNames);
  const result: Record<string, string> = {};
  for (const [envName, secretPath] of entries) {
    const noxkeyVar = envVarNameFromSecretPath(secretPath);
    const value = loadedByNoxkeyVar[noxkeyVar];
    if (value === undefined || value.length === 0) {
      throw new NoxkeyLoadError(
        `NoxKey handoff did not load secret for ${envName} (${secretPath})`,
      );
    }
    result[envName] = value;
  }
  return result;
}

/** dotenv-style loader: fetch via MCP and assign into process.env. */
export function loadNoxkeyEnv(
  mapping: Record<string, string>,
  options: LoadNoxkeyOptions = {},
): void {
  const loaded = fetchNoxkeySecrets(mapping, options);
  for (const [key, value] of Object.entries(loaded)) {
    process.env[key] = value;
  }
}
