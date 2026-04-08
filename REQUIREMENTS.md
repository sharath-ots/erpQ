# High-Level Requirements (Reference)

Condensed from the specification for implementation alignment. Source of truth remains the full stakeholder document.

## Scope

- Central digital backbone for automotive operations; unified procurement, manufacturing, inventory, sales, HR, CRM, support, finance.
- Core ERP modules (HR, Sales, Purchase, Manufacturing, CRM, Support, Inventory, Finance).
- Stakeholder portals (employees, customers, dealers, suppliers, partners, externals).
- IAM with SSO; API governance; workflows; documents; notifications; compliance reporting.
- Legacy on-prem excluded unless integrated via API Gateway.

## Business

- End-to-end digitization; supply chain visibility; real-time control; workflow automation.
- Multi-tenant / multi-client; scalable onboarding (units, geographies, integrations).

## Stakeholders (summary)

- Internal: admins, finance, warehouse, managers/approvers, report viewers.
- Employees: HR self-service, payroll, training, timesheets, assets.
- Customers, dealers, suppliers, externals (auditors, logistics, regulators, banks, consultants).
- Partners: sales and service (leads, orders, field service, warranty, etc.).

## Shared services

- Workflow engine; reporting & analytics; notifications (email, SMS, WhatsApp, push, in-app); document service.

## Non-functional

- SSO; RBAC/ABAC; audit trails; API versioning, rate limits, docs; 99.9% uptime; sub-2s API p95; horizontal scale; GDPR; encryption; CI/CD zero-downtime.

## Technology (target stack)

- Frontend: React, Next.js, Tailwind, Ant Design, Recharts/D3.
- Backend: Node (Express/Fastify); ERPNext/Frappe for business logic when integrated.
- Data: MariaDB (OLTP), PostgreSQL (analytics), Redis; MinIO/S3.
- Messaging: RabbitMQ (AMQP, pub/sub, sagas).
- Ops: Docker, Harbor, K8s, GitHub Actions/GitLab CI, Prometheus/Grafana/Loki/Tempo, Vault, WAF.

## Integration

- REST, async messaging, event sagas, webhooks, ETL, gRPC; external failures must not break core ERP.

## Security & compliance

- Zero-trust; MFA; row/field-level security; audit; GDPR/statutory; circuit breakers and graceful degradation.

---

**Current focus:** Central portal as a **module loader** (unified dashboard shell), not full ERP module implementation.
