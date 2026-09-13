import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";
import { AppShell } from "@/components/dashboard/AppShell";
import { ProjectProvider } from "@/context/ProjectContext";
import { useAuth } from "@/context/AuthContext";
import { sections } from "@/types/flameflow";
import { Overview } from "@/components/dashboard/Overview";
import { AnalyticsSection,DatabaseSection,IntegrationsSection,SecuritySection,UsersSection } from "@/components/dashboard/ManagementSections";
import { AgentsSection,ApiSection,LogsSection,McpSection,WorkflowsSection } from "@/components/dashboard/AutomationSections";
import { SettingsSection } from "@/components/dashboard/SettingsSection";
const searchSchema=z.object({projectId:z.string().catch("ngo-ledger"),section:z.enum(sections).catch("overview")});
export const Route=createFileRoute("/dashboard")({validateSearch:(search)=>searchSchema.parse(search),head:()=>({meta:[{title:"NGO Ledger Dashboard — Flameflow"},{name:"description",content:"Manage NGO Ledger users, data, analytics, automation, and project settings in Flameflow."},{property:"og:title",content:"NGO Ledger Dashboard — Flameflow"},{property:"og:description",content:"A complete independent project management console for NGO Ledger."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary_large_image"}]}),component:Dashboard});
function Dashboard(){const {section}=Route.useSearch();const {loading,authenticated}=useAuth();if(loading)return null;if(!authenticated)return <Navigate to="/login" replace/>;return <ProjectProvider><AppShell section={section}>{section==="overview"&&<Overview/>}{section==="users"&&<UsersSection/>}{section==="database"&&<DatabaseSection/>}{section==="analytics"&&<AnalyticsSection/>}{section==="integrations"&&<IntegrationsSection/>}{section==="security"&&<SecuritySection/>}{section==="agents"&&<AgentsSection/>}{section==="workflows"&&<WorkflowsSection/>}{section==="logs"&&<LogsSection/>}{section==="api"&&<ApiSection/>}{section==="settings"&&<SettingsSection/>}{section==="mcp"&&<McpSection/>}</AppShell></ProjectProvider>}
