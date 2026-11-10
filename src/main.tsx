import React from 'react';
import ReactDOM from 'react-dom/client';
import { getWebInstrumentations, initializeFaro, ReactIntegration } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import App from './App';
import './styles.css';

const faroUrl =
  import.meta.env.VITE_FARO_URL ||
  (import.meta.env.PROD
    ? 'https://faro-collector-prod-ap-south-1.grafana.net/collect/8b13f3d0de4ee126110127b6d56dcea8'
    : undefined);

if (faroUrl) {
  initializeFaro({
    url: faroUrl,
    app: {
      name: 'incidentpilot',
      version: '1.0.0',
      environment: import.meta.env.PROD ? 'production' : 'development',
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
      new ReactIntegration(),
    ],
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
