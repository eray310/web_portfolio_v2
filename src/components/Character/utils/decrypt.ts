async function generateAESKey(password: string): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);
  const hashedPassword = await crypto.subtle.digest("SHA-256", passwordBuffer);
  return crypto.subtle.importKey(
    "raw",
    hashedPassword.slice(0, 32),
    { name: "AES-CBC" },
    false,
    ["encrypt", "decrypt"]
  );
}

export const decryptFile = async (
  url: string,
  password: string
): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url} (HTTP ${response.status})`);
  }
  const encryptedData = await response.arrayBuffer();
  const iv = new Uint8Array(encryptedData.slice(0, 16));
  const data = encryptedData.slice(16);

  // Web Crypto only exists in secure contexts (https or localhost). On a plain
  // http network address (e.g. the dev server opened from a phone) use the
  // plain JavaScript implementation instead.
  if (!globalThis.crypto?.subtle) {
    const { sha256, aesCbcDecrypt } = await import("./aesFallback");
    const key = sha256(new TextEncoder().encode(password));
    return aesCbcDecrypt(key, iv, new Uint8Array(data));
  }

  const key = await generateAESKey(password);
  return crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, data);
};
