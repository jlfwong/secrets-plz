import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  parseEnvSecretMapping,
  parseEnvSecretMappingEntry,
} from './mapping.js';

describe('parseEnvSecretMappingEntry', () => {
  it('parses ENV_NAME=secret_path', () => {
    assert.deepEqual(
      parseEnvSecretMappingEntry(
        'GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN',
      ),
      {
        envName: 'GH_TOKEN',
        secretPath: 'personal/general/GITHUB_PRODUCTION_TOKEN',
      },
    );
  });

  it('rejects entries without =', () => {
    assert.throws(
      () => parseEnvSecretMappingEntry('GH_TOKEN'),
      /ENV_NAME=secret_path/,
    );
  });
});

describe('parseEnvSecretMapping', () => {
  it('builds a record from multiple entries', () => {
    assert.deepEqual(
      parseEnvSecretMapping([
        'GH_TOKEN=personal/general/GITHUB_PRODUCTION_TOKEN',
        'DATABASE_URL=myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL',
      ]),
      {
        GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
        DATABASE_URL: 'myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL',
      },
    );
  });
});
