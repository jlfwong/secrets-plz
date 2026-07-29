/**
 * Subprocess entrypoint: read { secret_paths, options } from stdin, write get result JSON to stdout.
 * Invoked synchronously by the parent via execFileSync.
 */
import { connectNoxkeyMcp } from './connect.js';
import { mcpTextContent } from './secret-paths.js';
import type { LoadNoxkeyEnvOptions } from './load-env.js';

type ChildInput = {
  secret_paths: string[];
  options?: LoadNoxkeyEnvOptions;
};

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function writeMcpStderrOnFailure(getMcpStderr: () => string): void {
  const log = getMcpStderr().trim();
  if (log.length > 0) {
    process.stderr.write(`${log}\n`);
  }
}

async function main(): Promise<void> {
  const input = JSON.parse(await readStdin()) as ChildInput;
  const { secret_paths, options = {} } = input;

  const arguments_: Record<string, unknown> = { account: secret_paths };
  if (secret_paths.length === 1 && options.session !== undefined) {
    arguments_.session = options.session;
  }

  let getMcpStderr = (): string => '';
  try {
    const connection = await connectNoxkeyMcp({ quiet: true });
    getMcpStderr = connection.getMcpStderr;
    const { client } = connection;
    try {
      const result = (await client.callTool({
        name: 'get',
        arguments: arguments_,
      })) as {
        content?: Array<{ type: string; text?: string }>;
        isError?: boolean;
      };

      if (result.isError) {
        writeMcpStderrOnFailure(getMcpStderr);
      }

      process.stdout.write(
        JSON.stringify({
          text: mcpTextContent(result),
          isError: result.isError === true,
        }),
      );
    } finally {
      await client.close();
    }
  } catch (err: unknown) {
    writeMcpStderrOnFailure(getMcpStderr);
    throw err;
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
