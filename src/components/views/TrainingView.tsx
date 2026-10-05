import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Play,
  Square,
  Cpu,
  AlertTriangle,
  Folder,
  Sliders,
  Terminal as TerminalIcon,
  CheckCircle2,
} from 'lucide-react';
import { trainingService } from '../../services/trainingService.ts';
import type { TrainingConfig, TrainingState } from '../../types/models.ts';

export const TrainingView: React.FC = () => {
  const [state, setState] = useState<TrainingState>(trainingService.getState());
  const [config, setConfig] = useState<TrainingConfig>(trainingService.getConfig());
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    const unsub = trainingService.subscribe((newState) => {
      setState(newState);
    });
    return () => unsub();
  }, []);

  const handleStartTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    try {
      await trainingService.startTraining(config);
    } catch (err: any) {
      setErrorBanner(err.message || 'Training engine not connected.');
    }
  };

  const handleStopTraining = () => {
    trainingService.stopTraining();
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Local Model Training & Fine-Tuning
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Architecture for LoRA/QLoRA local fine-tuning. Model weights adapt to your personal coding style and patterns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {state.engineStatus === 'training' ? (
            <button
              onClick={handleStopTraining}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/40 transition-colors shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Halt Training
            </button>
          ) : (
            <button
              onClick={handleStartTraining}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Training
            </button>
          )}
        </div>
      </div>

      {/* Engine Status Banner (Honest state: not pretending) */}
      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-neutral-800 text-amber-400 mt-0.5">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold text-neutral-200">
              Training Engine Status:{' '}
              <span className="font-mono text-amber-400">
                {state.engineStatus === 'ready' ? 'Ready' : 'Not Connected Yet'}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              Target Runner: <span className="text-neutral-300">{state.engineName}</span>.
              In this foundation phase, training interfaces are decoupled from execution.
              Never pretending training took place when an engine is disconnected.
            </p>
          </div>
        </div>
      </div>

      {errorBanner && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/30 flex items-start gap-3 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <div className="font-semibold">Engine Requirement:</div>
            <div>{errorBanner}</div>
          </div>
        </div>
      )}

      {/* Training Configuration Form */}
      <form onSubmit={handleStartTraining} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Dataset & Paths */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold">
            <Folder className="w-4 h-4 text-blue-400" />
            <span>Dataset & Model Configuration</span>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Dataset Selection (.jsonl, .parquet)</label>
            <input
              type="text"
              value={config.datasetPath}
              onChange={(e) => setConfig({ ...config, datasetPath: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Base Foundation Model</label>
            <input
              type="text"
              value={config.modelBase}
              onChange={(e) => setConfig({ ...config, modelBase: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1.5">Output Weights Directory (Checkpoint Location)</label>
            <input
              type="text"
              value={config.outputLocation}
              onChange={(e) => setConfig({ ...config, outputLocation: e.target.value })}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right Card: Hyperparameters */}
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-neutral-100 font-semibold">
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Hyperparameters</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">Epochs</label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.epochs}
                onChange={(e) => setConfig({ ...config, epochs: parseInt(e.target.value) || 1 })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">Batch Size</label>
              <input
                type="number"
                min="1"
                max="64"
                value={config.batchSize}
                onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) || 1 })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">Learning Rate</label>
              <input
                type="number"
                step="0.00001"
                value={config.learningRate}
                onChange={(e) => setConfig({ ...config, learningRate: parseFloat(e.target.value) || 0.0001 })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1.5">LoRA Rank (r)</label>
              <input
                type="number"
                value={config.loraRank}
                onChange={(e) => setConfig({ ...config, loraRank: parseInt(e.target.value) || 16 })}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 text-[11px] text-neutral-500 leading-relaxed font-sans">
            Configured for Windows 10 GPU execution via PyTorch DirectML or NVIDIA CUDA.
          </div>
        </div>
      </form>

      {/* Progress & Live Training Engine Log Viewer */}
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-100">
            <TerminalIcon className="w-4 h-4 text-neutral-400" />
            <span>Training Engine Output Stream</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">
            Status: {state.engineStatus.toUpperCase()}
          </span>
        </div>

        <div className="h-44 overflow-y-auto p-3 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-300 space-y-1 select-text">
          {state.logs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
