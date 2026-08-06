import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const dist = path.join(root, "dist");

if (existsSync(dist)) {
  rmSync(dist, { recursive: true });
}
mkdirSync(dist, { recursive: true });
cpSync(src, dist, { recursive: true });
cpSync(path.join(root, "migrations"), path.join(dist, "migrations"), {
  recursive: true,
});
const vendor = path.join(root, "vendor");
if (existsSync(vendor)) {
  cpSync(vendor, path.join(dist, "vendor"), { recursive: true });
}
console.log("sync-dist: src + migrations + vendor -> dist");

