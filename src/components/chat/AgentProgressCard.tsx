import React, { useState } from 'react';
import {
  Pause,
  Play,
  Square,
  ChevronDown,
  ChevronUp,
  Terminal,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { AgentRunState } from '../../services/agentService.ts';
import { agentService } from '../../services/agentService.ts';
import { getFriendlyAgentStatus, getFriendlyStepsFromState } from '../../services/agent/agentDisplayHelper.ts';

interface AgentProgressCardProps {
  runState: AgentRunState;
  onOpenTerminalPopup?: () => void;
  onOpenBrowserPopup?: () => void;
}

export const AgentProgressCard: React.FC<AgentProgressCardProps> = ({
  runState,
  onOpenTerminalPopup,
  onOpenBrowserPopup,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const friendly = getFriendlyAgentStatus(runState);
  const steps = getFriendlyStepsFromState(runState);

  const isBusy =
    runState.status !== 'idle' &&
    runState.status !== 'completed' &&
    runState.status !== 'failed' &&
    runState.status !== 'stopped';

  const isPaused = runState.status === 'paused';

  const handlePauseResume = () => {
    agentService.pauseTask();
  };

  const handleStop = () => {
    agentService.stopTask();
  };

  return (
    <div className="w-full my-3 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/80 shadow-md backdrop-blur-xs transition-all">
      {/* Header with Human Headline */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="text-2xl shrink-0 p-1 rounded-xl bg-neutral-800/80 border border-neutral-700/50">
            {friendly.emoji}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-neutral-100 font-sans tracking-tight">
                {friendly.headline}
              </h3>
              {isBusy && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              {friendly.subtext}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isBusy && (
            <>
              <button
                type="button"
                onClick={handlePauseResume}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  isPaused
                    ? 'bg-amber-950/80 text-amber-300 border-amber-600/40 hover:bg-amber-900'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
                title={isPaused ? 'استئناف' : 'إيقاف مؤقت'}
              >
                {isPaused ? (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>متابعة</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" />
                    <span>إيقاف مؤقت</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-600/40 hover:bg-rose-900 transition-colors"
                title="إيقاف المهمة فوراً"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>إيقاف</span>
              </button>
            </>
          )}

          {/* Dedicated Popup Launchers if relevant */}
          {onOpenTerminalPopup && runState.toolStatus.terminal === 'active' && (
            <button
              type="button"
              onClick={onOpenTerminalPopup}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-emerald-950/60 border border-emerald-600/40 text-emerald-400 hover:bg-emerald-900/60 transition-colors"
              title="فتح نافذة الطرفية المباشرة"
            >
              <Terminal className="w-3 h-3" />
              <span>الطرفية</span>
            </button>
          )}

          {onOpenBrowserPopup && runState.toolStatus.browser === 'active' && (
            <button
              type="button"
              onClick={onOpenBrowserPopup}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-blue-950/60 border border-blue-600/40 text-blue-400 hover:bg-blue-900/60 transition-colors"
              title="فتح نافذة المتصفح"
            >
              <Globe className="w-3 h-3" />
              <span>المتصفح</span>
            </button>
          )}
        </div>
      </div>

      {/* Human-Friendly Progress Steps (Clean & Simple) */}
      {steps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-1.5 font-sans">
          {steps.map((st) => (
            <div
              key={st.id}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                st.status === 'in_progress'
                  ? 'bg-blue-950/30 border border-blue-600/30 text-neutral-100'
                  : st.status === 'completed'
                  ? 'text-neutral-300 bg-neutral-950/40'
                  : st.status === 'failed'
                  ? 'text-rose-300 bg-rose-950/20 border border-rose-800/30'
                  : 'text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="shrink-0">{st.emoji}</span>
                <span className="truncate">{st.text}</span>
              </div>

              <div className="shrink-0 ml-2">
                {st.status === 'in_progress' ? (
                  <span className="flex items-center gap-1 text-[11px] text-blue-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    جاري التنفيذ...
                  </span>
                ) : st.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : st.status === 'failed' ? (
                  <span className="text-[11px] text-rose-400 font-medium">تعذر</span>
                ) : (
                  <span className="text-[11px] text-neutral-600 font-mono">في الانتظار</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expandable Technical Details for Power Users / Developers */}
      <div className="mt-2.5 pt-2 border-t border-neutral-800/40 flex items-center justify-between text-[11px] text-neutral-500">
        <span>
          الخطوة {runState.currentStep} من {runState.maxSteps}
        </span>

        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 hover:text-neutral-300 transition-colors font-sans"
        >
          <span>{showDetails ? 'إخفاء التفاصيل الفنية' : 'عرض التفاصيل الفنية'}</span>
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showDetails && (
        <div className="mt-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-400 space-y-1.5 max-h-48 overflow-y-auto select-text">
          <div className="flex items-center justify-between text-neutral-500 pb-1 border-b border-neutral-800">
            <span>المهارة: {runState.activeSkill || 'تلقائي'}</span>
            <span>الأداة: {runState.activeTool || 'None'}</span>
          </div>
          {runState.events.length === 0 ? (
            <div className="text-neutral-600 italic">لا توجد سجلات بعد.</div>
          ) : (
            runState.events.slice(0, 8).map((evt) => (
              <div key={evt.id} className="leading-tight">
                <span className="text-neutral-500">[{evt.timestamp}]</span>{' '}
                <span className="text-blue-400 font-semibold">{evt.title}</span>:{' '}
                <span className="text-neutral-300">{evt.description}</span>
                {evt.details && (
                  <div className="pl-4 text-[10px] text-neutral-500 break-all">{evt.details}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
