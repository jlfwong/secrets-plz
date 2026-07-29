import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSecrets } from './load-secrets.js';
import { parseEnvSecretMapping } from './mapping.js';

const USAGE = `Usage:
  secrets-plz <ENV_NAME=secret_path> [...] -- <command> [args...]
  secrets-plz --help

Each mapping is ENV_NAME=org/project/KEY. Secrets are stored as org/project/KEY;
ENV_NAME is the variable name exposed to your command (they may differ).

Examples:
  secrets-plz GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN -- node server.js
  secrets-plz DATABASE_URL=myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL API_KEY=myorg/myapp/MYAPP_PRODUCTION_API_KEY -- node server.js
`;

function isHelpRequest(argv: string[]): boolean {
  if (argv.length === 0) {
    return true;
  }
  const dashDash = argv.indexOf('--');
  const cliArgs = dashDash === -1 ? argv : argv.slice(0, dashDash);
  return cliArgs.includes('--help') || cliArgs.includes('-h');
}

export function parseArgs(argv: string[]): {
  mapping: Record<string, string>;
  command: string[];
} {
  let args = argv;
  if (args[0] === '--') {
    args = args.slice(1);
  }

  const dashDash = args.indexOf('--');
  if (dashDash === -1) {
    throw new Error('Missing "--" separator before command');
  }

  const mappingEntries = args.slice(0, dashDash).filter((a) => a.length > 0);
  const command = args.slice(dashDash + 1);
  if (mappingEntries.length === 0) {
    throw new Error('At least one ENV_NAME=secret_path mapping is required');
  }
  if (command.length === 0) {
    throw new Error('Command is required after "--"');
  }
  return { mapping: parseEnvSecretMapping(mappingEntries), command };
}

function main(): void {
  const argv = process.argv.slice(2);
  if (isHelpRequest(argv)) {
    console.log(USAGE);
    return;
  }

  const { mapping, command } = parseArgs(argv);
  const secrets = loadSecrets(mapping, { session: '4h' });

  const [executable, ...args] = command;
  const result = spawnSync(executable!, args, {
    stdio: 'inherit',
    env: { ...process.env, ...secrets },
  });
  if (result.error) {
    throw result.error;
  }
  process.exit(result.status ?? 1);
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);

if (isMain) {
  try {
    main();
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
