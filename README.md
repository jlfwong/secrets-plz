# noxkey

A synchronous, [dotenv](https://github.com/motdotla/dotenv)-style loader for [NoxKey](https://noxkey.ai/) secrets over MCP.

NoxKey exposes secrets to AI agents via the Model Context Protocol (stdio). This library lets **regular scripts and CLIs** fetch those secrets too — without copying API keys into `.env` files.

## Requirements

- macOS with [NoxKey](https://noxkey.ai/) installed and running (menu bar app)
- Node.js 20+
- Secrets stored in NoxKey at paths like `org/project/SERVICE_ENVIRONMENT_KEY`

The bundled MCP server lives at `/Applications/NoxKey.app/Contents/MacOS/noxkey-mcp`. Override with `NOXKEY_MCP_PATH` if needed.

## Install

```bash
npm install noxkey
# or
pnpm add noxkey
```

No install required — run the CLI once with [pnpx](https://pnpm.io/cli/dlx):

```bash
pnpx noxkey GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN -- node server.js
```

## Quick start

### Programmatic API

Map the env var names your app expects to NoxKey secret paths:

```typescript
import { loadNoxkeyEnv } from 'noxkey';

loadNoxkeyEnv({
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
  DATABASE_URL: 'myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL',
});

console.log(process.env.GH_TOKEN);
```

All functions are **synchronous** — same ergonomics as `dotenv.config()`.

```typescript
import { fetchNoxkeySecrets } from 'noxkey';

const secrets = fetchNoxkeySecrets({
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
});
// => { GH_TOKEN: '...' }  (does not mutate process.env)
```

NoxKey stores keys as `org/project/SERVICE_ENVIRONMENT_KEY`, but tools like GitHub CLI expect names like `GH_TOKEN`. The mapping lets you bridge that gap.

### CLI

Run any command with secrets loaded from NoxKey:

```bash
# installed globally or as a project dependency
noxkey GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN -- node server.js

# one-off via pnpx (no install)
pnpx noxkey GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN DATABASE_URL=myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL -- node server.js
```

Touch ID may prompt on first access. Multiple mappings use a single MCP `get` call.

## Env mappings

Each entry is **`ENV_NAME=org/project/KEY`**:

| Mapping | NoxKey path fetched | Env var set |
|---------|---------------------|-------------|
| `GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN` | `personal/general/GITHUB_PRODUCTION_TOKEN` | `GH_TOKEN` |
| `DATABASE_URL=myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL` | `myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL` | `DATABASE_URL` |

Pass a **record** `{ ENV_NAME: secret_path }` in the API, or **`ENV_NAME=secret_path`** tokens on the CLI. The NoxKey key name (last path segment) and the env var name you expose may differ.

## How it works

1. Spawns the NoxKey MCP server over stdio
2. Calls the `get` tool with your secret paths (NoxKey MCP parameter: `account`)
3. Parses the returned Bash handoff script directly (does not `source` it into the parent shell)
4. Assigns decoded values into `process.env` under your chosen env var names

MCP diagnostic logs are suppressed on success and only printed when a `get` call fails.

## API

| Export | Description |
|--------|-------------|
| `loadNoxkeyEnv(mapping, options?)` | Fetch secrets and assign to `process.env` |
| `fetchNoxkeySecrets(mapping, options?)` | Fetch secrets, return a record |
| `callNoxkeyGetSync(secretPaths, options?)` | Low-level synchronous MCP `get` |
| `parseEnvSecretMapping(entries)` | Parse CLI-style `ENV_NAME=path` strings |
| `readVarsFromHandoff(path, varNames)` | Parse a handoff script on disk |
| `connectNoxkeyMcp(options?)` | Async MCP client for interactive tooling |
| `NoxkeyLoadError` | Error type for loader failures |

### Options

```typescript
loadNoxkeyEnv(mapping, { session: '4h' }); // single secret path only; ignored for multiple
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

MIT — see [LICENSE](./LICENSE).
