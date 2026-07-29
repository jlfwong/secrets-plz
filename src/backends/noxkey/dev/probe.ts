/**
 * Non-interactive probe: connect, print server info + tool schemas, exit.
 * Useful for CI or quick inspection without the REPL.
 */
import {
  connectNoxkeyMcp,
  resolveNoxkeyMcpCommand,
} from '../connect.js';

async function main(): Promise<void> {
  const { command, args } = resolveNoxkeyMcpCommand();
  console.log(`Connecting to NoxKey MCP via stdio: ${command} ${args.join(' ')}`);

  const { client } = await connectNoxkeyMcp();
  try {
    const serverVersion = client.getServerVersion();
    if (serverVersion) {
      console.log('\n=== Server ===');
      console.log(JSON.stringify(serverVersion, null, 2));
    }

    const capabilities = client.getServerCapabilities();
    if (capabilities) {
      console.log('\n=== Capabilities ===');
      console.log(JSON.stringify(capabilities, null, 2));
    }

    const { tools } = await client.listTools();
    console.log(`\n=== Tools (${tools.length}) ===`);
    for (const tool of tools) {
      console.log(`\n--- ${tool.name} ---`);
      if (tool.description) {
        console.log(tool.description);
      }
      console.log('inputSchema:', JSON.stringify(tool.inputSchema, null, 2));
    }

    try {
      const { resources } = await client.listResources();
      console.log(`\n=== Resources (${resources.length}) ===`);
      for (const resource of resources) {
        console.log(`- ${resource.name ?? resource.uri}: ${resource.uri}`);
      }
    } catch {
      console.log('\n=== Resources: none or unsupported ===');
    }

    try {
      const { prompts } = await client.listPrompts();
      console.log(`\n=== Prompts (${prompts.length}) ===`);
      for (const prompt of prompts) {
        console.log(`- ${prompt.name}: ${prompt.description ?? ''}`);
      }
    } catch {
      console.log('\n=== Prompts: none or unsupported ===');
    }
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
