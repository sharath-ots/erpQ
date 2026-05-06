export function GET() {
  // Must be evaluated at request time (not baked at `next build`).
  const env = process.env;
  const payload = {
    apigate: (env && env["AUTH_WEB_RUNTIME_APIGATE"]) || "",
    comdash: (env && env["AUTH_WEB_RUNTIME_COMDASH"]) || "",
    authq: (env && env["AUTH_WEB_RUNTIME_AUTHQ"]) || "",
  };

  return new Response(`window.__AUTH_WEB_PUBLIC__=${JSON.stringify(payload)};`, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

