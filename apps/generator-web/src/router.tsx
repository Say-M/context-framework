import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { authLayoutRoute } from "./routes/AuthLayout";
import { appLayoutRoute } from "./routes/AppLayout";
import { loginRoute } from "./routes/(auth)/login";
import { signupRoute } from "./routes/(auth)/signup";
import { catalogRoute } from "./routes/_app/catalog";
import { blueprintDetailRoute } from "./routes/_app/blueprint-detail";
import { myAppsRoute } from "./routes/_app/my-apps";
import { generatedAppDetailRoute } from "./routes/_app/generated-app-detail";

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute, signupRoute]),
  appLayoutRoute.addChildren([catalogRoute, blueprintDetailRoute, myAppsRoute, generatedAppDetailRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
