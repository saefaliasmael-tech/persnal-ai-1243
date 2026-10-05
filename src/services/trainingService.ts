import type { TrainingConfig, TrainingState } from '../types/models.ts';
import type { ITrainingService } from '../types/services.ts';
import { activityService } from './activityService.ts';

class TrainingService implements ITrainingService {
  private state: TrainingState = {
    engineStatus: 'not_connected',
    engineName: 'Local Fine-Tuning Runner (Unsloth / Axolotl)',
    currentEpoch: 0,
    totalEpochs: 0,
    progressPercent: 0,
    loss: undefined,
    logs: [
      '[Engine Standby] No local training engine currently bound.',
      'Configure local runner endpoint (PyTorch / Unsloth) in Training settings.',
    ],
    activeJobId: null,
  };

  private config: TrainingConfig = {
    datasetPath: 'C:\\Users\\Developer\\Datasets\\android_instructions.jsonl',
    modelBase: 'Qwen2.5-Coder-7B-Instruct',
    epochs: 3,
    batchSize: 4,
    learningRate: 0.0002,
    outputLocation: 'C:\\Users\\Developer\\Models\\lora_android_assistant',
    loraRank: 16,
    gradientAccumulationSteps: 4,
  };

  private subscribers: ((state: TrainingState) => void)[] = [];

  getState(): TrainingState {
    return { ...this.state };
  }

  getConfig(): TrainingConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<TrainingConfig>) {
    this.config = { ...this.config, ...updates };
  }

  async connectEngine(engineType: string, endpoint?: string): Promise<boolean> {
    this.state.engineName = `${engineType} (${endpoint || 'http://localhost:9000'})`;
    activityService.logEvent({
      category: 'system',
      icon: 'Cpu',
      title: 'Training Engine Connection Check',
      description: `Checking connection to ${engineType} at ${endpoint || 'localhost'}`,
      status: 'in_progress',
    });

    // Honest check: unless local engine runner responds, keep as not_connected
    try {
      if (endpoint) {
        const res = await fetch(`${endpoint}/health`, { method: 'GET' }).catch(() => null);
        if (res && res.ok) {
          this.state.engineStatus = 'ready';
          this.state.logs.push(`[Connected] Bound to ${engineType} runner at ${endpoint}`);
          this.notify();
          return true;
        }
      }
    } catch {
      // ignore
    }

    this.state.engineStatus = 'not_connected';
    this.state.logs.push(`[Connection Error] Unable to connect to training runner at ${endpoint || 'localhost:9000'}`);
    this.notify();
    return false;
  }

  async startTraining(config: TrainingConfig): Promise<void> {
    this.config = { ...config };

    if (this.state.engineStatus !== 'ready') {
      const msg = 'Training engine not connected. Please launch and connect a local training engine (e.g. Unsloth, Axolotl, or LLaMA-Factory) in Settings.';
      this.state.logs.push(`[Error] ${msg}`);
      this.notify();
      activityService.logEvent({
        category: 'system',
        icon: 'AlertTriangle',
        title: 'Training Failed to Start',
        description: msg,
        status: 'failed',
      });
      throw new Error(msg);
    }

    this.state.engineStatus = 'training';
    this.state.totalEpochs = config.epochs;
    this.state.currentEpoch = 1;
    this.state.progressPercent = 0;
    this.state.activeJobId = `job-${Date.now()}`;
    this.state.logs.push(`[Job Started] Target model: ${config.modelBase}, Epochs: ${config.epochs}`);
    this.notify();
  }

  async stopTraining(): Promise<void> {
    if (this.state.engineStatus === 'training') {
      this.state.engineStatus = 'ready';
      this.state.logs.push('[Job Stopped] Training process was cancelled by user.');
      this.notify();
      activityService.logEvent({
        category: 'system',
        icon: 'StopCircle',
        title: 'Training Job Cancelled',
        description: 'User halted fine-tuning job.',
        status: 'completed',
      });
    }
  }

  subscribe(callback: (state: TrainingState) => void): () => void {
    this.subscribers.push(callback);
    callback({ ...this.state });
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const copy = { ...this.state, logs: [...this.state.logs] };
    for (const sub of this.subscribers) {
      sub(copy);
    }
  }
}

export const trainingService = new TrainingService();
