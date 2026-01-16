export function createCorrelationId(): string {
  // Preferir UUID nativo do browser
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  // Fallback: UUID v4 simples (não criptográfico, mas suficiente para correlação)
  const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}


