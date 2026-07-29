import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { envVarNameFromSecretPath } from './paths.js';

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
