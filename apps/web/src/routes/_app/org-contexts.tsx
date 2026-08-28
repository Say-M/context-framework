import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appLayoutRoute } from "../AppLayout";
import { OrgContextListPanel } from "@/features/org-context/components/OrgContextListPanel";
import { OrgContextDetailPanel } from "@/features/org-context/components/OrgContextDetailPanel";

const searchSchema = z.object({
  selected: z.string().optional(),
});

function OrgContextsPage() {
  const { selected } = orgContextsRoute.useSearch();
  const navigate = orgContextsRoute.useNavigate();

  return (
    <div className="-m-8 flex h-screen">
      <OrgContextListPanel
        selectedId={selected ?? null}
        onSelect={(id) => navigate({ search: { selected: id } })}
      />
      <OrgContextDetailPanel contextId={selected ?? null} />
    </div>
  );
}

export const orgContextsRoute = createRoute({
  path: "/org-contexts",
  getParentRoute: () => appLayoutRoute,
  validateSearch: searchSchema,
  component: OrgContextsPage,
});
