## Local TLS certs (dev)

Place a certificate pair here:

- `dev.crt`
- `dev.key`

They are used by `traefik/dynamic/tls-local.yml` as the default certificate.

### mkcert example

Generate and trust a local CA on your dev machine, then:

```bash
mkcert -cert-file dev.crt -key-file dev.key "portal.example.test" "*.portal.example.test" "localhost" "127.0.0.1"
```

Adjust names to match the hosts you actually use (see `.env`: `PUBLIC_HOST`, `API_HOST`, etc.).

