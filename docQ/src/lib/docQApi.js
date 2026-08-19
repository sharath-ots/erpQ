/** docQ API paths via apiGate WorkDrive partner proxy. */
export const DOCQ_API = "/api/v1/partners/workdrive/api/v1/docs";

export function docPath(subpath) {
  const p = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${DOCQ_API}${p}`;
}
