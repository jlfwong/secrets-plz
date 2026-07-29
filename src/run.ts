import { spawnSync } from 'node:child_process';
import { loadNoxkeyEnv } from './load-env.js';

const USAGE = `Usage:
  noxkey-run <secret_path> [...] -- <command> [args...]
  noxkey-run --help

Each <secret_path> is an org/project/ENV_VAR path. The final segment becomes the
environment variable name loaded into the child process.

Examples:
  noxkey-run myorg/myapp/DATABASE_URL myorg/myapp/API_KEY -- node server.js
  noxkey-run myorg/myapp/API_KEY -- node -e "console.log(process.env.API_KEY?.slice(0,4)+'...')"
`;

function parseArgs(argv: string[]): {
  secretPaths: string[];
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

  const secretPathArgs = args.slice(0, dashDash).filter((a) => a.length > 0);
  const command = args.slice(dashDash + 1);
  if (secretPathArgs.length === 0) {
    throw new Error('At least one NoxKey secret_path is required');
  }
  if (command.length === 0) {
    throw new Error('Command is required after "--"');
  }
  return { secretPaths: secretPathArgs, command };
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const { secretPaths, command } = parseArgs(argv);
  loadNoxkeyEnv(secretPaths, { session: '4h' });

  const [executable, ...args] = command;
  const result = spawnSync(executable!, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    throw result.error;
  }
  process.exit(result.status ?? 1);
}

try {
  main();
} catch (err: unknown) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
