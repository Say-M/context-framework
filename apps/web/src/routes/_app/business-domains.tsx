import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appLayoutRoute } from "../AppLayout";
import { BusinessDomainListPanel } from "@/features/business-domain/components/BusinessDomainListPanel";
import { BusinessDomainDetailPanel } from "@/features/business-domain/components/BusinessDomainDetailPanel";

const searchSchema = z.object({
  selected: z.string().optional(),
});

function BusinessDomainsPage() {
  const { selected } = businessDomainsRoute.useSearch();
  const navigate = businessDomainsRoute.useNavigate();

  return (
    <div className="-m-4 flex h-[calc(100dvh-3.5rem)] md:-m-8 md:h-screen">
      <BusinessDomainListPanel
        selectedId={selected ?? null}
        onSelect={(id) => navigate({ search: { selected: id } })}
      />
      <BusinessDomainDetailPanel
        domainId={selected ?? null}
        onBack={() => navigate({ search: { selected: undefined } })}
      />
    </div>
  );
}

export const businessDomainsRoute = createRoute({
  path: "/business-domains",
  getParentRoute: () => appLayoutRoute,
  validateSearch: searchSchema,
  component: BusinessDomainsPage,
});
