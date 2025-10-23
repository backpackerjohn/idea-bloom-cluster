import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: import.meta.env.VITE_APP_ENV === "production" ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div>Something went wrong</div>}>
    <App />
  </Sentry.ErrorBoundary>
);
