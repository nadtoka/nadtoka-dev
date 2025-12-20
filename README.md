# nadtoka.dev — Personal DevOps Landing

A lightweight, security-first personal website for **Oleksandr Nadtoka** (Senior DevOps Engineer).
Built as a static landing page with a few small **edge/serverless** endpoints for “Ops pulse” and visitor diagnostics.

Live: https://nadtoka.dev/

## Highlights

- Static-first: plain HTML/CSS/JS (no heavy frameworks)
- Security headers by default (CSP, HSTS, etc.)
- Visitor diagnostics (read-only) — shows a safe snapshot of request metadata
- Ops pulse:
  - Provider status via official RSS feeds (AWS / Google Cloud / Azure)
  - Market snapshot (AMZN / GOOGL / MSFT)
  - Cached responses for performance and rate-limit safety

## Project structure

```text
.
├─ public/
│  ├─ index.html
│  ├─ assets/
│  │  ├─ styles.css
│  │  ├─ app.js
│  │  ├─ avatar.png
│  │  └─ cv.pdf
│  └─ _headers
└─ functions/
   └─ api/
      ├─ whoami.ts
      └─ pulse.ts
```

## Local development

This repo contains static assets + serverless/edge functions.
To run it locally, use your preferred dev server for static assets and a compatible local runtime for serverless functions.

Tip: if you only preview static files, /api/* endpoints won’t work.

## Configuration

If you use external APIs (e.g., market data):

- store secrets in your hosting platform’s environment variables / secrets
- never commit API keys into the repository

## Security notes

- CSP is intentionally strict.
- /api/whoami exposes a safe subset of request headers (no cookies/auth/raw IP).
- /api/pulse is cached to avoid excessive upstream calls.

## License

All rights reserved. See LICENSE.
