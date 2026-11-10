# Incident Copilot UI

This repository contains only the React, TypeScript, and Vite frontend. The Spring Boot API is maintained separately in the `incident-copilot` project.

## Features

- Analyze alerts with live pipeline progress and remediation steps.
- View similar incidents, search and add knowledge-base entries.
- Review retrieval evaluation metrics.
- Configure the backend URL in the UI or through `VITE_API_BASE_URL`.

## Run locally

Use Node.js 24.15.0+ (recommended), 22.22.2+, or 26.0.0+, then start the Java backend first. By default, it listens on `http://localhost:8081`. CI reads the Node.js major version from `.nvmrc`. From this repository root, run:

```powershell
npm ci
npm run lint
npm test
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/actuator` requests to the Java backend, so local development does not require CORS configuration.

## Backend API calls

The UI uses `GET /api/status`, `GET /api/incidents`, `POST /api/incidents`, `GET /api/eval`, and `GET /api/analyze/stream`.

## Continuous integration and SonarCloud

The GitHub Actions workflows audit npm dependencies at high severity and above, lint and test with coverage, run CodeQL security analysis, submit SonarCloud analysis on `main`, build the production bundle, and upload it as a seven-day artifact. SonarCloud processes the quality gate asynchronously and displays its status in the project dashboard; the workflow does not poll the quality-gate API because SonarCloud rejects that request for this organization. Main-branch runs are not canceled when newer commits arrive; superseded pull-request runs are canceled. Pull requests run dependency auditing, linting, tests, and CodeQL, but skip SonarCloud analysis because the SonarCloud Free plan only exposes analysis and quality-gate results after changes are merged into the main branch. The production artifact waits for the analysis submission and all other required checks; its artifact ID is exposed for a future deployment job.

In SonarCloud, configure the project for CI-based analysis (disable automatic analysis) to enable LCOV coverage reporting. The repository's `sonar-project.properties` identifies the `incident-copilot-frontend` project in the `sayemakhtar117` organization.

Enable GitHub secret scanning separately in the repository's **Settings → Security → Code security and analysis** if it is available for the repository. Secret scanning is a GitHub repository setting and is not enabled by these workflow files.

## Deploy on GitHub Pages

The workflow automatically deploys successful builds from `main` to GitHub Pages at `https://incidentpilot.in`. In repository settings, open **Settings → Pages**, set the build and deployment source to **GitHub Actions**, and configure `incidentpilot.in` as the custom domain. The build serves assets from the domain root. Pull requests run validation but do not deploy.

The frontend is static; the separate Java backend must also be publicly reachable. To configure it, add a repository Actions variable named `VITE_API_BASE_URL` with the backend base URL (no trailing slash). The workflow injects it at build time. Then set `CORS_ALLOWED_ORIGINS` on the backend to `https://incidentpilot.in`. Without a backend URL, the UI can still be opened, but API-backed features will show as offline until a URL is configured in the Connection panel.

For Render, the included [`render.yaml`](render.yaml) configures the UI as a static site. For Netlify, Vercel, or Cloudflare Pages, use `npm ci && npm run build` as the build command and `dist` as the output directory.

### Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Header says **Offline** | Check the backend URL in the Connection panel and verify the backend is running. |
| Browser console shows a CORS error | Set `CORS_ALLOWED_ORIGINS` on the backend to the UI origin (scheme and host, no trailing slash). |
| Works locally, fails when deployed | `VITE_API_BASE_URL` is read at build time; rebuild and redeploy after changing it. The Connection panel can also override it. |
| Mixed content blocked | An HTTPS UI must call an HTTPS backend. |
