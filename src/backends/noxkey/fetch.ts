import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SecretLoadError } from '../../errors.js';
import type {
  LoadedSecrets,
  LoadSecretsOptions,
  SecretMapping,
} from '../../types.js';
import {
  decodeBashAssignmentValue,
  findAssignmentRhs,
} from './handoff-parse.js';
import { envVarNameFromSecretPath } from './paths.js';
import { parseHandoffPath, parseLoadedVarNames } from './response.js';

function resolveMcpGetChildInvocation(): {
  command: string;
  args: string[];
} {
  const jsPath = fileURLToPath(new URL('./mcp-get-child.js', import.meta.url));
  if (existsSync(jsPath)) {
    return { command: process.execPath, args: [jsPath] };
  }

  const tsPath = fileURLToPath(new URL('./mcp-get-child.ts', import.meta.url));
  const require = createRequire(import.meta.url);
  const tsxCli = require.resolve('tsx/dist/cli.mjs');
  return { command: process.execPath, args: [tsxCli, tsPath] };
}

type McpGetChildOutput = {
  text: string;
  isError: boolean;
};

function callGetSync(
  secretPaths: readonly string[],
  options: LoadSecretsOptions = {},
): McpGetChildOutput {
  const payload = JSON.stringify({ secret_paths: secretPaths, options });
  const { command, args } = resolveMcpGetChildInvocation();
  try {
    const stdout = execFileSync(command, args, {
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

function readVarsFromHandoff(
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
        `NoxKey handoff did not define env var: ${name}`,
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
    // Best-effort cleanup; NoxKey also removes handoffs on source.
  }

  return out;
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
        `NoxKey handoff did not load expected env var: ${name}`,
      );
    }
  }
  return loaded;
}

export function fetchNoxkeySecrets<const TMapping extends SecretMapping>(
  mapping: TMapping,
  options: LoadSecretsOptions = {},
): LoadedSecrets<TMapping> {
  const entries = Object.entries(mapping) as [
    keyof TMapping & string,
    TMapping[keyof TMapping],
  ][];
  if (entries.length === 0) {
    return {} as LoadedSecrets<TMapping>;
  }

  const secretPaths = [...new Set(entries.map(([, path]) => path))];
  const backendVarNames = secretPaths.map(envVarNameFromSecretPath);
  const { text, isError } = callGetSync(secretPaths, options);
  if (isError) {
    throw new SecretLoadError(text || 'NoxKey get failed');
  }

  const loadedByBackendVar = secretsFromGetText(text, backendVarNames);
  const result = {} as LoadedSecrets<TMapping>;
  for (const [envName, secretPath] of entries) {
    const backendVar = envVarNameFromSecretPath(secretPath);
    const value = loadedByBackendVar[backendVar];
    if (value === undefined || value.length === 0) {
      throw new SecretLoadError(
        `NoxKey handoff did not load secret for ${String(envName)} (${secretPath})`,
      );
    }
    result[envName] = value;
  }
  return result;
}
