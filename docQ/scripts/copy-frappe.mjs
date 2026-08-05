import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const target = path.join(root, "vendor", "frapperestq");

const candidates = [
  path.join(root, "..", "frappeRestQ"),
  path.join("/frappeRestQ"),
];

let frappeSrc = null;
for (const c of candidates) {
  if (existsSync(path.join(c, "src", "index.js")) || existsSync(path.join(c, "package.json"))) {
    frappeSrc = c;
    break;
  }
}

if (existsSync(target)) {
  rmSync(target, { recursive: true });
}
mkdirSync(path.dirname(target), { recursive: true });

if (frappeSrc) {
  cpSync(frappeSrc, target, { recursive: true });
  console.log("copy-frappe:", frappeSrc, "-> docQ/vendor/frapperestq");
} else {
  console.warn("copy-frappe: frappeRestQ not found");
}
