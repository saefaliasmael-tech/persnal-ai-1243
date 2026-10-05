import type {
  AIProviderConfig,
  ChatMessage,
  ContextBudgetConfig,
  ContextPruneDiagnostics,
  Conversation,
  OllamaRuntimeOptions,
  ResolvedContextBudget,
  ServiceConnectionStatus,
} from '../types/models.ts';
import type { IAIProvider } from '../types/services.ts';
import { activityService } from './activityService.ts';
import { contextBudgetService } from './context/contextBudgetService.ts';
import { desktopBridge } from './desktopBridge.ts';

class LocalAIProvider implements IAIProvider {
  id = 'local-ollama-provider';
  name = 'Local Ollama Runner (Windows 10)';

  private config: AIProviderConfig = {
    id: 'local-ollama-provider',
    name: 'Local Ollama Runner',
    type: 'ollama',
    endpoint: 'http://127.0.0.1:11434',
    selectedModel: 'qwen3:14b',
    availableModels: ['qwen3:14b'],
    status: 'not_connected',
    contextWindow: 40960,
    think: true,
    runtimeOptions: {},
  };

  private conversations: Conversation[] = [];
  private activeConversationId = 'conv_default';
  private messages: ChatMessage[] = [];
  private subscribers: ((status: ServiceConnectionStatus, config: AIProviderConfig, msgs: ChatMessage[]) => void)[] = [];
  private conversationSubscribers: ((conversations: Conversation[], activeId: string) => void)[] = [];

  constructor() {
    this.loadPersistedConfig();
    // Silent initial connectivity check to Ollama on Windows 10
    setTimeout(() => {
      this.checkSilent();
    }, 150);
  }

  private loadPersistedConfig() {
    try {
      const saved = localStorage.getItem('personal_ai_ai_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = {
          ...this.config,
          ...parsed,
          selectedModel: parsed.selectedModel && parsed.selectedModel !== 'qwen2.5-coder:7b' ? parsed.selectedModel : 'qwen3:14b',
          endpoint: parsed.endpoint || 'http://127.0.0.1:11434',
          status: 'not_connected',
        };
      }

      // Load conversations
      const savedConvs = localStorage.getItem('personal_ai_conversations');
      const savedActiveId = localStorage.getItem('personal_ai_active_conv_id');

      if (savedConvs) {
        this.conversations = JSON.parse(savedConvs);
      }

      // Backward compatibility: import legacy messages if conversations list is empty
      if (this.conversations.length === 0) {
        const savedMsgs = localStorage.getItem('personal_ai_chat_messages');
        const legacyMsgs: ChatMessage[] = savedMsgs ? JSON.parse(savedMsgs) : [];
        const initialConv: Conversation = {
          id: 'conv_default',
          title: legacyMsgs.length > 0 ? 'محادثة سابقة' : 'محادثة جديدة',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: legacyMsgs,
        };
        this.conversations = [initialConv];
      }

      if (savedActiveId && this.conversations.some((c) => c.id === savedActiveId)) {
        this.activeConversationId = savedActiveId;
      } else {
        this.activeConversationId = this.conversations[0]?.id || 'conv_default';
      }

      const active = this.conversations.find((c) => c.id === this.activeConversationId);
      this.messages = active ? [...active.messages] : [];
    } catch {
      // fallback
      if (this.conversations.length === 0) {
        this.conversations = [
          {
            id: 'conv_default',
            title: 'محادثة جديدة',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [],
          },
        ];
      }
      this.activeConversationId = this.conversations[0].id;
      this.messages = [];
    }
  }

  private persist() {
    try {
      localStorage.setItem('personal_ai_ai_config', JSON.stringify(this.config));
      localStorage.setItem('personal_ai_conversations', JSON.stringify(this.conversations));
      localStorage.setItem('personal_ai_active_conv_id', this.activeConversationId);
      localStorage.setItem('personal_ai_chat_messages', JSON.stringify(this.messages));
    } catch {
      // ignore
    }
  }

  getConversations(): Conversation[] {
    return [...this.conversations];
  }

  getActiveConversationId(): string {
    return this.activeConversationId;
  }

  getActiveConversation(): Conversation {
    const found = this.conversations.find((c) => c.id === this.activeConversationId);
    if (found) return found;
    const fallback: Conversation = {
      id: this.activeConversationId || 'conv_' + Date.now(),
      title: 'محادثة جديدة',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    this.conversations.push(fallback);
    return fallback;
  }

  createNewConversation(title = 'محادثة جديدة'): string {
    const newId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newConv: Conversation = {
      id: newId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    this.conversations.unshift(newConv);
    this.activeConversationId = newId;
    this.messages = [];
    this.persist();
    this.notify();
    this.notifyConversations();
    return newId;
  }

  switchConversation(id: string) {
    const conv = this.conversations.find((c) => c.id === id);
    if (conv) {
      this.activeConversationId = id;
      this.messages = [...conv.messages];
      this.persist();
      this.notify();
      this.notifyConversations();
    }
  }

  deleteConversation(id: string) {
    this.conversations = this.conversations.filter((c) => c.id !== id);
    if (this.conversations.length === 0) {
      this.createNewConversation();
    } else {
      if (this.activeConversationId === id) {
        this.activeConversationId = this.conversations[0].id;
        this.messages = [...this.conversations[0].messages];
      }
      this.persist();
      this.notify();
      this.notifyConversations();
    }
  }

  renameConversation(id: string, newTitle: string) {
    const conv = this.conversations.find((c) => c.id === id);
    if (conv && newTitle.trim()) {
      conv.title = newTitle.trim();
      conv.updatedAt = new Date().toISOString();
      this.persist();
      this.notifyConversations();
    }
  }

  clearAllConversations() {
    this.conversations = [
      {
        id: `conv_${Date.now()}`,
        title: 'محادثة جديدة',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      },
    ];
    this.activeConversationId = this.conversations[0].id;
    this.messages = [];
    this.persist();
    this.notify();
    this.notifyConversations();
  }

  subscribeConversations(callback: (conversations: Conversation[], activeId: string) => void): () => void {
    this.conversationSubscribers.push(callback);
    callback([...this.conversations], this.activeConversationId);
    return () => {
      this.conversationSubscribers = this.conversationSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifyConversations() {
    const list = [...this.conversations];
    const active = this.activeConversationId;
    for (const sub of this.conversationSubscribers) {
      sub(list, active);
    }
  }

  getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  getStatus(): ServiceConnectionStatus {
    return this.config.status;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Silent check on startup to auto-detect Ollama and qwen3:14b without intrusive toasts
   */
  private async checkSilent() {
    try {
      const res = await desktopBridge.ollamaCheck(this.config.endpoint);
      if (res.ok) {
        this.config.status = 'connected';
        if (res.models && res.models.length > 0) {
          this.config.availableModels = res.models;
          if (res.models.includes('qwen3:14b')) {
            this.config.selectedModel = 'qwen3:14b';
          } else if (!this.config.availableModels.includes(this.config.selectedModel)) {
            this.config.selectedModel = res.models[0];
          }
        }
        this.persist();
        this.notify();
      }
    } catch {
      // Ollama not started yet, remains not_connected
    }
  }

  async connect(endpoint?: string): Promise<boolean> {
    const targetEndpoint = (endpoint || this.config.endpoint || 'http://127.0.0.1:11434').trim();
    this.config.endpoint = targetEndpoint;
    this.config.status = 'connecting';
    this.notify();

    activityService.logEvent({
      category: 'system',
      icon: 'Cpu',
      title: 'Connecting to Local Ollama',
      description: `Probing local runner at ${targetEndpoint}...`,
      status: 'in_progress',
    });

    try {
      const result = await desktopBridge.ollamaCheck(targetEndpoint);

      if (result.ok) {
        this.config.status = 'connected';
        this.config.availableModels = result.models.length > 0 ? result.models : ['qwen3:14b'];

        // Prioritize qwen3:14b
        if (result.models.includes('qwen3:14b')) {
          this.config.selectedModel = 'qwen3:14b';
        } else if (!this.config.availableModels.includes(this.config.selectedModel)) {
          this.config.selectedModel = this.config.availableModels[0] || 'qwen3:14b';
        }

        activityService.logEvent({
          category: 'system',
          icon: 'CheckCircle',
          title: 'Local Ollama Connected',
          description: `Connected to ${targetEndpoint}. Model: ${this.config.selectedModel} (${this.config.availableModels.length} models detected).`,
          status: 'completed',
        });

        this.persist();
        this.notify();
        return true;
      } else {
        throw new Error(result.error || 'Runner did not respond');
      }
    } catch (e: any) {
      this.config.status = 'not_connected';
      this.notify();
      activityService.logEvent({
        category: 'system',
        icon: 'AlertCircle',
        title: 'Local Ollama Connection Failed',
        description: `Could not reach Ollama at ${targetEndpoint}. ${e.message}`,
        status: 'failed',
      });
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.config.status = 'not_connected';
    this.persist();
    this.notify();
    activityService.logEvent({
      category: 'system',
      icon: 'PowerOff',
      title: 'Local AI Disconnected',
      description: 'Ollama local connection paused by user.',
      status: 'completed',
    });
  }

  async getAvailableModels(): Promise<string[]> {
    return this.config.availableModels;
  }

  setSelectedModel(model: string) {
    this.config.selectedModel = model;
    this.persist();
    this.notify();
  }

  getRuntimeOptions(): OllamaRuntimeOptions {
    return { ...(this.config.runtimeOptions || {}) };
  }

  setRuntimeOptions(options: Partial<OllamaRuntimeOptions>) {
    this.config.runtimeOptions = {
      ...(this.config.runtimeOptions || {}),
      ...options,
    };
    this.persist();
    this.notify();
  }

  getThink(): boolean | undefined {
    return this.config.think;
  }

  setThink(think?: boolean) {
    this.config.think = think;
    this.persist();
    this.notify();
  }

  /**
   * Resolves the active context budget for requests based on provider configuration,
   * runtime options, and output reservations without mutating or trimming messages.
   */
  getContextBudget(customBudgetConfig?: ContextBudgetConfig): ResolvedContextBudget {
    return contextBudgetService.resolveBudget(
      this.config,
      this.config.runtimeOptions,
      customBudgetConfig
    );
  }

  setContextWindow(contextWindow: number) {
    this.config.contextWindow = contextWindow;
    this.persist();
    this.notify();
  }

  async addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toTimeString().split(' ')[0],
    };
    this.messages.push(newMsg);

    // Synchronize into active conversation
    const activeConv = this.getActiveConversation();
    activeConv.messages.push(newMsg);
    activeConv.updatedAt = new Date().toISOString();

    // Auto-generate title if this is the first user message and title is default
    if (
      msg.role === 'user' &&
      (activeConv.title === 'محادثة جديدة' || activeConv.title === 'New Chat')
    ) {
      const cleanPrompt = msg.content.trim().replace(/^[\r\n\t#\-_* ]+/, '');
      if (cleanPrompt) {
        activeConv.title = cleanPrompt.length > 32 ? cleanPrompt.substring(0, 32) + '...' : cleanPrompt;
      }
    }

    this.persist();
    this.notify();
    this.notifyConversations();
    return newMsg;
  }

  clearMessages() {
    this.messages = [];
    const activeConv = this.getActiveConversation();
    activeConv.messages = [];
    activeConv.updatedAt = new Date().toISOString();
    this.persist();
    this.notify();
    this.notifyConversations();
  }

  private getGroundedMessages(
    messages: ChatMessage[],
    options?: OllamaRuntimeOptions
  ): { role: string; content: string }[] {
    const systemPrompt = `You are Personal AI, a local autonomous AI assistant running on a Windows 10 PC.
Workspace project: Personal AI at C:\\Users\\saif\\Desktop\\personal-ai.
Architecture: Windows 10 Desktop Application (Electron + React + TypeScript + Vite + Node.js + Ollama Qwen3:14B).
CRITICAL RULES:
- Never assume the project is Android or any mobile platform.
- Never guess file contents or say files do not exist without verification.
- Always provide helpful, precise, and verified technical assistance.`;

    const raw: { role: string; content: string }[] = [];
    if (!messages.some((m) => m.role === 'system')) {
      raw.push({ role: 'system', content: systemPrompt });
    }
    for (const m of messages) {
      raw.push({ role: m.role, content: m.content });
    }

    // Resolve context budget for this request
    const budget = contextBudgetService.resolveBudget(this.config, options || this.config.runtimeOptions);

    // Apply safe request-time sliding window pruning (leaves persistent localStorage history untouched)
    const prunedResult = contextBudgetService.pruneChatHistory(raw, budget);
    return prunedResult.messages;
  }

  /**
   * Diagnostic inspector for current message context and pruning status
   */
  getContextDiagnostics(
    messages: ChatMessage[],
    options?: OllamaRuntimeOptions
  ): ContextPruneDiagnostics {
    const systemPrompt = `You are Personal AI, a local autonomous AI assistant running on a Windows 10 PC.
Workspace project: Personal AI at C:\\Users\\saif\\Desktop\\personal-ai.
Architecture: Windows 10 Desktop Application (Electron + React + TypeScript + Vite + Node.js + Ollama Qwen3:14B).
CRITICAL RULES:
- Never assume the project is Android or any mobile platform.
- Never guess file contents or say files do not exist without verification.
- Always provide helpful, precise, and verified technical assistance.`;

    const raw: { role: string; content: string }[] = [];
    if (!messages.some((m) => m.role === 'system')) {
      raw.push({ role: 'system', content: systemPrompt });
    }
    for (const m of messages) {
      raw.push({ role: m.role, content: m.content });
    }

    const budget = contextBudgetService.resolveBudget(this.config, options || this.config.runtimeOptions);
    return contextBudgetService.pruneChatHistory(raw, budget).diagnostics;
  }

  async chat(
    messages: ChatMessage[],
    model?: string,
    options?: OllamaRuntimeOptions,
    think?: boolean
  ): Promise<string> {
    if (this.config.status !== 'connected') {
      throw new Error('Ollama is not connected at http://127.0.0.1:11434. Please start Ollama on your Windows 10 PC.');
    }

    const targetModel = model || this.config.selectedModel || 'qwen3:14b';
    const targetOptions = options || this.config.runtimeOptions;
    const targetThink = typeof think === 'boolean' ? think : this.config.think;

    const result = await desktopBridge.ollamaChat({
      endpoint: this.config.endpoint,
      model: targetModel,
      messages: this.getGroundedMessages(messages, targetOptions),
      options: targetOptions,
      think: targetThink,
    });

    return result.content;
  }

  async chatDetailed(
    messages: ChatMessage[],
    model?: string,
    options?: OllamaRuntimeOptions,
    think?: boolean
  ): Promise<{ content: string; thinking?: string }> {
    if (this.config.status !== 'connected') {
      throw new Error('Ollama is not connected at http://127.0.0.1:11434. Please start Ollama on your Windows 10 PC.');
    }

    const targetModel = model || this.config.selectedModel || 'qwen3:14b';
    const targetOptions = options || this.config.runtimeOptions;
    const targetThink = typeof think === 'boolean' ? think : this.config.think;

    return desktopBridge.ollamaChat({
      endpoint: this.config.endpoint,
      model: targetModel,
      messages: this.getGroundedMessages(messages, targetOptions),
      options: targetOptions,
      think: targetThink,
    });
  }

  private currentStreamAbort: (() => void) | null = null;

  abortStream(): boolean {
    if (this.currentStreamAbort) {
      try {
        this.currentStreamAbort();
      } catch (e) {
        console.error('Failed to abort stream:', e);
      }
      this.currentStreamAbort = null;
      return true;
    }
    return false;
  }

  isStreaming(): boolean {
    return this.currentStreamAbort !== null;
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    model?: string,
    onThinking?: (thinkingChunk: string) => void,
    options?: OllamaRuntimeOptions,
    think?: boolean
  ): Promise<string> {
    if (this.config.status !== 'connected') {
      throw new Error('Ollama is not connected at http://127.0.0.1:11434. Please start Ollama on your Windows 10 PC.');
    }

    const targetModel = model || this.config.selectedModel || 'qwen3:14b';
    const targetOptions = options || this.config.runtimeOptions;
    const targetThink = typeof think === 'boolean' ? think : this.config.think;
    let fullText = '';
    let fullThinking = '';

    return new Promise(async (resolve, reject) => {
      let isSettled = false;

      const finish = (finalText: string) => {
        if (isSettled) return;
        isSettled = true;
        this.currentStreamAbort = null;
        resolve(finalText);
      };

      const fail = (err: Error) => {
        if (isSettled) return;
        isSettled = true;
        this.currentStreamAbort = null;
        reject(err);
      };

      try {
        const cancelFn = await desktopBridge.ollamaStreamChat(
          {
            endpoint: this.config.endpoint,
            model: targetModel,
            messages: this.getGroundedMessages(messages, targetOptions),
            options: targetOptions,
            think: targetThink,
          },
          (chunk) => {
            if (isSettled) return;
            fullText += chunk;
            onChunk(chunk);
          },
          () => {
            finish(fullText);
          },
          (errStr) => {
            fail(new Error(errStr));
          },
          (thinkingChunk) => {
            if (isSettled) return;
            fullThinking += thinkingChunk;
            if (onThinking) onThinking(thinkingChunk);
          }
        );

        this.currentStreamAbort = () => {
          if (cancelFn) {
            try {
              cancelFn();
            } catch {}
          }
          finish(fullText);
        };
      } catch (err: any) {
        fail(err);
      }
    });
  }

  subscribe(callback: (status: ServiceConnectionStatus, config: AIProviderConfig, msgs: ChatMessage[]) => void): () => void {
    this.subscribers.push(callback);
    callback(this.config.status, { ...this.config }, [...this.messages]);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const status = this.config.status;
    const cfg = { ...this.config };
    const msgs = [...this.messages];
    for (const sub of this.subscribers) {
      sub(status, cfg, msgs);
    }
  }
}

export const aiService = new LocalAIProvider();
