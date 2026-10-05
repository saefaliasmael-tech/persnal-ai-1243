import type { ActivityEvent, ProjectMetadata, SystemPermissions } from './models.ts';

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'planning'
  | 'selecting_skill'
  | 'selecting_tool'
  | 'requesting_permission'
  | 'executing'
  | 'observing'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'paused';

export interface AgentPlanStep {
  id: string;
  stepNumber: number;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  toolId?: string;
  skillId?: string;
}

export interface ExecutedAction {
  id: string;
  step: number;
  toolId: string;
  skillId?: string;
  action: string;
  args: any;
  result?: any;
  error?: string;
  durationMs?: number;
  timestamp: string;
  status: 'success' | 'failed' | 'stopped';
}

export interface TaskContext {
  taskId: string;
  userRequest: string;
  currentState: AgentState;
  plan: AgentPlanStep[];
  selectedSkills: string[];
  activeSkill: string | null;
  activeTool: string | null;
  availableTools: string[];
  executedActions: ExecutedAction[];
  toolResults: Record<string, any>;
  errors: string[];
  currentStep: number;
  maxSteps: number;
  startedAt: string;
  updatedAt: string;
  project: ProjectMetadata | null;
  finalResponse?: string;
}

export type ToolStatus = 'available' | 'unavailable' | 'not_connected' | 'disabled' | 'error';

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'file' | 'terminal' | 'browser' | 'git' | 'project' | 'analysis' | 'test' | 'build' | 'system' | 'misc';
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
  permission: keyof SystemPermissions;
  available: boolean;
  status: ToolStatus;
  statusMessage?: string;
  execute: (args: any, context: TaskContext) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  enabled: boolean;
  isCustom?: boolean;
  tools: string[];
  permissions: (keyof SystemPermissions)[];
  instructions: string;
  examples?: string[];
}

export interface ModelToolCallDecision {
  type: 'tool_call';
  tool: string;
  arguments: Record<string, any>;
  thought?: string;
}

export interface ModelFinalDecision {
  type: 'final';
  message: string;
  thought?: string;
}

export type ModelDecision = ModelToolCallDecision | ModelFinalDecision;
