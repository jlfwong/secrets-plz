import type { LoadedSecrets, SecretMapping } from './types.js';

type InlineMapping = {
  GH_TOKEN: 'personal/general/GITHUB_PRODUCTION_TOKEN';
  DATABASE_URL: 'myorg/myapp/MYAPP_PRODUCTION_DATABASE_URL';
};

type InlineSecrets = LoadedSecrets<InlineMapping>;

type AssertInlineKeys = InlineSecrets extends {
  GH_TOKEN: string;
  DATABASE_URL: string;
}
  ? {
      GH_TOKEN: string;
      DATABASE_URL: string;
    } extends InlineSecrets
    ? true
    : false
  : false;
void (true as AssertInlineKeys);

type WidenedSecrets = LoadedSecrets<SecretMapping>;
type AssertWidened = WidenedSecrets extends Record<string, string>
  ? Record<string, string> extends WidenedSecrets
    ? true
    : false
  : false;
void (true as AssertWidened);
