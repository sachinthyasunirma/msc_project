import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SECRET_SEPARATOR = ".";
const DEFAULT_SECRET_FALLBACK = "BETTER_AUTH_SECRET";

function getSecretMaterial() {
  const directSecret = process.env.IMAP_CREDENTIAL_SECRET?.trim();
  if (directSecret) return directSecret;

  const fallbackSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (fallbackSecret) return fallbackSecret;

  throw new Error(
    `IMAP_CREDENTIAL_SECRET is required to protect stored IMAP credentials. You can reuse ${DEFAULT_SECRET_FALLBACK} in non-production environments, but a dedicated secret is recommended.`
  );
}

function getKey() {
  return createHash("sha256").update(getSecretMaterial()).digest();
}

export function encryptSecret(plainText: string) {
  const normalized = plainText.trim();
  if (!normalized) {
    throw new Error("Secret value cannot be empty.");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(
    SECRET_SEPARATOR
  );
}

export function decryptSecret(value: string) {
  const [ivPart, tagPart, dataPart] = String(value || "").split(SECRET_SEPARATOR);
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Stored secret payload is invalid.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivPart, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
