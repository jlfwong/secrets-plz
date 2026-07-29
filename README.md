# secrets-plz

An approval-based secrets loader for local development.

Use this when you want to run scripts and dev servers with real credentials, but gate every secret fetch behind biometric approval (Touch ID via [NoxKey](https://noxkey.ai/)) instead of storing API keys in `.env` files. Map env var names to secret paths, fetch values at runtime, and pass them to your process — secrets never sit on disk in plaintext.

**This is for development machines, not production.** Production workloads should use a secrets manager or platform injection (CI env vars, K8s secrets, etc.) that fits unattended deployment. secrets-plz is for the workflow where *you* are at the keyboard and approve each access.

## Requirements

- Node.js 20+
- macOS with a biometric-gated secrets backend (see [Backends](#backends))

## Install

```bash
npm install secrets-plz
# or
pnpm add secrets-plz
```

No install required — run the CLI once with [pnpx](https://pnpm.io/cli/dlx):

```bash
pnpx secrets-plz GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN -- node server.js
```

## Quick start

### Programmatic API

Map the env var names your app expects to secret paths:

```typescript
import { loadSecrets } from 'secrets-plz';

const secrets = loadSecrets({
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
  DATABASE_URL: 'myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL',
});

console.log(secrets.GH_TOKEN);
```

With TypeScript, the return type preserves your mapping keys — no `any`, no lost key names:

```typescript
const secrets = loadSecrets({
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
});
//    ^? { GH_TOKEN: string }
```

All functions are **synchronous**. Assign into `process.env` yourself if needed:

```typescript
Object.assign(process.env, secrets);
```

Secrets are typically stored as `org/project/SERVICE_ENVIRONMENT_KEY`, but tools like GitHub CLI expect names like `GH_TOKEN`. The mapping lets you bridge that gap.

### CLI

Run any command with secrets loaded dynamically:

```bash
# installed globally or as a project dependency
secrets-plz GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN -- node server.js

# one-off via pnpx (no install)
pnpx secrets-plz GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN DATABASE_URL=myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL -- node server.js
```

The CLI merges fetched secrets into the child process environment without mutating the parent shell. Multiple mappings use a single fetch call.

## Env mappings

Each entry is **`ENV_NAME=org/project/KEY`**:

| Mapping | Secret path fetched | Env var set |
|---------|---------------------|-------------|
| `GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN` | `personal/general/GITHUB_PRODUCTION_TOKEN` | `GH_TOKEN` |
| `DATABASE_URL=myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL` | `myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL` | `DATABASE_URL` |

Pass a **record** `{ ENV_NAME: secret_path }` in the API, or **`ENV_NAME=secret_path`** tokens on the CLI. The key name (last path segment) and the env var name you expose may differ.

## How it works

1. Resolves the configured secrets backend (NoxKey by default)
2. Prompts for biometric approval if the backend requires it
3. Fetches values for your secret paths after you approve
4. Parses the returned Bash handoff script directly (does not `source` it into the parent shell)
5. Returns decoded values keyed by your chosen env var names

Backend diagnostic logs are suppressed on success and only printed when a fetch fails.

## API

| Export | Description |
|--------|-------------|
| `loadSecrets(mapping, options?)` | Fetch secrets, return a record |
| `parseEnvSecretMapping(entries)` | Parse CLI-style `ENV_NAME=path` strings |
| `parseEnvSecretMappingEntry(entry)` | Parse a single `ENV_NAME=path` string |
| `validateSecretPath(path)` | Validate a secret path format |
| `SecretLoadError` | Error type for loader failures |

### Options

```typescript
loadSecrets(mapping, { session: '4h' }); // single secret path only; ignored for multiple
```

## Backends

### NoxKey (default)

The default backend uses the [NoxKey](https://noxkey.ai/) MCP server over stdio. NoxKey stores secrets in the macOS Keychain and requires Touch ID (or your configured biometric) before releasing them — so fetching a secret is an explicit, user-approved action.

**Requirements:**

- macOS with NoxKey installed and running (menu bar app)
- Secrets stored at paths like `org/project/SERVICE_ENVIRONMENT_KEY`

The MCP server lives at `/Applications/NoxKey.app/Contents/MacOS/noxkey-mcp`. Override with `NOXKEY_MCP_PATH` if needed.

Each fetch may prompt for Touch ID. With a single-path `session` option (e.g. `{ session: '4h' }`), approved access can be reused for a limited window without re-prompting.

## Dev tooling

Included scripts for exploring the NoxKey MCP server (default backend):

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
