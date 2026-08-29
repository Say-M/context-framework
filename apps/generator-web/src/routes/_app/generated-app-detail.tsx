import { createRoute } from "@tanstack/react-router";
import { Button } from "@bismo/ui";
import { appLayoutRoute } from "../AppLayout";
import { downloadGeneratedAppVersion, useGeneratedAppVersions } from "@/features/generated-apps/queries";

function GeneratedAppDetailPage() {
  const { id } = generatedAppDetailRoute.useParams();
  const { data, isLoading } = useGeneratedAppVersions(id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--bismo-text)]">Version History</h1>
        <p className="text-sm text-[var(--bismo-text-muted)]">
          Every version is a git commit — download any of them as a zip.
        </p>
      </div>
      {isLoading && <p className="text-sm text-[var(--bismo-text-muted)]">Loading…</p>}
      <div className="flex flex-col gap-2">
        {data?.items.map((version) => (
          <div
            key={version.sha}
            className="flex items-center justify-between gap-3 rounded-md border border-[var(--bismo-border)] p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-[var(--bismo-text)]">{version.message}</p>
              <p className="font-mono text-xs text-[var(--bismo-text-muted)]">
                {version.shortSha} · {new Date(version.authorDate).toLocaleString()}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadGeneratedAppVersion(id, version.sha)}
            >
              Download
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export const generatedAppDetailRoute = createRoute({
  path: "/my-apps/$id",
  getParentRoute: () => appLayoutRoute,
  component: GeneratedAppDetailPage,
});
