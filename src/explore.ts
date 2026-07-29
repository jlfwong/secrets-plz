/**
 * Interactive REPL for exploring the NoxKey MCP server over stdio.
 *
 * Commands:
 *   help                         Show available commands
 *   tools                        List registered tools
 *   schema <tool>                Show a tool's input schema
 *   call <tool> [<json>]         Call a tool (json defaults to {})
 *   resources                    List resources
 *   read <uri>                   Read a resource by URI
 *   prompts                      List prompts
 *   quit | exit                  Disconnect and exit
 */
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { connectNoxkeyMcp, resolveNoxkeyMcpCommand } from './connect.js';

function printHelp(): void {
  console.log(`
Commands:
  help                         Show this help
  tools                        List registered tools
  schema <tool>                Show a tool's input schema
  call <tool> [<json>]         Call a tool (json defaults to {})
  resources                    List resources
  read <uri>                   Read a resource by URI
  prompts                      List prompts
  quit | exit                  Disconnect and exit
`);
}

function parseJsonArg(raw: string | undefined): Record<string, unknown> {
  if (!raw || raw.trim() === '') {
    return {};
  }
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Tool arguments must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}

async function main(): Promise<void> {
  const { command, args } = resolveNoxkeyMcpCommand();
  console.log(`NoxKey MCP explorer — stdio transport`);
  console.log(`Server: ${command} ${args.join(' ')}`);
  console.log(`Ensure the NoxKey menu bar app is running.\n`);

  const { client } = await connectNoxkeyMcp();
  const serverVersion = client.getServerVersion();
  if (serverVersion) {
    console.log(`Connected to ${serverVersion.name} v${serverVersion.version}\n`);
  }

  const rl = readline.createInterface({ input, output, terminal: true });
  printHelp();

  try {
    while (true) {
      const line = (await rl.question('noxkey> ')).trim();
      if (!line) {
        continue;
      }

      const tokens = line.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
      const [cmdRaw, ...rest] = tokens;
      const cmd = cmdRaw?.toLowerCase();

      try {
        switch (cmd) {
          case 'help':
          case '?':
            printHelp();
            break;

          case 'quit':
          case 'exit':
            return;

          case 'tools': {
            const { tools } = await client.listTools();
            console.log(`Tools (${tools.length}):`);
            for (const tool of tools) {
              const desc = tool.description ? ` — ${tool.description.split('\n')[0]}` : '';
              console.log(`  ${tool.name}${desc}`);
            }
            break;
          }

          case 'schema': {
            const toolName = rest[0]?.replace(/^['"]|['"]$/g, '');
            if (!toolName) {
              console.log('Usage: schema <tool>');
              break;
            }
            const { tools } = await client.listTools();
            const tool = tools.find((t) => t.name === toolName);
            if (!tool) {
              console.log(`Unknown tool: ${toolName}`);
              break;
            }
            console.log(JSON.stringify(tool.inputSchema, null, 2));
            break;
          }

          case 'call': {
            const toolName = rest[0]?.replace(/^['"]|['"]$/g, '');
            if (!toolName) {
              console.log('Usage: call <tool> [<json>]');
              break;
            }
            const jsonRaw = rest.slice(1).join(' ').replace(/^['"]|['"]$/g, '');
            const arguments_ = parseJsonArg(jsonRaw);
            const result = await client.callTool({ name: toolName, arguments: arguments_ });
            console.log(JSON.stringify(result, null, 2));
            break;
          }

          case 'resources': {
            const { resources } = await client.listResources();
            console.log(`Resources (${resources.length}):`);
            for (const resource of resources) {
              console.log(`  ${resource.uri}${resource.name ? ` (${resource.name})` : ''}`);
            }
            break;
          }

          case 'read': {
            const uri = rest[0]?.replace(/^['"]|['"]$/g, '');
            if (!uri) {
              console.log('Usage: read <uri>');
              break;
            }
            const { contents } = await client.readResource({ uri });
            console.log(JSON.stringify(contents, null, 2));
            break;
          }

          case 'prompts': {
            const { prompts } = await client.listPrompts();
            console.log(`Prompts (${prompts.length}):`);
            for (const prompt of prompts) {
              console.log(`  ${prompt.name}: ${prompt.description ?? ''}`);
            }
            break;
          }

          default:
            console.log(`Unknown command: ${cmd}. Type 'help' for commands.`);
        }
      } catch (err: unknown) {
        console.error(err instanceof Error ? err.message : err);
      }
    }
  } finally {
    rl.close();
    await client.close();
    console.log('Disconnected.');
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
