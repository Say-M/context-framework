import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { initialState } from "@/data/flameflow";
import type { FlameflowState } from "@/types/flameflow";
const KEY="flameflow-ngo-ledger-v1";
type Ctx={state:FlameflowState; update:<K extends keyof FlameflowState>(key:K,value:FlameflowState[K])=>void; patchProject:(value:Partial<FlameflowState["project"]>)=>void};
const ProjectContext=createContext<Ctx|undefined>(undefined);
export function ProjectProvider({children}:{children:ReactNode}){const [state,setState]=useState(initialState);useEffect(()=>{try{const saved=localStorage.getItem(KEY);if(saved)setState({...initialState,...JSON.parse(saved)})}catch{}},[]);useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}},[state]);const value=useMemo<Ctx>(()=>({state,update:(key,value)=>setState(s=>({...s,[key]:value})),patchProject:value=>setState(s=>({...s,project:{...s.project,...value}}))}),[state]);return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>}
export function useProject(){const ctx=useContext(ProjectContext);if(!ctx)throw new Error("useProject must be used within ProjectProvider");return ctx}
