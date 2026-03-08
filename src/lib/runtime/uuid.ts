export function createUuid() {
  const maybeCrypto = globalThis.crypto as Crypto | undefined;
  if (maybeCrypto && typeof maybeCrypto.randomUUID === "function") {
    return maybeCrypto.randomUUID();
  }

  // Fallback for older runtimes.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
