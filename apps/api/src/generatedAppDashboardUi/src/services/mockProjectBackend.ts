import { initialState } from "@/data/flameflow";
import type { FlameflowState, ProjectConfig } from "@/types/flameflow";
export interface ProjectBackend { getProject():Promise<ProjectConfig>; updateProject(updates:Partial<ProjectConfig>):Promise<ProjectConfig>; getUsers():Promise<FlameflowState["users"]>; getAgents():Promise<FlameflowState["agents"]>; getWorkflows():Promise<FlameflowState["workflows"]>; getLogs():Promise<FlameflowState["logs"]> }
const wait=()=>new Promise(r=>setTimeout(r,180));
export const mockProjectBackend:ProjectBackend={async getProject(){await wait();return initialState.project},async updateProject(updates){await wait();return {...initialState.project,...updates}},async getUsers(){await wait();return initialState.users},async getAgents(){await wait();return initialState.agents},async getWorkflows(){await wait();return initialState.workflows},async getLogs(){await wait();return initialState.logs}};
