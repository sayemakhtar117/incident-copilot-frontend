# Incident Copilot UI

This repository contains only the React, TypeScript, and Vite frontend. The Spring Boot API is maintained separately in the `incident-copilot` project.

## Features

- Analyze alerts with live pipeline progress and remediation steps.
- View similar incidents, search and add knowledge-base entries.
- Review retrieval evaluation metrics.
- Configure the backend URL in the UI or through `VITE_API_BASE_URL`.

## Run locally

Install Node.js, then start the Java backend first. By default, it listens on `http://localhost:8081`. From this repository root, run:

```powershell
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/actuator` requests to the Java backend, so local development does not require CORS configuration.

## Backend API calls

The UI uses `GET /api/status`, `GET /api/incidents`, `POST /api/incidents`, `GET /api/eval`, and `GET /api/analyze/stream`.

## Deploy separately

Deploy this repository as a static site with the repository root as its base directory, `npm ci && npm run build` as its build command, and `dist` as its publish directory. Set `VITE_API_BASE_URL` to the public base URL of the Java backend (without a trailing slash). On the backend, set `CORS_ALLOWED_ORIGINS` to the exact origin of the deployed UI.

For Render, the included [`render.yaml`](render.yaml) configures the UI as a static site. For Netlify, Vercel, or Cloudflare Pages, use the same build command and output directory.

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Header says **Offline** | Check the backend URL in the Connection panel and verify the backend is running. |
| Browser console shows a CORS error | Set `CORS_ALLOWED_ORIGINS` on the backend to the UI origin (scheme and host, no trailing slash). |
| Works locally, fails when deployed | `VITE_API_BASE_URL` is read at build time; rebuild and redeploy after changing it. The Connection panel can also override it. |
| Mixed content blocked | An HTTPS UI must call an HTTPS backend. |
