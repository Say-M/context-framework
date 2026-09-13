import type { FlameflowState } from "@/types/flameflow";
export const initialState: FlameflowState = {
 project:{id:"ngo-ledger",name:"NGO Ledger",slug:"ngo-ledger",description:"A streamlined expense tracking tool designed for NGOs to manage project costs, categorize spending, and maintain financial transparency.",createdAt:"2026-08-14",visibility:"public",isFavorite:false,badgeVisible:true,previewUrl:"https://ngo-ledger.flameflow.local",environment:"production",deploymentStatus:"deployed"},
 users:[
  {id:"u1",name:"Admin User",email:"admin@ngo-ledger.local",role:"Admin",status:"Active",lastActive:"2 minutes ago",joined:"Aug 14, 2026"},
  {id:"u2",name:"Project Manager",email:"manager@ngo-ledger.local",role:"Manager",status:"Active",lastActive:"1 hour ago",joined:"Aug 16, 2026"},
  {id:"u3",name:"Finance Officer",email:"finance@ngo-ledger.local",role:"Member",status:"Active",lastActive:"Yesterday",joined:"Aug 18, 2026"},
  {id:"u4",name:"Viewer",email:"viewer@ngo-ledger.local",role:"Viewer",status:"Pending",lastActive:"Never",joined:"Sep 10, 2026"}],
 integrations:[
  {id:"stripe",name:"Stripe",category:"Payments",description:"Accept and manage payments",connected:false},{id:"ga",name:"Google Analytics",category:"Analytics",description:"Understand app traffic",connected:true},{id:"sheets",name:"Google Sheets",category:"Developer tools",description:"Sync tabular reports",connected:false},{id:"slack",name:"Slack",category:"Communication",description:"Send workspace alerts",connected:false},{id:"gmail",name:"Gmail",category:"Communication",description:"Send project messages",connected:false},{id:"supabase",name:"Supabase",category:"Storage",description:"Connect hosted data",connected:false},{id:"firebase",name:"Firebase",category:"Authentication",description:"Manage app identity",connected:false},{id:"github",name:"GitHub",category:"Developer tools",description:"Sync source changes",connected:true},{id:"webhooks",name:"Webhooks",category:"Developer tools",description:"Deliver event payloads",connected:false},{id:"rest",name:"REST API",category:"Developer tools",description:"Connect custom systems",connected:false}],
 agents:[
  ["a1","UI Designer","Improves interface consistency",true,"12 min ago",42],["a2","Frontend Engineer","Builds accessible product surfaces",true,"1 hour ago",86],["a3","Code Reviewer","Reviews changes and risks",true,"Yesterday",31],["a4","SEO Specialist","Optimizes search readiness",false,"3 days ago",12],["a5","Test Engineer","Checks critical user journeys",true,"5 hours ago",64]
 ].map(x=>({id:String(x[0]),name:String(x[1]),description:String(x[2]),enabled:Boolean(x[3]),lastRun:String(x[4]),runs:Number(x[5]),permissions:["Read project files","Run tests","Read analytics"]})),
 workflows:[
  {id:"w1",name:"On project update",trigger:"Project update",enabled:true,lastRun:"18 min ago",steps:["Trigger","Validate data","Update project","Notify owner","Complete"]},
  {id:"w2",name:"On deployment",trigger:"Deployment",enabled:true,lastRun:"Yesterday",steps:["Trigger","Run checks","Deploy","Notify team","Complete"]},
  {id:"w3",name:"On user registration",trigger:"User registration",enabled:false,lastRun:"4 days ago",steps:["Trigger","Verify user","Assign role","Send welcome","Complete"]},
  {id:"w4",name:"Scheduled analytics report",trigger:"Scheduled",enabled:true,lastRun:"Sep 12",steps:["Schedule","Collect data","Build report","Send report","Complete"]}],
 logs:[
  {id:"l1",time:"Sep 13, 2026 · 19:20",severity:"Success",source:"Users",message:"User invited",requestId:"req_2F8A"},{id:"l2",time:"Sep 13, 2026 · 18:21",severity:"Info",source:"Settings",message:"Project settings updated",requestId:"req_7C21"},{id:"l3",time:"Sep 13, 2026 · 17:22",severity:"Success",source:"Workflows",message:"Workflow executed",requestId:"req_91BD"},{id:"l4",time:"Sep 13, 2026 · 16:23",severity:"Info",source:"Agents",message:"Agent activated",requestId:"req_A782"},{id:"l5",time:"Sep 13, 2026 · 15:24",severity:"Warning",source:"API",message:"API request rate approaching limit",requestId:"req_D031"},{id:"l6",time:"Sep 13, 2026 · 14:25",severity:"Info",source:"Domain",message:"Domain added",requestId:"req_F23C"},{id:"l7",time:"Sep 13, 2026 · 13:26",severity:"Success",source:"Security",message:"Security scan completed",requestId:"req_114A"}],
 mcp:[
  {id:"m1",name:"NGO Ledger Context Server",description:"Project context and records",connected:true,tools:8,synced:"4 min ago"},
  {id:"m2",name:"Expense Workflow Server",description:"Expense review actions",connected:true,tools:5,synced:"1 hour ago"},
  {id:"m3",name:"Accounting Data Server",description:"Financial reporting context",connected:false,tools:6,synced:"2 days ago"}],
 collaborators:[{id:"c1",name:"Project Manager",email:"manager@ngo-ledger.local",role:"Editor",status:"Active"},{id:"c2",name:"Finance Viewer",email:"finance@ngo-ledger.local",role:"Viewer",status:"Active"}]
};
export const collections=[
 {name:"Expenses",description:"Submitted project expenses",records:248,updated:"8 min ago"},{name:"Projects",description:"Program and grant projects",records:18,updated:"1 hour ago"},{name:"Employees",description:"Team member profiles",records:46,updated:"Yesterday"},{name:"Vendors",description:"Approved suppliers",records:72,updated:"Yesterday"},{name:"Approvals",description:"Expense review decisions",records:183,updated:"12 min ago"},{name:"Categories",description:"Expense classifications",records:24,updated:"Sep 10"},{name:"Transactions",description:"Ledger entries",records:612,updated:"5 min ago"}];
export const expenses=[
 {id:"EXP-2048",project:"Clean Water Initiative",employee:"Maya Rahman",amount:"$1,240.00",category:"Field supplies",status:"Approved"},
 {id:"EXP-2047",project:"Education Access",employee:"Ibrahim Noor",amount:"$486.50",category:"Transport",status:"Pending"},
 {id:"EXP-2046",project:"Food Security",employee:"Nadia Karim",amount:"$2,810.00",category:"Procurement",status:"Approved"},
 {id:"EXP-2045",project:"Health Outreach",employee:"Samir Das",amount:"$730.25",category:"Events",status:"Review"}];
