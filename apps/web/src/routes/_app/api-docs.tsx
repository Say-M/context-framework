import { createRoute } from "@tanstack/react-router";
import { appLayoutRoute } from "../AppLayout";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5500";
const DOCS_URL = `${API_URL}/api/v1/docs`;
const OPENAPI_URL = `${API_URL}/api/v1/openapi.json`;

function ApiDocsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--bismo-text)]">API Docs & Explorer</h1>
      <p className="mt-2 text-[var(--bismo-text-muted)]">
        Interactive OpenAPI reference for every BISMO endpoint, generated directly from the API's
        request/response schemas.
      </p>
      <div className="mt-6 flex flex-col items-start gap-4 rounded-lg border border-[var(--bismo-border)] p-4 sm:p-8">
        <p className="text-sm text-[var(--bismo-text-muted)]">
          The reference is served by the API itself (via Scalar) and opens in a new tab.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--bismo-accent-domain)] px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            Open API Reference ↗
          </a>
          <a
            href={OPENAPI_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--bismo-border)] bg-[var(--bismo-bg-elevated)] px-4 text-sm font-medium text-[var(--bismo-text)] transition-colors hover:bg-[var(--bismo-bg-hover)]"
          >
            Download openapi.json
          </a>
        </div>
      </div>
    </div>
  );
}

export const apiDocsRoute = createRoute({
  path: "/api-docs",
  getParentRoute: () => appLayoutRoute,
  component: ApiDocsPage,
});
