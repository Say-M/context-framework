// Talks to the generated app's own business backend: schema discovery via
// the dashboard's already-built /__dashboard/api/schema (which parses
// backend/prisma/schema.prisma directly), and the generated per-entity CRUD
// routes plus /api/logs and /api/agents at the fixed response-shape contract
// mandated by context-framework's generation prompt (see apps/api/src/lib/
// generation.ts): list -> { items }, get/create/update -> { item },
// delete -> { ok: true }.

export interface SchemaField {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  isId: boolean;
  isRelation: boolean;
  isEnum: boolean;
  enumValues?: string[];
}

export interface SchemaModel {
  name: string;
  apiPath: string;
  fields: SchemaField[];
}

export interface AuditLogEntry {
  id: string;
  time: string;
  severity: "Info" | "Success" | "Warning" | "Error";
  source: string;
  message: string;
  requestId: string;
}

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

export interface AgentInteractResult {
  message: string;
  data?: unknown;
}

async function parseJson(res: Response): Promise<Record<string, unknown>> {
  return res.json().catch(() => ({}));
}

async function getItems<T>(path: string): Promise<T[]> {
  const res = await fetch(path);
  const body = await parseJson(res);
  if (!res.ok) throw new Error((body["error"] as string) ?? `Request to ${path} failed`);
  return (body["items"] as T[]) ?? [];
}

export async function fetchSchema(): Promise<SchemaModel[]> {
  const res = await fetch("/__dashboard/api/schema", { credentials: "include" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error((body["error"] as string) ?? "Failed to load schema");
  return (body["models"] as SchemaModel[]) ?? [];
}

export async function fetchRecords(apiPath: string): Promise<Record<string, unknown>[]> {
  return getItems<Record<string, unknown>>(apiPath);
}

export async function createRecord(apiPath: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(apiPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error((body["error"] as string) ?? "Failed to create record");
  return (body["item"] as Record<string, unknown>) ?? {};
}

export async function deleteRecord(apiPath: string, id: string | number): Promise<void> {
  const res = await fetch(`${apiPath}/${id}`, { method: "DELETE" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error((body["error"] as string) ?? "Failed to delete record");
}

export async function fetchLogs(): Promise<AuditLogEntry[]> {
  return getItems<AuditLogEntry>("/api/logs");
}

export async function fetchAgents(): Promise<AgentSummary[]> {
  return getItems<AgentSummary>("/api/agents");
}

export async function interactWithAgent(agentId: string, message: string): Promise<AgentInteractResult> {
  const res = await fetch(`/api/agents/${agentId}/interact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error((body["error"] as string) ?? "Agent request failed");
  return { message: (body["message"] as string) ?? "", data: body["data"] };
}
