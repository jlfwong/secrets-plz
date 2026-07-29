import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseArgs } from './run.js';

describe('parseArgs', () => {
  it('parses mappings and command after --', () => {
    assert.deepEqual(
      parseArgs([
        'GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN',
        '--',
        'node',
        '-h',
      ]),
      {
        mapping: {
          GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
        },
        command: ['node', '-h'],
      },
    );
  });

  it('does not treat -h after -- as a noxkey flag', () => {
    const { command } = parseArgs([
      'API_KEY=myorg/myapp/MYAPP_PRODUCTION_API_KEY',
      '--',
      'node',
      '-h',
    ]);
    assert.deepEqual(command, ['node', '-h']);
  });
});
