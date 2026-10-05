import type { AgentPlanStep, ExecutedAction, TaskContext, ToolMetadata } from '../../types/agent.ts';
import type { ProjectMetadata } from '../../types/models.ts';

export class ContextManager {
  private context: TaskContext;

  constructor(userRequest: string, project: ProjectMetadata | null, maxSteps = 10) {
    const now = new Date().toISOString();
    this.context = {
      taskId: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userRequest,
      currentState: 'idle',
      plan: [],
      selectedSkills: [],
      activeSkill: null,
      activeTool: null,
      availableTools: [],
      executedActions: [],
      toolResults: {},
      errors: [],
      currentStep: 0,
      maxSteps,
      startedAt: now,
      updatedAt: now,
      project,
    };
  }

  getContext(): TaskContext {
    return { ...this.context };
  }

  updateState(state: TaskContext['currentState']) {
    this.context.currentState = state;
    this.context.updatedAt = new Date().toISOString();
  }

  setPlan(plan: AgentPlanStep[]) {
    this.context.plan = plan;
    this.context.updatedAt = new Date().toISOString();
  }

  updatePlanStep(stepNumber: number, status: AgentPlanStep['status']) {
    const step = this.context.plan.find((s) => s.stepNumber === stepNumber);
    if (step) {
      step.status = status;
      this.context.updatedAt = new Date().toISOString();
    }
  }

  setSelectedSkill(skillId: string) {
    if (!this.context.selectedSkills.includes(skillId)) {
      this.context.selectedSkills.push(skillId);
    }
    this.context.activeSkill = skillId;
    this.context.updatedAt = new Date().toISOString();
  }

  setActiveTool(toolId: string | null) {
    this.context.activeTool = toolId;
    this.context.updatedAt = new Date().toISOString();
  }

  setAvailableTools(toolIds: string[]) {
    this.context.availableTools = toolIds;
  }

  recordAction(action: Omit<ExecutedAction, 'id' | 'timestamp'>): ExecutedAction {
    const recorded: ExecutedAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
    };
    this.context.executedActions.push(recorded);
    if (action.result !== undefined) {
      this.context.toolResults[`step_${action.step}_${action.toolId}`] = action.result;
    }
    if (action.error) {
      this.context.errors.push(action.error);
    }
    this.context.updatedAt = new Date().toISOString();
    return recorded;
  }

  incrementStep(): number {
    this.context.currentStep += 1;
    this.context.updatedAt = new Date().toISOString();
    return this.context.currentStep;
  }

  isStepLimitReached(): boolean {
    return this.context.currentStep >= this.context.maxSteps;
  }

  setFinalResponse(response: string) {
    this.context.finalResponse = response;
    this.context.updatedAt = new Date().toISOString();
  }

  /**
   * Build a concise, structured prompt for Ollama Qwen3:14B to decide the next action
   */
  buildDecisionPrompt(tools: ToolMetadata[]): string {
    const projectInfo = this.context.project
      ? `Project: ${this.context.project.name} (Path: ${this.context.project.path}, Languages: ${this.context.project.languages.join(', ')})`
      : 'No active project selected in workspace.';

    const toolsDescription = tools
      .map(
        (t) =>
          `- ${t.id} (${t.name}): ${t.description} | Schema: ${JSON.stringify(t.inputSchema)}`
      )
      .join('\n');

    const historyDescription =
      this.context.executedActions.length === 0
        ? 'None yet (first step).'
        : this.context.executedActions
            .slice(-4) // Keep recent 4 actions to keep context compact
            .map(
              (a) =>
                `Step ${a.step}: Tool '${a.toolId}' -> Status: ${a.status} | Output: ${JSON.stringify(
                  a.result ? (typeof a.result === 'object' ? a.result : String(a.result).slice(0, 300)) : a.error
                )}`
            )
            .join('\n');

    const planDescription =
      this.context.plan.length === 0
        ? 'Not yet generated.'
        : this.context.plan
            .map((s) => `[${s.status.toUpperCase()}] Step ${s.stepNumber}: ${s.description}`)
            .join('\n');

    return `You are the Personal AI Autonomous Agent on a Windows 10 PC.
Goal: "${this.context.userRequest}"
Active Skill: ${this.context.activeSkill || 'General Developer'}
Workspace ${projectInfo}
Current Step: ${this.context.currentStep + 1} of ${this.context.maxSteps}

Existing Execution Plan:
${planDescription}

Recent Actions & Tool Results:
${historyDescription}

Available Tools:
${toolsDescription}

Instructions:
1. Examine what has been done and what the user wants.
2. If the goal is satisfied based on real tool observations, respond with a final answer:
{"type": "final", "message": "Your summary to the user explaining what was done and the result."}

3. If more work is required (inspecting files, reading code, running commands), choose the next tool to run:
{"type": "tool_call", "tool": "tool_id", "arguments": { ...valid tool input arguments... }}

CRITICAL ANTI-HALLUCINATION & FILE ACCESS RULES:
- If the user task asks to read, inspect, check, or examine files or directory structure: YOU MUST CALL 'file_tool' (action: 'read' or 'list') or 'project_tool' FIRST.
- NEVER guess or assume file contents, existence, or project architecture without calling 'file_tool'.
- YOU ARE STRICTLY FORBIDDEN from stating that a file does not exist unless you have actually attempted to read it via 'file_tool' and received an error.
- NEVER assume the project is Android or any specific framework unless confirmed by real files (like package.json, vite.config.ts, etc.) returned by 'file_tool'.
- Always cite the real file paths and real data obtained from the tools.
- Output ONLY valid JSON. No conversational text or markdown fences outside the JSON.
`;
  }
}
