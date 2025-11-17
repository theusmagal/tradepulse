
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

function getKey(): Buffer {
  const b64 = process.env.DATA_KEY;
  const hex = process.env.APP_ENCRYPTION_KEY;

  let key: Buffer | null = null;
  if (b64) key = Buffer.from(b64, "base64");
  else if (hex) key = Buffer.from(hex, "hex");

  if (!key) {
    throw new Error(
      "Missing encryption key: set DATA_KEY (base64) or APP_ENCRYPTION_KEY (hex)."
    );
  }
  if (key.length !== 32) {
    throw new Error(`Encryption key must be 32 bytes, got ${key.length}.`);
  }
  return key;
}

const ALG = "aes-256-gcm";

export function encrypt(plain: string): string {
  const KEY = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(b64: string): string {
  const KEY = getKey();
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);

  const decipher = createDecipheriv(ALG, KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}
