import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseHandoffPath, parseLoadedVarNames } from './response.js';

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
