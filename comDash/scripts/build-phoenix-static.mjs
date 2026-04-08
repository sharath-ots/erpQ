import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "docs", "sample-admin-dashboard", "index.html");
const out = path.join(root, "public", "phoenix", "index.html");

let c = fs.readFileSync(src, "utf8");
c = c.replace(/href="assets\//g, 'href="/phoenix/assets/');
c = c.replace(/src="assets\//g, 'src="/phoenix/assets/');
c = c.replace(/href="vendors\//g, 'href="/phoenix/vendors/');
c = c.replace(/src="vendors\//g, 'src="/phoenix/vendors/');
c = c.replace(
  /href="\.\.\/\.\.\/css2\?family=/g,
  'href="https://fonts.googleapis.com/css2?family=',
);
c = c.replace(
  /<link rel="stylesheet" href="\.\.\/\.\.\/release\/v4\.0\.8\/css\/line\.css">/,
  "<!-- line icons bundle omitted; feather replaces icons at runtime -->",
);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, c, "utf8");
console.log("Wrote", out, "bytes", Buffer.byteLength(c, "utf8"));
