# mQ (RabbitMQ)

Infrastructure and client stubs for **AMQP**, pub/sub, and future **saga** orchestration. The broker runs as its own workload (not a Node “service”); Node apps use `amqplib` or similar to publish/consume.

## Layout

```
rabbitmq/
  definitions.example.json  # Optional: exchanges, queues, bindings (import on boot)
  # Docker: broker is in repo root docker-compose.yml (not a second file here)
k8s/
  statefulset.yaml          # Single-node dev profile
  service.yaml
  secret.example.yaml
amqp-client/                # Optional shared publisher wrapper (`@cityq/mq-client`)
```

## Local (Docker Compose)

RabbitMQ is defined in **`../docker-compose.yml`** with the rest of the stack. From the **monorepo root**:

```bash
docker compose up -d rabbitmq
```

Management UI: `http://localhost:15672` (default user/pass in that compose file — change for anything beyond dev).

## Kubernetes

Apply `k8s/*.yaml` after editing storage class, resources, and **secrets** for credentials. Production typically uses the [RabbitMQ cluster operator](https://www.rabbitmq.com/kubernetes/operator/operator-overview.html) or a managed offering.

## Integration

- **coreQ**, microservices, and workers connect via `amqp://` URL from Vault/ConfigMap.
- Use **topic exchanges** for domain events; **dead-letter queues** for retry policies per NFR.
