import { createRoute, createRouter, Navigate } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { authLayoutRoute } from "./routes/AuthLayout";
import { appLayoutRoute } from "./routes/AppLayout";
import { loginRoute } from "./routes/(auth)/login";
import { activateRoute } from "./routes/(auth)/activate";
import { dashboardRoute } from "./routes/_app/dashboard";
import { businessDomainsRoute } from "./routes/_app/business-domains";
import { businessModelsRoute } from "./routes/_app/business-models";
import { orgContextsRoute } from "./routes/_app/org-contexts";
import { appBlueprintsRoute, appBlueprintsNewRoute } from "./routes/_app/app-blueprints";
import { approvalQueueRoute } from "./routes/_app/approval-queue";
import { teamSettingsRoute } from "./routes/_app/team-settings";
import { apiDocsRoute } from "./routes/_app/api-docs";

const indexRoute = createRoute({
  path: "/",
  getParentRoute: () => rootRoute,
  component: () => <Navigate to="/dashboard" />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  authLayoutRoute.addChildren([loginRoute, activateRoute]),
  appLayoutRoute.addChildren([
    dashboardRoute,
    businessDomainsRoute,
    businessModelsRoute,
    orgContextsRoute,
    appBlueprintsRoute,
    appBlueprintsNewRoute,
    approvalQueueRoute,
    teamSettingsRoute,
    apiDocsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
