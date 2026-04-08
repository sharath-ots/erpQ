/**
 * Password login against Frappe /api/method/login; returns Cookie header for subsequent REST calls.
 */
export async function frappePasswordLogin(opts) {
  const base = opts.baseUrl.replace(/\/$/, "");
  const url = `${base}/api/method/login`;
  const fetchFn = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const res = await fetchFn(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ usr: opts.usr, pwd: opts.pwd }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Frappe login failed ${res.status}: ${text.slice(0, 300)}`);
  }
  const headers = res.headers;
  const setCookies = headers.getSetCookie?.() ?? [];
  const cookie =
    setCookies.length > 0
      ? setCookies.join("; ")
      : (headers.get("set-cookie") ?? "");
  if (!cookie || !/sid=/.test(cookie)) {
    throw new Error("Frappe login: no sid in Set-Cookie");
  }
  return { cookie };
}
