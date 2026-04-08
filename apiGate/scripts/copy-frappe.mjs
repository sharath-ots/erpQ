/**
 * Windows-friendly copy of frappeRestQ into node_modules (avoids symlink EPERM on some drives).
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiGateRoot = path.join(__dirname, "..");
const frappeSrc = path.join(apiGateRoot, "..", "frappeRestQ");
const dest = path.join(apiGateRoot, "node_modules", "@cityq", "frapperestq");

if (!existsSync(frappeSrc)) {
  console.warn("copy-frappe: frappeRestQ not found at", frappeSrc);
  process.exit(0);
}
mkdirSync(path.dirname(dest), { recursive: true });
cpSync(frappeSrc, dest, { recursive: true });
console.log("copy-frappe: synced frappeRestQ ->", dest);
