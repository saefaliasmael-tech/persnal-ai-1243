import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Bot,
  Brain,
  Globe,
  Terminal,
  FolderKanban,
  Activity as ActivityIcon,
  Play,
  ArrowRight,
  Shield,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { aiService } from '../../services/aiService.ts';
import { agentService } from '../../services/agentService.ts';
import { activityService } from '../../services/activityService.ts';
import { projectService } from '../../services/projectService.ts';
import { knowledgeService } from '../../services/knowledgeService.ts';
import type { ActivityEvent, NavSection, ProjectMetadata, ServiceConnectionStatus } from '../../types/models.ts';

interface HomeViewProps {
  onNavigate: (section: NavSection) => void;
  onOpenConnectAI: () => void;
  onOpenTerminalPopup: () => void;
  onOpenBrowserPopup: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onOpenConnectAI,
  onOpenTerminalPopup,
  onOpenBrowserPopup,
}) => {
  const [aiStatus, setAiStatus] = useState<ServiceConnectionStatus>(aiService.getStatus());
  const [recentActivities, setRecentActivities] = useState<ActivityEvent[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(projectService.getActiveProject());
  const [projectCount, setProjectCount] = useState(projectService.getProjects().length);
  const [knowledgeStats, setKnowledgeStats] = useState(knowledgeService.getStorageStats());

  useEffect(() => {
    const unsubAi = aiService.subscribe((status) => setAiStatus(status));
    const unsubAct = activityService.subscribe((events) => setRecentActivities(events.slice(0, 5)));
    const unsubProj = projectService.subscribe((projects, active) => {
      setActiveProject(active);
      setProjectCount(projects.length);
    });
    const unsubKnow = knowledgeService.subscribe(() => {
      setKnowledgeStats(knowledgeService.getStorageStats());
    });

    return () => {
      unsubAi();
      unsubAct();
      unsubProj();
      unsubKnow();
    };
  }, []);

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Personal AI Desktop Workspace
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Windows 10 personal local AI coding assistant foundation. Architecture ready for local models and autonomous agents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('agent')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Agent Task
          </button>
        </div>
      </div>

      {/* System State Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* AI MODEL CARD */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-800 text-blue-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-400">AI MODEL</div>
                <div className="text-sm font-semibold text-neutral-100">
                  {aiStatus === 'connected' ? 'Ollama / Local Runner' : 'Not Connected'}
                </div>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full mt-1.5 ${
                aiStatus === 'connected' ? 'bg-emerald-400' : 'bg-neutral-600'
              }`}
            />
          </div>

          <div className="text-[11px] text-neutral-400">
            {aiStatus === 'connected' ? (
              <span className="text-emerald-400 font-mono">Status: Connected to local runtime</span>
            ) : (
              <span>Status: Disconnected (No local model bound)</span>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={onOpenConnectAI}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {aiStatus === 'connected' ? 'Configure Runner →' : 'Connect Model →'}
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">Port 11434</span>
          </div>
        </div>

        {/* AGENT CARD */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-800 text-purple-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-400">AGENT</div>
                <div className="text-sm font-semibold text-neutral-100">Local Engine</div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
          </div>

          <div className="text-[11px] text-neutral-400">
            <span className="text-emerald-400 font-mono">Status: Ready</span>
            <span className="text-neutral-500 ml-2">· Local Agent Adapter</span>
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={() => onNavigate('agent')}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              Open Agent Console →
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">Safe Mode Active</span>
          </div>
        </div>

        {/* KNOWLEDGE CARD */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-800 text-amber-400">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-400">KNOWLEDGE / RAG</div>
                <div className="text-sm font-semibold text-neutral-100">Local Vector Index</div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
          </div>

          <div className="text-[11px] text-neutral-400">
            <span className="text-emerald-400 font-mono">Status: Ready</span>
            <span className="text-neutral-500 ml-2">· {knowledgeStats.totalItems} indexed sources</span>
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={() => onNavigate('knowledge')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Manage Data Sources →
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">
              {(knowledgeStats.totalBytes / (1024 * 1024)).toFixed(1)} MB
            </span>
          </div>
        </div>

        {/* BROWSER CARD */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-800 text-teal-400">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-400">BROWSER</div>
                <div className="text-sm font-semibold text-neutral-100">Automation Child Popup</div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
          </div>

          <div className="text-[11px] text-neutral-400">
            <span className="text-emerald-400 font-mono">Status: Ready</span>
            <span className="text-neutral-500 ml-2">· Live web navigation & search</span>
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={onOpenBrowserPopup}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium transition-colors"
            >
              Open Browser Popup →
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">DuckDuckGo</span>
          </div>
        </div>

        {/* TERMINAL CARD */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-800 text-emerald-400">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-400">TERMINAL</div>
                <div className="text-sm font-semibold text-neutral-100">Process Execution Subsystem</div>
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
          </div>

          <div className="text-[11px] text-neutral-400">
            <span className="text-emerald-400 font-mono">Status: Ready</span>
            <span className="text-neutral-500 ml-2">· Windows child_process</span>
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={onOpenTerminalPopup}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Open Terminal Popup →
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">Interactive</span>
          </div>
        </div>

        {/* PROJECTS CARD */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex flex-col justify-between space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-neutral-800 text-indigo-400">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-400">PROJECTS</div>
                <div className="text-sm font-semibold text-neutral-100 truncate max-w-[170px]">
                  {activeProject ? activeProject.name : 'No Active Project'}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
              {projectCount}
            </span>
          </div>

          <div className="text-[11px] text-neutral-400 truncate">
            {activeProject ? activeProject.path : 'Click to select or register a folder'}
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Manage Projects →
            </button>
            <span className="text-[10px] text-neutral-500 font-mono">
              {activeProject?.gitBranch || 'git: main'}
            </span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity List */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-neutral-400" />
              <h2 className="text-sm font-semibold text-neutral-100">Recent Activity</h2>
            </div>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              View All Activity →
            </button>
          </div>

          <div className="space-y-2 pt-1">
            {recentActivities.length === 0 ? (
              <div className="text-neutral-500 text-xs py-4 text-center">No recent activity logged.</div>
            ) : (
              recentActivities.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between p-2.5 rounded-lg border border-neutral-800/60 bg-neutral-950/40 text-xs"
                >
                  <div className="space-y-0.5 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200">{evt.title}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded uppercase ${
                          evt.status === 'completed'
                            ? 'text-emerald-400 bg-emerald-950/40'
                            : evt.status === 'in_progress'
                            ? 'text-amber-400 bg-amber-950/40'
                            : evt.status === 'failed'
                            ? 'text-rose-400 bg-rose-950/40'
                            : 'text-neutral-400 bg-neutral-800'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-[11px] truncate">{evt.description}</p>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                    {evt.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Architecture & Guarantees */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-neutral-100 text-sm font-semibold">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>Foundation Architecture</span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Engineered specifically for non-programmer Windows 10 users:
            </p>

            <ul className="mt-3 space-y-2 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero manual terminal typing required.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Real Electron child popup windows for live observation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Permission guard checks before executing commands.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Separation of Knowledge (RAG) and Model Training.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Modular service interfaces for future local model adapters.</span>
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
            <div className="font-semibold text-neutral-200">Current Workspace:</div>
            <div className="font-mono text-neutral-400 truncate">
              {activeProject?.path || 'C:\\Users\\Developer\\Projects'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
