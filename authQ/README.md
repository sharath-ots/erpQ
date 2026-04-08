# authQ (`@cityq/authq`)

**Identity / access** service: central place for JWT issuance (via `@fastify/jwt`), OIDC discovery stubs, and future **RBAC/ABAC** policy evaluation for **apiGate** and BFFs.

## Layout

```
src/
  routes/
    health.ts
    oauth.ts      # OIDC metadata + token endpoints (stubs)
    policy.ts     # Authorization decisions (stub)
  rbac/
    roles.ts      # Role identifiers
  index.ts
```

## Environment

- `PORT` (default `4100`)
- `JWT_SECRET` — **required in production** (use Vault / K8s Secret)
- `OIDC_ISSUER` — public issuer URL when fronting a real IdP

## Container

```bash
docker build -t cityq/authq:latest .
```

Integrate with your IdP (SSO, MFA, LDAP/AD) by replacing stub routes with real OAuth2/OIDC handlers or delegating to Keycloak/Azure AD.
