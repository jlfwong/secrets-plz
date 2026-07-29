import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decodeBashAssignmentValue,
  findAssignmentRhs,
} from './handoff-parse.js';

describe('decodeBashAssignmentValue', () => {
  it('decodes NoxKey over-escaped simple values', () => {
    assert.equal(
      decodeBashAssignmentValue("''\\''sk_live_abc123'"),
      'sk_live_abc123',
    );
  });

  it('decodes simple single-quoted values', () => {
    assert.equal(decodeBashAssignmentValue("'secret_value'"), 'secret_value');
  });
});

describe('findAssignmentRhs', () => {
  it('finds bare and export assignments', () => {
    const script = [
      '# comment',
      "API_KEY=''\\''sk_test'",
      "export DATABASE_URL='postgres://localhost'",
    ].join('\n');
    assert.equal(findAssignmentRhs(script, 'API_KEY'), "''\\''sk_test'");
    assert.equal(
      findAssignmentRhs(script, 'DATABASE_URL'),
      "'postgres://localhost'",
    );
  });
});
