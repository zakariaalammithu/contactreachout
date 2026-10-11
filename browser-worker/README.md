# ContactReachout browser worker

Deploy this container to a private, Playwright-capable service (for example a private Cloud Run, ECS/Fargate, or another container host). Do not deploy it to Vercel serverless.

Set the same server-only values on the worker and in the ContactReachout application:

- `BROWSER_WORKER_URL=https://worker.example/submit` (application only)
- `BROWSER_WORKER_AUTH_SECRET=<long random secret>`
- `BROWSER_WORKER_ALLOWED_DOMAINS=example.com,example.org`

The worker accepts only authenticated `POST /submit`, validates allow-listed public target hosts, caps execution at 25 seconds, detects common security challenges, and keeps a 24-hour in-memory idempotency record. For multi-instance production deployment, replace this in-memory idempotency store with a shared durable store before enabling campaigns.

Use `GET /healthz` as the container readiness/liveness check. It returns `200` only when the worker has its authentication secret and non-empty allow-list; it does not reveal either value. The simplest supported hosting shape is one private container instance on a Playwright-compatible container host, reachable from the application over HTTPS. Restrict ingress to the application where the host supports it, then use the shared bearer secret as a second control.

It does not bypass CAPTCHA, Cloudflare, authentication, or other security controls. A 200 response is not delivery: only an explicit success message produces `successVerified: true`.
