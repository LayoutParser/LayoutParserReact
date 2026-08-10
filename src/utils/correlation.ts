export function createCorrelationId(): string {
  // Preferir UUID nativo do browser
  // Tipado como possivelmente ausente de propósito: `crypto.randomUUID` não existe em
  // navegadores antigos nem em contexto não-seguro (HTTP sem TLS), daí o fallback abaixo.
  const cryptoObj: Crypto | undefined = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  // Fallback: UUID v4 simples (não criptográfico, mas suficiente para correlação)
  const rnd = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}
