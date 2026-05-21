import crypto from "node:crypto";

function keyFromB64(b64) {
  if (!b64) return null;
  const raw = Buffer.from(b64, "base64");
  if (raw.length !== 32) {
    throw new Error("DOCQ_TOKEN_ENC_KEY_B64 must decode to 32 bytes");
  }
  return raw;
}

export function encryptString(plain, keyB64) {
  const key = keyFromB64(keyB64);
  if (!key) {
    throw new Error("Token encryption key missing (DOCQ_TOKEN_ENC_KEY_B64)");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    alg: "aes-256-gcm",
    iv_b64: iv.toString("base64"),
    tag_b64: tag.toString("base64"),
    ciphertext_b64: ciphertext.toString("base64"),
  };
}

export function decryptString(box, keyB64) {
  const key = keyFromB64(keyB64);
  if (!key) {
    throw new Error("Token encryption key missing (DOCQ_TOKEN_ENC_KEY_B64)");
  }
  if (!box || box.alg !== "aes-256-gcm") {
    throw new Error("Unsupported ciphertext format");
  }
  const iv = Buffer.from(box.iv_b64, "base64");
  const tag = Buffer.from(box.tag_b64, "base64");
  const ciphertext = Buffer.from(box.ciphertext_b64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString("utf8");
}

