import { createHash, randomBytes } from "node:crypto";

export function generateApiKey(): {
  key: string;
  prefix: string;
  keyHash: string;
} {
  const raw = randomBytes(24).toString("hex");
  const key = `adflow_${raw}`;
  const prefix = key.slice(0, 14);
  const keyHash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, keyHash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}
