/**
 * Validates a Zoho OAuth access token and returns profile fields.
 * @see https://www.zoho.com/accounts/protocol/oauth/userinfo.html
 */
export async function fetchZohoUserInfo(
  accessToken,
  accountsBase,
  userinfoPath,
) {
  const url = `${accountsBase}${userinfoPath.startsWith("/") ? "" : "/"}${userinfoPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new ZohoAuthError(
      res.status,
      `Zoho userinfo not JSON: ${text.slice(0, 200)}`,
    );
  }
  if (!res.ok) {
    throw new ZohoAuthError(
      res.status,
      typeof body === "object" && body && "error" in body
        ? String(body.error)
        : JSON.stringify(body),
    );
  }
  return body;
}

export function zohoPrimaryEmail(profile) {
  const e = profile.Email ?? profile.email;
  if (typeof e === "string" && e.includes("@")) return e.toLowerCase();
  throw new ZohoAuthError(400, "Zoho profile has no email");
}

export class ZohoAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ZohoAuthError";
    this.status = status;
  }
}
