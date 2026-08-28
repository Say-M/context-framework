import yaml from "js-yaml";
import { BusinessDomainModel, BusinessModelModel, OrgContextModel, UserModel } from "@bismo/db-models";
import type { AppBlueprintDocument } from "@bismo/db-models";
import type { OkfManifest } from "@bismo/shared-schemas";

const OKF_VERSION = "0.2";
const VERSION_PATTERN = /^v(\d+)\.(\d+)\.(\d+)$/;

/** First publish always lands on v1.0.0; every republish bumps the minor. */
export function nextVersion(currentVersion: string): string {
  if (currentVersion === "v0.0.0") return "v1.0.0";
  const match = VERSION_PATTERN.exec(currentVersion);
  if (!match) return "v1.0.0";
  const [, major, minor] = match;
  return `v${major}.${Number(minor) + 1}.0`;
}

export async function buildOkfManifest(
  blueprint: AppBlueprintDocument,
  version: string,
  publisherId: string,
): Promise<OkfManifest> {
  const [domains, businessModel, orgContext, publisher] = await Promise.all([
    BusinessDomainModel.find({ _id: { $in: blueprint.connections.domainIds } }).select("code name"),
    blueprint.connections.modelId
      ? BusinessModelModel.findById(blueprint.connections.modelId).select("code name")
      : null,
    blueprint.connections.orgContextId
      ? OrgContextModel.findById(blueprint.connections.orgContextId).select("code name")
      : null,
    UserModel.findById(publisherId).select("name email"),
  ]);

  if (!publisher) throw new Error("Publishing user not found");

  return {
    okf_version: OKF_VERSION,
    namespace: blueprint.namespace,
    name: blueprint.name,
    version,
    description: blueprint.description,
    author: { name: publisher.name as string, email: publisher.email as string },
    inherited_domains: domains.map((d) => ({
      id: String(d._id),
      code: d.code as string,
      name: d.name as string,
    })),
    inherited_models: businessModel
      ? [{ id: String(businessModel._id), code: businessModel.code as string, name: businessModel.name as string }]
      : [],
    org_context: orgContext
      ? [{ id: String(orgContext._id), code: orgContext.code as string, name: orgContext.name as string }]
      : [],
  };
}

export function manifestToYaml(manifest: OkfManifest): string {
  const header =
    "# Open Knowledge Format (OKF) v0.2 Manifest\n" +
    "# Application Blueprint with Module Inheritance Bindings\n";
  return header + yaml.dump(manifest, { indent: 2 });
}
