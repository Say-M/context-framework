import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appLayoutRoute } from "../AppLayout";
import { BusinessModelListPanel } from "@/features/business-model/components/BusinessModelListPanel";
import { BusinessModelDetailPanel } from "@/features/business-model/components/BusinessModelDetailPanel";

const searchSchema = z.object({
  selected: z.string().optional(),
});

function BusinessModelsPage() {
  const { selected } = businessModelsRoute.useSearch();
  const navigate = businessModelsRoute.useNavigate();

  return (
    <div className="-m-8 flex h-screen">
      <BusinessModelListPanel
        selectedId={selected ?? null}
        onSelect={(id) => navigate({ search: { selected: id } })}
      />
      <BusinessModelDetailPanel modelId={selected ?? null} />
    </div>
  );
}

export const businessModelsRoute = createRoute({
  path: "/business-models",
  getParentRoute: () => appLayoutRoute,
  validateSearch: searchSchema,
  component: BusinessModelsPage,
});
