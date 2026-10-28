# ContactReachout browser worker

Deploy this container to a private, Playwright-capable service (for example a private Cloud Run, ECS/Fargate, or another container host). Do not deploy it to Vercel serverless.

Set the same server-only values on the worker and in the ContactReachout application:

- `BROWSER_WORKER_URL=https://worker.example/submit` (application only)
- `BROWSER_WORKER_AUTH_SECRET=<long random secret>`
- `BROWSER_WORKER_ALLOWED_DOMAINS=example.com,example.org` (optional when dynamic verification is set)
- `CONTACTREACHOUT_APP_URL=https://contactreachout.com` (worker only; enables dynamic verification)

The worker accepts only authenticated `POST /submit`, validates target hosts, caps execution at 25 seconds, detects common security challenges, and keeps a 24-hour in-memory idempotency record. For multi-instance production deployment, replace this in-memory idempotency store with a shared durable store before enabling campaigns.

Target authorization has two layers; either authorizes a host:

- Static allow-list (`BROWSER_WORKER_ALLOWED_DOMAINS`): an explicit list. A listed domain also matches its subdomains.
- Dynamic campaign-lead verification (`CONTACTREACHOUT_APP_URL`): the worker asks the application (`GET <app>/api/worker/verify-domain`, Bearer = the worker secret) whether the host belongs to a lead attached to any campaign. Adding a lead to a campaign is then enough — bulk outreach to new domains needs no env edit or redeploy. A callback failure denies the target (fail-closed) unless the static list already authorized it.

Use `GET /healthz` as the container readiness/liveness check. It returns `200` only when the worker has its authentication secret and at least one authorization source (a non-empty static list or the app URL); it does not reveal either value. The simplest supported hosting shape is one private container instance on a Playwright-compatible container host, reachable from the application over HTTPS. Restrict ingress to the application where the host supports it, then use the shared bearer secret as a second control.

It does not bypass CAPTCHA, Cloudflare, authentication, or other security controls. A 200 response is not delivery: only an explicit success message produces `successVerified: true`.
