import React, { useEffect, useState } from 'react';
import {
  Bot,
  Play,
  Pause,
  Square,
  Shield,
  Terminal,
  Globe,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Sparkles,
  Cpu,
  Wrench,
  ListOrdered,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { agentService, AgentRunState } from '../../services/agentService.ts';
import { projectService } from '../../services/projectService.ts';
import { toolRegistry } from '../../services/agent/toolRegistry.ts';
import { skillRegistry } from '../../services/agent/skillRegistry.ts';
import type { ProjectMetadata } from '../../types/models.ts';
import type { ToolMetadata, SkillManifest } from '../../types/agent.ts';

interface AgentViewProps {
  onOpenTerminalPopup: () => void;
  onOpenBrowserPopup: () => void;
}

export const AgentView: React.FC<AgentViewProps> = ({
  onOpenTerminalPopup,
  onOpenBrowserPopup,
}) => {
  const [runState, setRunState] = useState<AgentRunState>(agentService.getRunState());
  const [taskInput, setTaskInput] = useState('Inspect project structure and check dependencies');
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(projectService.getActiveProject());
  const [allTools, setAllTools] = useState<ToolMetadata[]>(toolRegistry.getAllTools());
  const [allSkills, setAllSkills] = useState<SkillManifest[]>(skillRegistry.getAllSkills());
  const [showRegistryModal, setShowRegistryModal] = useState(false);

  useEffect(() => {
    const unsubAgent = agentService.subscribe((state) => {
      setRunState(state);
    });
    const unsubProj = projectService.subscribe((_, active) => {
      setActiveProject(active);
    });
    const unsubTools = toolRegistry.subscribe((tools) => {
      setAllTools(tools);
    });
    const unsubSkills = skillRegistry.subscribe((skills) => {
      setAllSkills(skills);
    });
    return () => {
      unsubAgent();
      unsubProj();
      unsubTools();
      unsubSkills();
    };
  }, []);

  const handleStartTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || isBusy) return;
    agentService.startTask(taskInput.trim(), activeProject);
  };

  const handlePause = () => {
    agentService.pauseTask();
  };

  const handleStop = () => {
    agentService.stopTask();
  };

  const isBusy =
    runState.status !== 'idle' &&
    runState.status !== 'completed' &&
    runState.status !== 'failed' &&
    runState.status !== 'stopped';

  const getStateBadge = (status: AgentRunState['status']) => {
    switch (status) {
      case 'paused':
        return { label: 'Paused', color: 'bg-amber-950/80 text-amber-300 border-amber-600/40' };
      case 'idle':
        return { label: 'Idle', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
      case 'thinking':
        return { label: 'Thinking', color: 'bg-purple-950/80 text-purple-300 border-purple-600/40 animate-pulse' };
      case 'planning':
        return { label: 'Planning', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-600/40 animate-pulse' };
      case 'selecting_skill':
        return { label: 'Selecting Skill', color: 'bg-blue-950/80 text-blue-300 border-blue-600/40' };
      case 'selecting_tool':
        return { label: 'Selecting Tool', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/40' };
      case 'requesting_permission':
        return { label: 'Permission Check', color: 'bg-amber-950/80 text-amber-300 border-amber-600/40 animate-pulse' };
      case 'executing':
        return { label: 'Executing Tool', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40 animate-pulse' };
      case 'observing':
        return { label: 'Observing Result', color: 'bg-teal-950/80 text-teal-300 border-teal-600/40' };
      case 'completed':
        return { label: 'Completed', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' };
      case 'failed':
        return { label: 'Failed', color: 'bg-rose-950/80 text-rose-300 border-rose-600/40' };
      case 'stopped':
        return { label: 'Stopped', color: 'bg-neutral-800 text-neutral-400 border-neutral-700' };
      default:
        return { label: status, color: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
    }
  };

  const stateBadge = getStateBadge(runState.status);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Autonomous Agent Console
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300">
              Stage 3.24 Real Loop
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Autonomous AI Agent loop connected to local Ollama (qwen3:14b), modular Tool Registry, and real OS executors.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRegistryModal(!showRegistryModal)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Tools & Skills ({allTools.length}/{allSkills.length})</span>
          </button>

          {isBusy && (
            <button
              onClick={handlePause}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                runState.status === 'paused'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/50 hover:bg-amber-900'
                  : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              {runState.status === 'paused' ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              )}
            </button>
          )}

          {isBusy && (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors shadow-sm"
              title="Abort current operation and halt Agent"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Agent
            </button>
          )}
        </div>
      </div>

      {/* Task Input Section */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4">
        <form onSubmit={handleStartTask} className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Enter Task Instruction</span>
            </label>
            <div className="text-xs text-neutral-400">
              Active Project:{' '}
              <span className="font-semibold text-neutral-200">{activeProject?.name || 'Workspace'}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              disabled={isBusy}
              placeholder="e.g. Inspect project structure and run build tests."
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-hidden focus:border-blue-500 disabled:opacity-50 transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={!taskInput.trim() || isBusy}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold transition-colors shadow-sm shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Agent
            </button>
          </div>

          {/* Quick preset tasks */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-neutral-400">
            <span className="text-neutral-500">Quick Tasks:</span>
            <button
              type="button"
              onClick={() => setTaskInput('افحص المشروع واقرأ الملفات الرئيسية')}
              disabled={isBusy}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
            >
              افحص المشروع
            </button>
            <button
              type="button"
              onClick={() => setTaskInput('اقرأ package.json وافحص التبعيات')}
              disabled={isBusy}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
            >
              اقرأ package.json
            </button>
            <button
              type="button"
              onClick={() => setTaskInput('شغل أمر بسيط داخل المشروع وافحص النتيجة')}
              disabled={isBusy}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
            >
              شغل أمر بسيط
            </button>
            <button
              type="button"
              onClick={() => setTaskInput('Search web for Kotlin Compose navigation documentation')}
              disabled={isBusy}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Web Documentation
            </button>
          </div>
        </form>
      </div>

      {/* Real-Time Agent Execution Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* State */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-1">
          <div className="text-neutral-500 text-[11px] uppercase font-mono tracking-wider">Agent State</div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stateBadge.color}`}>
              {stateBadge.label}
            </span>
          </div>
        </div>

        {/* Selected Skill & Tool */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-1">
          <div className="text-neutral-500 text-[11px] uppercase font-mono tracking-wider">Active Skill & Tool</div>
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 truncate">
              <Cpu className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{runState.activeSkill || 'None'}</span>
            </div>
            <div className="text-[11px] text-cyan-400 flex items-center gap-1.5 truncate font-mono">
              <Wrench className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">{runState.activeTool || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Current Action & Step Counter */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-[11px] uppercase font-mono tracking-wider">
            <span>Current Action</span>
            <span className="text-blue-400 font-semibold">
              Step {runState.currentStep}/{runState.maxSteps}
            </span>
          </div>
          <div className="text-xs font-medium text-neutral-200 truncate" title={runState.currentAction}>
            {runState.currentAction}
          </div>
          <div className="w-full bg-neutral-800 h-1 rounded-full overflow-hidden mt-1.5">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (runState.currentStep / runState.maxSteps) * 100)}%` }}
            />
          </div>
        </div>

        {/* Security & Safe Mode */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-1">
          <div className="text-neutral-500 text-[11px] uppercase font-mono tracking-wider">Security & Safe Mode</div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">Safe Mode: Active (Ask per tool)</span>
          </div>
        </div>
      </div>

      {/* Plan Steps Card (When plan exists) */}
      {runState.plan.length > 0 && (
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-blue-400" />
              <span>Structured Execution Plan ({runState.plan.length} steps)</span>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">
              {runState.plan.filter((s) => s.status === 'completed').length}/{runState.plan.length} completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {runState.plan.map((step) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg border text-xs space-y-1 transition-all ${
                  step.status === 'completed'
                    ? 'border-emerald-500/30 bg-emerald-950/20 text-neutral-200'
                    : step.status === 'in_progress'
                    ? 'border-blue-500/50 bg-blue-950/30 text-white shadow-xs animate-pulse'
                    : step.status === 'failed'
                    ? 'border-rose-500/30 bg-rose-950/20 text-rose-200'
                    : 'border-neutral-800 bg-neutral-950/50 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span>Step {step.stepNumber}</span>
                  <span
                    className={`uppercase font-bold text-[10px] ${
                      step.status === 'completed'
                        ? 'text-emerald-400'
                        : step.status === 'in_progress'
                        ? 'text-blue-400'
                        : step.status === 'failed'
                        ? 'text-rose-400'
                        : 'text-neutral-500'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>
                <p className="font-sans line-clamp-2 text-neutral-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Response Banner (When finished) */}
      {runState.finalResponse && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>Agent Final Summary</span>
          </div>
          <div className="text-xs text-neutral-200 font-sans whitespace-pre-wrap leading-relaxed">
            {runState.finalResponse}
          </div>
        </div>
      )}

      {/* Tool Status & Dedicated Popups Launch Bar */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-neutral-200">
            Executors & Popup Control
          </div>
          <span className="text-[11px] text-neutral-500">
            Child popups open automatically on command execution or web navigation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Terminal Tool Card */}
          <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-neutral-800 text-emerald-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-200">Terminal Process</div>
                <div className="text-[11px] text-neutral-400 capitalize">
                  Status: {runState.toolStatus.terminal}
                </div>
              </div>
            </div>
            <button
              onClick={onOpenTerminalPopup}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-medium transition-colors"
            >
              Open Popup
            </button>
          </div>

          {/* Browser Tool Card */}
          <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-neutral-800 text-blue-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-200">Browser Automation</div>
                <div className="text-[11px] text-neutral-400 capitalize">
                  Status: {runState.toolStatus.browser}
                </div>
              </div>
            </div>
            <button
              onClick={onOpenBrowserPopup}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-blue-400 text-xs font-medium transition-colors"
            >
              Open Popup
            </button>
          </div>

          {/* File System Card */}
          <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-neutral-800 text-purple-400">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-200">File System Boundary</div>
                <div className="text-[11px] text-neutral-400 capitalize">
                  Status: {runState.toolStatus.fileSystem}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">Protected</span>
          </div>
        </div>
      </div>

      {/* Tool & Skill Registry Modal / Drawer */}
      {showRegistryModal && (
        <div className="p-5 rounded-xl border border-blue-500/30 bg-neutral-900/80 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Tool & Skill Registry Overview</h2>
            </div>
            <button
              onClick={() => setShowRegistryModal(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skills */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-300">Registered Skills ({allSkills.length})</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {allSkills.map((sk) => (
                  <div key={sk.id} className="p-2 rounded bg-neutral-950 border border-neutral-800 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-neutral-200">{sk.name}</span>
                      <span className="text-[10px] text-blue-400 font-mono">{sk.tools.length} tools</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">{sk.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-neutral-300">Registered Tools ({allTools.length})</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {allTools.map((tl) => (
                  <div key={tl.id} className="p-2 rounded bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-neutral-200">{tl.name}</div>
                      <div className="text-[11px] text-neutral-400">{tl.description}</div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                        tl.status === 'available'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {tl.status === 'available' ? 'Connected' : 'Not connected yet'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CORE REQUIREMENT: LIVE AGENT ACTIVITY STREAM */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-neutral-100">
              Live Agent Activity Stream
            </h2>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {runState.events.length} events logged
          </span>
        </div>

        {runState.events.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-xs space-y-2 border border-dashed border-neutral-800 rounded-lg">
            <Bot className="w-8 h-8 mx-auto text-neutral-600" />
            <p className="font-medium text-neutral-400">No active task events yet.</p>
            <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
              Enter a task instruction above and click "Start Agent" to watch the real-time execution pipeline.
            </p>
          </div>
        ) : (
          <div className="space-y-2 select-text">
            {runState.events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/80 text-xs hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-neutral-800/80 text-neutral-300 mt-0.5 shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200">{evt.title}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                          evt.status === 'completed'
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20'
                            : evt.status === 'in_progress'
                            ? 'text-blue-400 bg-blue-950/40 border border-blue-500/20 animate-pulse'
                            : evt.status === 'waiting_permission'
                            ? 'text-amber-400 bg-amber-950/40 border border-amber-500/20'
                            : 'text-rose-400 bg-rose-950/40 border border-rose-500/20'
                        }`}
                      >
                        {evt.status === 'waiting_permission' ? 'Waiting for Permission' : evt.status}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-xs font-sans leading-relaxed">
                      {evt.description}
                    </p>
                    {evt.details && (
                      <div className="font-mono text-[11px] text-neutral-500 bg-neutral-900/80 p-1.5 rounded mt-1 border border-neutral-800/60 break-all">
                        {evt.details}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                    {evt.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
