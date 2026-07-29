import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  envVarNameFromSecretPath,
  parseHandoffPath,
  parseLoadedVarNames,
} from './secret-paths.js';

describe('envVarNameFromSecretPath', () => {
  it('returns the last path segment', () => {
    assert.equal(
      envVarNameFromSecretPath('myorg/myapp/DATABASE_URL'),
      'DATABASE_URL',
    );
  });

  it('rejects paths without project segment', () => {
    assert.throws(
      () => envVarNameFromSecretPath('DATABASE_URL'),
      /org\/project/,
    );
  });
});

describe('parseHandoffPath', () => {
  it('extracts a single-quoted source path', () => {
    const text = `Secret ready. Run this immediately in Bash:
  source '/tmp/noxkey/secrets.sh'
Loads: $EXAMPLE_API_KEY`;
    assert.equal(parseHandoffPath(text), '/tmp/noxkey/secrets.sh');
  });
});

describe('parseLoadedVarNames', () => {
  it('parses space-separated var names', () => {
    const text = 'Loads: $DATABASE_URL $API_KEY';
    assert.deepEqual(parseLoadedVarNames(text), ['DATABASE_URL', 'API_KEY']);
  });

  it('parses comma-separated var names', () => {
    const text = 'Loads: $DATABASE_URL, $API_KEY';
    assert.deepEqual(parseLoadedVarNames(text), ['DATABASE_URL', 'API_KEY']);
  });
});
