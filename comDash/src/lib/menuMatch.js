/**
 * Avoid /m/crm matching /m/crmq — require exact path or a subpath segment.
 * Supports nested `children` from apiGate portal menu (crmQ submenu).
 * Parents with `children` only match on exact `pathname === path` (not prefix),
 * so `/m/crmq/list/...` does not resolve to the CRM group node.
 */
export function findMenuItem(menuItems, pathname) {
  if (!menuItems?.length) return undefined;

  function matches(node) {
    if (!node.path) return false;
    if (pathname === node.path) return true;
    if (node.children?.length) return false;
    return pathname.startsWith(`${node.path}/`);
  }

  function walk(nodes) {
    for (const m of nodes) {
      if (m.children?.length) {
        const inner = walk(m.children);
        if (inner) return inner;
      }
      if (matches(m)) return m;
    }
    return undefined;
  }

  const direct = walk(menuItems);
  if (direct) return direct;

  const leaves = flattenMenuLeaves(menuItems);
  const hits = leaves.filter(
    (m) =>
      m.path &&
      (pathname === m.path || pathname.startsWith(`${m.path}/`)),
  );
  if (!hits.length) return undefined;
  return hits.sort((a, b) => b.path.length - a.path.length)[0];
}

/** Flatten leaves for debugging or analytics */
export function flattenMenuLeaves(menuItems, out = []) {
  if (!menuItems?.length) return out;
  for (const m of menuItems) {
    if (m.children?.length) flattenMenuLeaves(m.children, out);
    else out.push(m);
  }
  return out;
}
