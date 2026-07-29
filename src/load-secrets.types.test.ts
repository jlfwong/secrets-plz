import { loadSecrets } from './load-secrets.js';
import type { LoadedSecrets } from './load-secrets.js';

// Preserve literal env var keys from inline mappings.
const secrets = loadSecrets({
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
  DATABASE_URL: 'myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL',
});

secrets.GH_TOKEN satisfies string;
secrets.DATABASE_URL satisfies string;
// @ts-expect-error unknown key
secrets.UNKNOWN;

type Expected = LoadedSecrets<{
  GH_TOKEN: string;
  DATABASE_URL: string;
}>;
type Actual = typeof secrets;
type AssertLoadedSecrets = Actual extends Expected
  ? Expected extends Actual
    ? true
    : false
  : false;
void (true as AssertLoadedSecrets);

// Widen when mapping is not a literal.
const mapping: Record<string, string> = {
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN',
};
const widened = loadSecrets(mapping);
void widened.GH_TOKEN;
