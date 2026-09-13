import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, Braces, Cable, Check, Copy, GitBranch, Pause, Play, Plus, RefreshCw, Search, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import { useProject } from "@/context/ProjectContext";
import { Metric,PageHeader,Panel,PanelTitle,Status } from "./common";
import { fetchAgents, fetchLogs, interactWithAgent } from "@/lib/backendApi";

export function AgentsSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ message: string; data?: unknown } | null>(null);

  const agentsQuery = useQuery({ queryKey: ["backend-agents"], queryFn: fetchAgents });
  const agents = agentsQuery.data ?? [];
  const activeAgent = agents.find((a) => a.id === selectedId) ?? agents[0] ?? null;

  const interactMutation = useMutation({
    mutationFn: () => interactWithAgent(activeAgent!.id, message),
    onSuccess: (res) => setResult(res),
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-7">
      <PageHeader title="Agents" subtitle="Agents built from this project's blueprint, running on Google ADK." />
      {agentsQuery.isError && (
        <Panel>
          <p className="text-sm text-muted-foreground">{(agentsQuery.error as Error).message}</p>
        </Panel>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((a) => (
          <Panel key={a.id}>
            <div className="flex items-start justify-between">
              <div className="grid size-10 place-items-center rounded-md bg-info-soft text-info">
                <Bot className="size-5" />
              </div>
              {activeAgent?.id === a.id && <Status tone="success">Selected</Status>}
            </div>
            <h2 className="mt-5 font-semibold">{a.name}</h2>
            <p className="mt-1 min-h-10 text-sm text-muted-foreground">{a.description}</p>
            <Button
              size="sm"
              variant={activeAgent?.id === a.id ? "secondary" : "outline"}
              className="mt-4"
              onClick={() => {
                setSelectedId(a.id);
                setResult(null);
              }}
            >
              Select
            </Button>
          </Panel>
        ))}
        {agents.length === 0 && !agentsQuery.isLoading && !agentsQuery.isError && (
          <Panel>
            <p className="text-sm text-muted-foreground">No agents were generated for this project.</p>
          </Panel>
        )}
      </div>
      {activeAgent && (
        <Panel>
          <PanelTitle title={`Run ${activeAgent.name}`} description="Sends a real request to this agent's interact endpoint." />
          <Textarea
            className="mt-4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Create an expense for $450 from ABC Supplies"
          />
          <Button className="mt-3" disabled={!message.trim() || interactMutation.isPending} onClick={() => interactMutation.mutate()}>
            {interactMutation.isPending ? "Running…" : "Send"}
          </Button>
          {result && (
            <div className="mt-4 space-y-2">
              <p className="text-sm">{result.message}</p>
              {result.data !== undefined && (
                <pre className="overflow-x-auto rounded-md bg-code p-4 text-xs text-code-foreground">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
export function WorkflowsSection(){const {state,update}=useProject();const [selected,setSelected]=useState(state.workflows[0]);const [open,setOpen]=useState(false);const [name,setName]=useState("");return <div className="space-y-7"><PageHeader title="Workflows" subtitle="Automate repeatable project events with simulated workflows." action={<Button onClick={()=>setOpen(true)}><Plus/> Create workflow</Button>}/><div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]"><Panel><PanelTitle title="Workflow list" description={`${state.workflows.length} workflows`}/><div className="mt-4 divide-y">{state.workflows.map(w=><div className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]" key={w.id}><button className="min-w-0 text-left" onClick={()=>setSelected(w)}><div className="flex items-center gap-2"><p className="truncate font-medium">{w.name}</p><Status tone={w.enabled?"success":"neutral"}>{w.enabled?"Enabled":"Disabled"}</Status></div><p className="mt-1 text-xs text-muted-foreground">{w.trigger} · {w.steps.length} steps · Last run {w.lastRun}</p></button><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={`Run ${w.name}`} onClick={()=>toast.success(`${w.name} completed in simulation`)}><Play/></Button><Switch checked={w.enabled} onCheckedChange={v=>update("workflows",state.workflows.map(x=>x.id===w.id?{...x,enabled:v}:x))}/><Button size="icon" variant="ghost" aria-label={`Delete ${w.name}`} onClick={()=>update("workflows",state.workflows.filter(x=>x.id!==w.id))}><Trash2/></Button></div></div>)}</div></Panel><Panel><PanelTitle title={selected?.name||"Workflow details"} description={selected?.trigger||"Choose a workflow"}/><div className="mt-6 space-y-0">{selected?.steps.map((step,i)=><div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3" key={step}><div className="flex flex-col items-center"><div className="grid size-8 place-items-center rounded-full border bg-background text-xs font-semibold">{i+1}</div>{i<selected.steps.length-1&&<div className="h-9 w-px bg-border"/>}</div><div className="pt-1 text-sm font-medium">{step}</div></div>)}</div></Panel></div><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Create workflow</DialogTitle><DialogDescription>Add a local workflow demonstration.</DialogDescription></DialogHeader><Label htmlFor="workflow-name">Workflow name</Label><Input id="workflow-name" value={name} onChange={e=>setName(e.target.value.slice(0,100))}/><Select defaultValue="Manual"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["Manual","Project update","Deployment","User registration","Scheduled","Webhook","Agent event"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={()=>{if(name.trim().length<3){toast.error("Enter a workflow name");return}update("workflows",[...state.workflows,{id:crypto.randomUUID(),name:name.trim(),trigger:"Manual",enabled:true,lastRun:"Never",steps:["Trigger","Validate data","Execute action","Complete"]}]);setName("");setOpen(false);toast.success("Workflow created")}}>Create workflow</Button></DialogFooter></DialogContent></Dialog></div>}
export function LogsSection() {
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("All");
  const logsQuery = useQuery({ queryKey: ["backend-logs"], queryFn: fetchLogs, refetchInterval: 5000 });
  const logs = logsQuery.data ?? [];
  const rows = logs.filter(
    (l) => (l.message + l.source).toLowerCase().includes(q.toLowerCase()) && (severity === "All" || l.severity === severity),
  );

  return (
    <div className="space-y-7">
      <PageHeader
        title="Logs"
        subtitle="Real audit log activity for this project."
        action={
          <Button variant="outline" onClick={() => logsQuery.refetch()}>
            <RefreshCw /> Refresh
          </Button>
        }
      />
      <Panel>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search logs" className="pl-9" />
          </div>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "Info", "Success", "Warning", "Error"].map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-5 overflow-x-auto">
          {logsQuery.isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{(logsQuery.error as Error).message}</p>
          ) : (
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {["Timestamp", "Severity", "Source", "Message", "Request ID"].map((x) => (
                    <th className="py-3 pr-4 font-medium" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr className="border-b last:border-0" key={l.id}>
                    <td className="py-4 pr-4 text-muted-foreground">{l.time}</td>
                    <td className="pr-4">
                      <Status tone={l.severity === "Success" ? "success" : l.severity === "Warning" ? "warning" : l.severity === "Error" ? "danger" : "info"}>
                        {l.severity}
                      </Status>
                    </td>
                    <td className="pr-4">{l.source}</td>
                    <td className="pr-4">{l.message}</td>
                    <td className="pr-4 font-mono text-xs text-muted-foreground">{l.requestId}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No logs yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Panel>
    </div>
  );
}
const endpoints=[{method:"GET",path:"/api/projects",description:"List available projects"},{method:"GET",path:"/api/users",description:"List project users"},{method:"GET",path:"/api/database/collections",description:"Inspect collection metadata"},{method:"GET",path:"/api/analytics",description:"Read project analytics"},{method:"POST",path:"/api/workflows/run",description:"Start a workflow run"},{method:"GET",path:"/api/logs",description:"Read project logs"}];
export function ApiSection(){return <div className="space-y-7"><PageHeader title="API" subtitle="Mock documentation and key management." action={<Status tone="warning">Prototype API — Demonstration only</Status>}/><div className="grid gap-4 sm:grid-cols-4"><Metric label="API status" value="Online" detail="Simulated"/><Metric label="Version" value="v1"/><Metric label="Requests" value="48.2K"/><Metric label="API keys" value="2"/></div><Panel><PanelTitle title="Base URL" description="No requests are sent to this address."/><div className="mt-4 flex gap-2"><Input readOnly value="https://api.flameflow.local/v1/ngo-ledger"/><Button variant="outline" size="icon" onClick={()=>toast.success("Base URL copied")} aria-label="Copy base URL"><Copy/></Button></div></Panel><div className="space-y-3">{endpoints.map(e=><Panel key={e.path} className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"><Status tone={e.method==="POST"?"warning":"info"}>{e.method}</Status><div className="min-w-0"><p className="truncate font-mono text-sm">{e.path}</p><p className="mt-1 text-xs text-muted-foreground">{e.description}</p></div><Button variant="ghost" size="icon" onClick={()=>navigator.clipboard.writeText(e.path).then(()=>toast.success("Endpoint copied"))} aria-label={`Copy ${e.path}`}><Copy/></Button></Panel>)}</div><Panel><PanelTitle title="API keys" description="Credentials shown here are always masked." action={<Button size="sm" onClick={()=>toast.success("Mock API key created: pk_flameflow_demo_••••••••")}><Plus/> Create key</Button>}/><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-3">Name</th><th>Environment</th><th>Created</th><th>Last used</th><th>Status</th></tr></thead><tbody><tr><td className="py-4">Production client<br/><span className="font-mono text-xs text-muted-foreground">pk_flameflow_demo_••••••••</span></td><td>Production</td><td>Aug 14</td><td>4 min ago</td><td><Status tone="success">Active</Status></td></tr></tbody></table></div></Panel></div>}
export function McpSection(){const {state,update}=useProject();const [open,setOpen]=useState(false);const [name,setName]=useState("");return <div className="space-y-7"><PageHeader title="MCP" subtitle="Manage simulated Model Context Protocol connections for your project." action={<Button onClick={()=>setOpen(true)}><Plus/> Add server</Button>}/><Panel className="bg-info-soft/40"><div className="flex gap-3"><Cable className="size-5 shrink-0 text-info"/><p className="text-sm text-muted-foreground">MCP allows AI applications and agents to connect to tools and structured project context through a standardized interface.</p></div></Panel><div className="grid gap-4 lg:grid-cols-3">{state.mcp.map(s=><Panel key={s.id}><div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-md bg-muted"><Cable className="size-5"/></div><Status tone={s.connected?"success":"neutral"}>{s.connected?"Connected":"Disconnected"}</Status></div><h2 className="mt-5 font-semibold">{s.name}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{s.description}</p><div className="mt-4 text-xs text-muted-foreground">{s.tools} available tools · Synced {s.synced}</div><div className="mt-5 flex gap-2"><Button size="sm" variant={s.connected?"outline":"default"} onClick={()=>update("mcp",state.mcp.map(x=>x.id===s.id?{...x,connected:!x.connected}:x))}>{s.connected?"Disconnect":"Connect"}</Button><Button size="sm" variant="ghost" onClick={()=>toast.info("Tool permissions: Read expenses, Read projects, Create expense, Approve expense, Generate report")}>Configure</Button></div></Panel>)}</div><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Add MCP server</DialogTitle><DialogDescription>This creates a simulated connection only.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="mcp-name">Server name</Label><Input id="mcp-name" value={name} onChange={e=>setName(e.target.value.slice(0,100))} className="mt-1.5"/></div><div><Label htmlFor="mcp-url">Server URL</Label><Input id="mcp-url" type="url" placeholder="https://example.local/mcp" className="mt-1.5"/></div><div><Label htmlFor="mcp-description">Description</Label><Textarea id="mcp-description" className="mt-1.5"/></div></div><DialogFooter><Button variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={()=>{if(name.trim().length<2){toast.error("Enter a server name");return}update("mcp",[...state.mcp,{id:crypto.randomUUID(),name:name.trim(),description:"Custom project context",connected:false,tools:0,synced:"Never"}]);setName("");setOpen(false);toast.success("MCP server added")}}>Add server</Button></DialogFooter></DialogContent></Dialog></div>}
