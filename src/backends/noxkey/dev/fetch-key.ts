import { connectNoxkeyMcp } from '../connect.js';

async function main(): Promise<void> {
  const secretPath =
    process.argv[2] ?? 'myorg/myapp/EXAMPLE_API_KEY';

  const { client } = await connectNoxkeyMcp();
  try {
    console.log(`=== show: ${secretPath} ===`);
    const show = await client.callTool({
      name: 'show',
      arguments: { account: secretPath },
    });
    console.log(JSON.stringify(show, null, 2));

    console.log(`\n=== get: ${secretPath} ===`);
    const get = await client.callTool({
      name: 'get',
      arguments: { account: secretPath, session: '4h' },
    });
    console.log(JSON.stringify(get, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
