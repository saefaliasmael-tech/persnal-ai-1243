import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  Hammer,
  Play,
  Square,
  CheckCircle2,
  AlertOctagon,
  Clock,
  RotateCw,
  Terminal,
} from 'lucide-react';
import { testingService } from '../../services/testingService.ts';
import { projectService } from '../../services/projectService.ts';
import type { ProjectMetadata, TestingState } from '../../types/models.ts';

export const TestingView: React.FC = () => {
  const [state, setState] = useState<TestingState>(testingService.getState());
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(projectService.getActiveProject());

  useEffect(() => {
    const unsubTest = testingService.subscribe((s) => setState(s));
    const unsubProj = projectService.subscribe((_, active) => setActiveProject(active));
    return () => {
      unsubTest();
      unsubProj();
    };
  }, []);

  const handleBuild = () => {
    if (activeProject) {
      testingService.buildProject(activeProject);
    }
  };

  const handleRunAll = () => {
    if (activeProject) {
      testingService.runAllTests(activeProject);
    }
  };

  const handleRunSingle = (name: string) => {
    if (activeProject) {
      testingService.runTest(activeProject, name);
    }
  };

  const handleStop = () => {
    testingService.stop();
  };

  const isExecuting = state.status === 'building' || state.status === 'running';

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Automated Testing & Build Verification
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Execute builds and automated regression test suites through the real process backend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isExecuting ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Process
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBuild}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 transition-colors"
              >
                <Hammer className="w-3.5 h-3.5 text-amber-400" />
                Build Project
              </button>
              <button
                onClick={handleRunAll}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Run All Tests
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Target Project Info Card */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-xs text-neutral-400 font-medium">Target Project:</div>
          <div className="text-sm font-semibold text-neutral-100">
            {activeProject?.name || 'No project selected'}
          </div>
          <div className="text-[11px] font-mono text-neutral-500 truncate max-w-lg">
            {activeProject?.path}
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <div className="text-neutral-500 text-[10px]">PASSED</div>
            <div className="text-emerald-400 font-bold text-sm">{state.passedCount}</div>
          </div>
          <div className="text-right">
            <div className="text-neutral-500 text-[10px]">FAILED</div>
            <div className="text-rose-400 font-bold text-sm">{state.failedCount}</div>
          </div>
          <div className="text-right">
            <div className="text-neutral-500 text-[10px]">TOTAL</div>
            <div className="text-neutral-300 font-bold text-sm">{state.totalCount}</div>
          </div>
        </div>
      </div>

      {/* Test Suites List */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-100">Test Suites</h2>
          <span className="text-xs text-neutral-500 font-mono">
            Status: {state.status.toUpperCase()}
          </span>
        </div>

        <div className="space-y-2">
          {state.suites.map((suite) => (
            <div
              key={suite.id}
              className="flex items-center justify-between p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 text-xs hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {suite.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : suite.status === 'failed' ? (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                ) : suite.status === 'running' ? (
                  <RotateCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-neutral-600 shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-neutral-200 font-mono">{suite.name}</div>
                  <div className="text-[11px] text-neutral-400 font-sans">{suite.message}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {suite.durationMs > 0 && (
                  <span className="text-[11px] font-mono text-neutral-500">
                    {suite.durationMs}ms
                  </span>
                )}
                <button
                  onClick={() => handleRunSingle(suite.name)}
                  disabled={isExecuting}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors disabled:opacity-40"
                >
                  Run
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Process Log Stream */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-100">
            <Terminal className="w-4 h-4 text-neutral-400" />
            <span>Process Stdio Output</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500">live stream</span>
        </div>

        <div className="h-44 overflow-y-auto p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1 select-text">
          {state.rawLogs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
