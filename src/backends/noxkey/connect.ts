import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const DEFAULT_NOXKEY_MCP_PATH =
  '/Applications/NoxKey.app/Contents/MacOS/noxkey-mcp';

export type NoxkeyMcpClient = Client;

export type ConnectNoxkeyMcpOptions = {
  /** Pipe noxkey-mcp stderr away from the parent; retrieve via getMcpStderr(). */
  quiet?: boolean;
};

export type NoxkeyMcpConnection = {
  client: NoxkeyMcpClient;
  getMcpStderr: () => string;
};

export function resolveNoxkeyMcpCommand(): {
  command: string;
  args: string[];
} {
  const override = process.env.NOXKEY_MCP_PATH;
  if (override) {
    return { command: override, args: [] };
  }
  return { command: DEFAULT_NOXKEY_MCP_PATH, args: [] };
}

export async function connectNoxkeyMcp(
  options: ConnectNoxkeyMcpOptions = {},
): Promise<NoxkeyMcpConnection> {
  const { command, args } = resolveNoxkeyMcpCommand();
  const client = new Client({
    name: 'secrets-plz',
    version: '0.0.1',
  });
  const transport = new StdioClientTransport({
    command,
    args,
    stderr: options.quiet ? 'pipe' : 'inherit',
  });

  const stderrChunks: Buffer[] = [];
  if (options.quiet) {
    transport.stderr?.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });
  }

  await client.connect(transport);

  return {
    client,
    getMcpStderr: () => Buffer.concat(stderrChunks).toString('utf8'),
  };
}
