import { createHash, randomBytes } from "node:crypto";

function base64Url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkcePair() {
  const codeVerifier = base64Url(randomBytes(32));
  const codeChallenge = base64Url(
    createHash("sha256").update(codeVerifier).digest(),
  );
  return { codeVerifier, codeChallenge };
}

export function randomState() {
  return base64Url(randomBytes(24));
}
