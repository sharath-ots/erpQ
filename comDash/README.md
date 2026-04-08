# comDash (`@cityq/comdash`)

Next.js **central portal**: Ant Design + Tailwind shell, sidebar navigation, and a **module registry** used to lazy-load or route to ERP modules (micro-frontends, iframes, or internal routes).

## Layout

```
src/
  app/
    layout.tsx          # Root layout + Ant Design registry
    page.tsx            # Landing (portal shell)
    globals.css
    m/[moduleId]/       # Dynamic module routes (shell + outlet)
  components/
    portal/
      moduleRegistry.ts # Declarative modules (extend with RBAC / remotes)
      PortalShell.tsx   # Header + sider + content
      ModuleOutlet.tsx  # Renders active module placeholder
```

## Scripts

- `npm run dev` — development server (port 3000)
- `npm run build` — production build (`output: "standalone"` for Docker)
- `npm start` — serve production build locally

## Container

Build expects Next **standalone** output (configured in `next.config.ts`).

```bash
docker build -t cityq/comdash:latest .
```

## Kubernetes

See `k8s/` — front with Ingress/Ingress Controller and point `NEXT_PUBLIC_*` via ConfigMap when adding client env.
