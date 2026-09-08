import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { authLayoutRoute } from "./routes/AuthLayout";
import { appLayoutRoute } from "./routes/AppLayout";
import { loginRoute } from "./routes/(auth)/login";
import { signupRoute } from "./routes/(auth)/signup";
import { threadsRoute } from "./routes/_app/threads";
import { threadDetailRoute } from "./routes/_app/thread-detail";
import { artifactPageRoute } from "./routes/ArtifactPage";

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute, signupRoute]),
  appLayoutRoute.addChildren([threadsRoute, threadDetailRoute]),
  artifactPageRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
