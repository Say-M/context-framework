import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Check, ChevronRight, CircleAlert, Copy, Database as DatabaseIcon, Globe, KeyRound, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { ChartContainer,ChartTooltip,ChartTooltipContent } from "@/components/ui/chart";
import { useProject } from "@/context/ProjectContext";
import { Metric,PageHeader,Panel,PanelTitle,Status } from "./common";
import { createRecord, deleteRecord, fetchRecords, fetchSchema, type SchemaField, type SchemaModel } from "@/lib/backendApi";

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function isEditableField(field: SchemaField): boolean {
  return !field.isId && !field.isRelation && !field.isList;
}

function coerceFormValues(fields: SchemaField[], values: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (raw === undefined || raw === "") continue;
    if (["Int", "Float", "Decimal", "BigInt"].includes(field.type)) out[field.name] = Number(raw);
    else if (field.type === "Boolean") out[field.name] = raw === "true";
    else out[field.name] = raw;
  }
  return out;
}
interface DashboardAccessUser { id: number; email: string; role: "owner" | "member" }

export function UsersSection() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["dashboard-users"],
    queryFn: async (): Promise<DashboardAccessUser[]> => {
      const res = await fetch("/__dashboard/api/users", { credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to load users");
      return body.items;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string): Promise<string> => {
      const res = await fetch("/__dashboard/api/users/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not send invite");
      return body.inviteUrl;
    },
    onSuccess: (url) => {
      setInviteUrl(url);
      queryClient.invalidateQueries({ queryKey: ["dashboard-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/__dashboard/api/users/${id}`, { method: "DELETE", credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not remove user");
    },
    onSuccess: () => {
      toast.success("User removed");
      queryClient.invalidateQueries({ queryKey: ["dashboard-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = usersQuery.data ?? [];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Users"
        subtitle="People who can sign in to this project's dashboard."
        action={
          <Button
            onClick={() => {
              setInviteUrl(null);
              setInviteEmail("");
              setInviteOpen(true);
            }}
          >
            <Plus /> Invite user
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Total dashboard users" value={String(users.length)} />
        <Metric label="Owners" value={String(users.filter((u) => u.role === "owner").length)} />
      </div>
      <Panel>
        {usersQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading users…</p>
        ) : usersQuery.isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{(usersQuery.error as Error).message}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {["Email", "Role", "Actions"].map((x) => (
                    <th className="px-3 py-3 font-medium" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr className="border-b last:border-0" key={u.id}>
                    <td className="px-3 py-4">{u.email}</td>
                    <td className="px-3 py-4">
                      <Status tone={u.role === "owner" ? "success" : "neutral"}>{u.role}</Status>
                    </td>
                    <td className="px-3 py-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${u.email}`}
                        disabled={u.id === currentUser?.id || removeMutation.isPending}
                        onClick={() => removeMutation.mutate(u.id)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground">
                      No users yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a dashboard user</DialogTitle>
            <DialogDescription>
              They'll get a link to set their own password. No email is sent — share the link yourself.
            </DialogDescription>
          </DialogHeader>
          {inviteUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Share this link with the invitee:</p>
              <Input readOnly value={inviteUrl} onFocus={(e) => e.currentTarget.select()} />
              <Button className="w-full" onClick={() => setInviteOpen(false)}>
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@example.com"
              />
              <Button className="w-full" disabled={!inviteEmail || inviteMutation.isPending} onClick={() => inviteMutation.mutate(inviteEmail)}>
                {inviteMutation.isPending ? "Sending..." : "Create invite"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
export function DatabaseSection() {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState<SchemaModel | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const schemaQuery = useQuery({ queryKey: ["backend-schema"], queryFn: fetchSchema });
  const models = schemaQuery.data ?? [];
  const activeModel = selectedModel ?? models[0] ?? null;

  const recordsQuery = useQuery({
    queryKey: ["backend-records", activeModel?.apiPath],
    queryFn: () => fetchRecords(activeModel!.apiPath),
    enabled: Boolean(activeModel),
  });
  const records = recordsQuery.data ?? [];
  const editableFields = (activeModel?.fields ?? []).filter(isEditableField);
  const columns = records[0] ? Object.keys(records[0]) : editableFields.map((f) => f.name);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createRecord(activeModel!.apiPath, data),
    onSuccess: () => {
      toast.success("Record created");
      queryClient.invalidateQueries({ queryKey: ["backend-records", activeModel?.apiPath] });
      setAddOpen(false);
      setFormValues({});
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteRecord(activeModel!.apiPath, id),
    onSuccess: () => {
      toast.success("Record deleted");
      queryClient.invalidateQueries({ queryKey: ["backend-records", activeModel?.apiPath] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-7">
      <PageHeader title="Database" subtitle="Browse this project's real data model and records." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Connection" value={schemaQuery.isError ? "Unavailable" : "Healthy"} />
        <Metric label="Entities" value={String(models.length)} />
        {activeModel ? (
          <Metric label="Records" value={String(records.length)} detail={activeModel.name} />
        ) : (
          <Metric label="Records" value="—" />
        )}
      </div>
      <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
        <Panel>
          <PanelTitle title="Entities" description="From the backend's Prisma schema" />
          <div className="mt-4 space-y-1">
            {models.map((m) => (
              <Button
                variant={activeModel?.name === m.name ? "secondary" : "ghost"}
                className="h-auto w-full justify-between py-3"
                onClick={() => setSelectedModel(m)}
                key={m.name}
              >
                <span className="text-left">
                  <span className="block">{m.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{m.apiPath}</span>
                </span>
                <ChevronRight />
              </Button>
            ))}
            {models.length === 0 && !schemaQuery.isLoading && (
              <p className="py-4 text-center text-sm text-muted-foreground">No entities found yet.</p>
            )}
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel>
            <PanelTitle
              title={activeModel ? `${activeModel.name} schema` : "Schema"}
              description="Fields parsed from the backend's schema.prisma"
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-3">Field</th>
                    <th>Type</th>
                    <th>Required</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeModel?.fields ?? []).map((f) => (
                    <tr className="border-b last:border-0" key={f.name}>
                      <td className="py-3 font-mono text-xs">
                        {f.name}
                        {f.isId && <KeyRound className="ml-2 inline size-3 text-warning" />}
                      </td>
                      <td>
                        {f.type}
                        {f.isList ? "[]" : ""}
                      </td>
                      <td>{f.isOptional ? "No" : "Yes"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <PanelTitle
              title="Records"
              description={recordsQuery.isError ? (recordsQuery.error as Error).message : "Live data from the backend"}
              action={
                <Button size="sm" disabled={!activeModel} onClick={() => setAddOpen(true)}>
                  <Plus /> Add record
                </Button>
              }
            />
            <div className="mt-4 overflow-x-auto">
              {recordsQuery.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading records…</p>
              ) : (
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      {columns.map((c) => (
                        <th className="py-3 pr-4" key={c}>
                          {c}
                        </th>
                      ))}
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr className="border-b last:border-0" key={String(r["id"] ?? i)}>
                        {columns.map((c) => (
                          <td className="py-3 pr-4" key={c}>
                            {formatCell(r[c])}
                          </td>
                        ))}
                        <td className="py-3 pr-4">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Delete record"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(r["id"] as string | number)}
                          >
                            <Trash2 />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {records.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 1} className="py-8 text-center text-muted-foreground">
                          No records yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>
        </div>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {activeModel?.name} record</DialogTitle>
            <DialogDescription>Creates a real record via {activeModel?.apiPath}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editableFields.map((f) => (
              <div key={f.name}>
                <Label htmlFor={`field-${f.name}`}>
                  {f.name}
                  {f.isOptional ? "" : " *"}
                </Label>
                <Input
                  id={`field-${f.name}`}
                  className="mt-1.5"
                  value={formValues[f.name] ?? ""}
                  onChange={(e) => setFormValues((v) => ({ ...v, [f.name]: e.target.value }))}
                />
              </div>
            ))}
            {editableFields.length === 0 && (
              <p className="text-sm text-muted-foreground">This entity has no editable fields.</p>
            )}
          </div>
          <Button
            className="w-full"
            disabled={!activeModel || createMutation.isPending}
            onClick={() => createMutation.mutate(coerceFormValues(editableFields, formValues))}
          >
            {createMutation.isPending ? "Creating…" : "Create record"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
const trend=[{day:"Sep 7",visitors:620,sessions:790},{day:"Sep 8",visitors:710,sessions:920},{day:"Sep 9",visitors:680,sessions:860},{day:"Sep 10",visitors:840,sessions:1050},{day:"Sep 11",visitors:920,sessions:1180},{day:"Sep 12",visitors:1080,sessions:1320},{day:"Sep 13",visitors:1010,sessions:1270}];
export function AnalyticsSection(){const [range,setRange]=useState("30");return <div className="space-y-7"><PageHeader title="Analytics" subtitle="Simulated engagement and traffic for NGO Ledger." action={<Select value={range} onValueChange={setRange}><SelectTrigger className="w-36"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem></SelectContent></Select>}/><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[["Visitors","24,892","+12.4%"],["Sessions","31,604","+9.8%"],["Page views","74,210","+15.2%"],["Conversion","6.8%","+0.7%"],["Returning users","41.2%","+3.1%"],["Avg. session","4m 18s","+22s"]].map(x=><Metric key={String(x[0])} label={String(x[0])} value={String(x[1])} detail={String(x[2])}/>)}</div><div className="grid gap-5 xl:grid-cols-[2fr_1fr]"><Panel><PanelTitle title="Visitors and sessions" description={`Traffic over the last ${range} days`}/><ChartContainer className="mt-5 h-[300px] w-full" config={{visitors:{label:"Visitors",color:"var(--chart-1)"},sessions:{label:"Sessions",color:"var(--chart-2)"}}}><AreaChart data={trend} accessibilityLayer><CartesianGrid vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false}/><ChartTooltip content={<ChartTooltipContent/>}/><Area type="monotone" dataKey="sessions" stroke="var(--color-sessions)" fill="var(--color-sessions)" fillOpacity={.12}/><Area type="monotone" dataKey="visitors" stroke="var(--color-visitors)" fill="var(--color-visitors)" fillOpacity={.18}/></AreaChart></ChartContainer></Panel><Panel><PanelTitle title="Device breakdown" description="Sessions by device"/><ChartContainer className="mx-auto mt-5 h-[300px] max-w-[320px]" config={{desktop:{label:"Desktop",color:"var(--chart-1)"},mobile:{label:"Mobile",color:"var(--chart-2)"},tablet:{label:"Tablet",color:"var(--chart-4)"}}}><PieChart accessibilityLayer><ChartTooltip content={<ChartTooltipContent hideLabel/>}/><Pie data={[{name:"Desktop",value:56,color:"var(--chart-1)"},{name:"Mobile",value:37,color:"var(--chart-2)"},{name:"Tablet",value:7,color:"var(--chart-4)"}]} dataKey="value" nameKey="name" innerRadius={55}>{["a","b","c"].map((x,i)=><Cell key={x} fill={["var(--chart-1)","var(--chart-2)","var(--chart-4)"][i] ?? "var(--chart-1)"}/>)}</Pie></PieChart></ChartContainer></Panel></div><div className="grid gap-5 lg:grid-cols-3">{[["Traffic sources",["Direct · 42%","Search · 31%","Referral · 18%","Social · 9%"]],["Top pages",["/dashboard · 8.2K","/expenses · 6.4K","/reports · 4.9K","/projects · 3.1K"]],["Countries",["Bangladesh · 38%","United Kingdom · 19%","United States · 16%","Kenya · 11%"]]].map(([t,rows])=><Panel key={String(t)}><PanelTitle title={String(t)}/><div className="mt-4 space-y-3">{(rows as string[]).map(r=><div className="flex items-center justify-between border-b pb-3 text-sm last:border-0" key={r}><span>{r.split(" · ")[0]??r}</span><span className="text-muted-foreground">{r.split(" · ")[1]??""}</span></div>)}</div></Panel>)}</div></div>}
export function IntegrationsSection(){const {state,update}=useProject();const [q,setQ]=useState("");const [category,setCategory]=useState("All");const rows=state.integrations.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())&&(category==="All"||x.category===category));return <div className="space-y-7"><PageHeader title="Integrations" subtitle="Explore simulated connections for this project."/><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]"><Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search integrations"/><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["All","Payments","Authentication","Analytics","Storage","Communication","Developer tools"].map(x=><SelectItem value={x} key={x}>{x}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map(x=><Panel key={x.id}><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-md bg-muted"><Globe className="size-5"/></div><Status tone={x.connected?"success":"neutral"}>{x.connected?"Connected":"Not connected"}</Status></div><h2 className="mt-5 font-semibold">{x.name}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{x.description}</p><p className="mt-3 text-xs text-muted-foreground">{x.category}</p><div className="mt-5 flex gap-2"><Button size="sm" variant={x.connected?"outline":"default"} onClick={()=>{update("integrations",state.integrations.map(i=>i.id===x.id?{...i,connected:!i.connected}:i));toast.success(x.connected?`${x.name} disconnected`:`${x.name} connected`)}}>{x.connected?"Disconnect":"Connect"}</Button>{x.connected&&<Button size="sm" variant="ghost" onClick={()=>toast.info(`${x.name} configuration opened`)}>Configure</Button>}</div></Panel>)}</div></div>}
export function SecuritySection(){const [scanning,setScanning]=useState(false);const [auth,setAuth]=useState(true);const [rate,setRate]=useState(true);const vars=["DATABASE_URL","API_SECRET","JWT_SECRET"];return <div className="space-y-7"><PageHeader title="Security" subtitle="Simulated security information and project controls." action={<Status tone="warning">Demonstration only</Status>}/><div className="grid gap-4 sm:grid-cols-4"><Metric label="Security score" value="86/100"/><Metric label="Authentication" value={auth?"Enabled":"Disabled"}/><Metric label="Active sessions" value="18"/><Metric label="Last scan" value="2 days ago"/></div><div className="grid gap-5 xl:grid-cols-2"><Panel><PanelTitle title="Authentication" description="Simulated identity controls"/><div className="mt-5 space-y-4">{[["Authentication enabled",auth,setAuth],["Email verification",true,()=>{}],["Require invitation",true,()=>{}]].map(([label,value,setter])=><div className="flex items-center justify-between border-b pb-4 last:border-0" key={String(label)}><span className="text-sm">{String(label)}</span><Switch checked={Boolean(value)} onCheckedChange={setter as (v:boolean)=>void}/></div>)}</div></Panel><Panel><PanelTitle title="Environment variables" description="All displayed values are masked mock values." action={<Button size="sm" onClick={()=>toast.info("Variable form opened in prototype")}><Plus/> Add variable</Button>}/><div className="mt-4 space-y-3">{vars.map(v=><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-md bg-muted p-3" key={v}><div><p className="font-mono text-xs">{v}</p><p className="mt-1 font-mono text-xs text-muted-foreground">••••••••••••••••</p></div><Button variant="ghost" size="sm" onClick={()=>toast.info(`${v} edit opened`)}>Edit</Button></div>)}</div></Panel><Panel><PanelTitle title="API restrictions" description="CORS-style and rate-limit-style settings"/><div className="mt-5 space-y-4"><div><Label htmlFor="origins">Allowed origins</Label><Input id="origins" defaultValue="https://ngo-ledger.flameflow.local" className="mt-1.5"/></div><div className="flex items-center justify-between"><Label htmlFor="rate">Rate limit enabled</Label><Switch id="rate" checked={rate} onCheckedChange={setRate}/></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="rpm">Requests/min</Label><Input id="rpm" type="number" defaultValue="120" className="mt-1.5"/></div><div><Label htmlFor="burst">Burst limit</Label><Input id="burst" type="number" defaultValue="30" className="mt-1.5"/></div></div><Button onClick={()=>toast.success("Security settings saved")}>Save controls</Button></div></Panel><Panel><PanelTitle title="Vulnerability scan" description="A simulated review of common project risks" action={<ShieldCheck className="size-5 text-success"/>}/><div className="mt-5 space-y-3">{["Dependency health","Configuration health","Authentication checks","API exposure checks"].map(x=><div className="flex items-center justify-between text-sm" key={x}><span>{x}</span><Status tone="success"><Check/> Passed</Status></div>)}</div><Button variant="outline" className="mt-5" disabled={scanning} onClick={()=>{setScanning(true);setTimeout(()=>{setScanning(false);toast.success("Simulated security scan completed")},900)}}><CircleAlert/>{scanning?"Scanning...":"Run security scan"}</Button></Panel></div></div>}
