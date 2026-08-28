import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appLayoutRoute } from "../AppLayout";
import { AppBlueprintListPage } from "@/features/app-blueprints/components/AppBlueprintListPage";
import { BlueprintStudioWizard } from "@/features/app-blueprints/components/BlueprintStudioWizard";

export const appBlueprintsRoute = createRoute({
  path: "/app-blueprints",
  getParentRoute: () => appLayoutRoute,
  component: AppBlueprintListPage,
});

const newSearchSchema = z.object({
  draftId: z.string().optional(),
});

function AppBlueprintsNewPage() {
  const { draftId } = appBlueprintsNewRoute.useSearch();
  const navigate = appBlueprintsNewRoute.useNavigate();

  return (
    <BlueprintStudioWizard
      draftId={draftId ?? null}
      onDraftCreated={(id) => navigate({ search: { draftId: id } })}
    />
  );
}

export const appBlueprintsNewRoute = createRoute({
  path: "/app-blueprints/new",
  getParentRoute: () => appLayoutRoute,
  validateSearch: newSearchSchema,
  component: AppBlueprintsNewPage,
});
