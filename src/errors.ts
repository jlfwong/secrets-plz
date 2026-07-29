export class SecretLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretLoadError';
  }
}
