# noxkey-env

A synchronous, [dotenv](https://github.com/motdotla/dotenv)-style loader for [NoxKey](https://noxkey.ai/) secrets over MCP.

NoxKey exposes secrets to AI agents via the Model Context Protocol (stdio). This library lets **regular scripts and CLIs** fetch those secrets too — without copying API keys into `.env` files.

## Requirements

- macOS with [NoxKey](https://noxkey.ai/) installed and running (menu bar app)
- Node.js 20+
- Secrets stored in NoxKey at paths like `org/project/ENV_VAR_NAME`

The bundled MCP server lives at `/Applications/NoxKey.app/Contents/MacOS/noxkey-mcp`. Override with `NOXKEY_MCP_PATH` if needed.

## Install

```bash
npm install noxkey-env
# or
pnpm add noxkey-env
```

## Quick start

### Programmatic API

```typescript
import { loadNoxkeyEnv } from 'noxkey-env';

// Final path segment becomes the env var name.
loadNoxkeyEnv([
  'myorg/myapp/DATABASE_URL',
  'myorg/myapp/API_KEY',
]);

console.log(process.env.DATABASE_URL);
```

All functions are **synchronous** — same ergonomics as `dotenv.config()`.

```typescript
import { fetchNoxkeySecrets } from 'noxkey-env';

const secrets = fetchNoxkeySecrets(['myorg/myapp/API_KEY']);
// => { API_KEY: '...' }  (does not mutate process.env)
```

### CLI

Run any command with secrets loaded from NoxKey:

```bash
noxkey-run myorg/myapp/DATABASE_URL myorg/myapp/API_KEY -- node server.js
```

Touch ID may prompt on first access. Array fetches use a single MCP `get` call.

## Secret paths

NoxKey paths have the form **`org/project/ENV_VAR`**:

| Secret path | Env var loaded |
|-------------|----------------|
| `myorg/myapp/DATABASE_URL` | `DATABASE_URL` |
| `myorg/myapp/API_KEY` | `API_KEY` |

Pass an **array of full paths** to fetch multiple secrets in one MCP round-trip. The final segment is always used as the environment variable name.

## How it works

1. Spawns the NoxKey MCP server over stdio
2. Calls the `get` tool with your secret paths (NoxKey MCP parameter: `account`)
3. Parses the returned Bash handoff script directly (does not `source` it into the parent shell)
4. Assigns decoded values into `process.env`

MCP diagnostic logs are suppressed on success and only printed when a `get` call fails.

## API

| Export | Description |
|--------|-------------|
| `loadNoxkeyEnv(secretPaths, options?)` | Fetch secrets and assign to `process.env` |
| `fetchNoxkeySecrets(secretPaths, options?)` | Fetch secrets, return a record |
| `callNoxkeyGetSync(secretPaths, options?)` | Low-level synchronous MCP `get` |
| `readVarsFromHandoff(path, varNames)` | Parse a handoff script on disk |
| `connectNoxkeyMcp(options?)` | Async MCP client for interactive tooling |
| `NoxkeyEnvLoadError` | Error type for loader failures |

### Options

```typescript
loadNoxkeyEnv(paths, { session: '4h' }); // single-path only; ignored for arrays
```

## Dev tooling

Included scripts for exploring the NoxKey MCP server:

```bash
pnpm explore   # interactive REPL (tools, call, schema, …)
pnpm probe     # dump server info and tool schemas
pnpm fetch-key # show + get a single path (debug)
```

## Development

```bash
pnpm install
pnpm test
```

## License

UNLICENSED — license TBD before public release.
