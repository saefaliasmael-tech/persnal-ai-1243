import {
  ActivityEvent,
  AgentConfig,
  AIProviderConfig,
  BrowserAutomationState,
  ChatMessage,
  ContextBudgetConfig,
  KnowledgeItem,
  PermissionLevel,
  PermissionRequest,
  ProjectDiscoveryInfo,
  ProjectMetadata,
  ProjectValidationStatus,
  ResolvedContextBudget,
  SystemPermissions,
  TerminalProcessState,
  TestingState,
  TrainingConfig,
  TrainingState,
  WorkspaceContext,
} from './models.ts';

/**
 * AI Provider interface for local AI runtimes (Ollama, LM Studio, etc.)
 */
export interface IAIProvider {
  id: string;
  name: string;
  getConfig(): AIProviderConfig;
  connect(endpoint?: string): Promise<boolean>;
  disconnect(): Promise<void>;
  getStatus(): 'ready' | 'connected' | 'not_connected' | 'connecting' | 'error';
  getAvailableModels(): Promise<string[]>;
  chat(messages: ChatMessage[], model?: string): Promise<string>;
  streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    model?: string
  ): Promise<string>;
  abortStream?(): boolean;
  isStreaming?(): boolean;
  getContextBudget?(customBudgetConfig?: ContextBudgetConfig): ResolvedContextBudget;
}

/**
 * Agent Provider interface for local coding agents (OpenHands, custom agent engine, etc.)
 */
export interface IAgentProvider {
  id: string;
  name: string;
  getConfig(): AgentConfig;
  connect(endpoint?: string): Promise<boolean>;
  getStatus(): 'ready' | 'connected' | 'not_connected' | 'connecting' | 'error';
  startTask(task: string, project: ProjectMetadata | null): Promise<void>;
  pauseTask(): Promise<void>;
  stopTask(): Promise<void>;
  isBusy(): boolean;
  onActivity(callback: (event: ActivityEvent) => void): () => void;
}

/**
 * Terminal service executing real processes through Electron backend
 */
export interface ITerminalService {
  getState(): TerminalProcessState;
  executeCommand(command: string, cwd?: string): Promise<number>;
  writeInput(input: string): Promise<boolean>;
  sendInterrupt(): Promise<boolean>;
  stopCommand(): Promise<boolean>;
  clearOutput(): void;
  subscribe(callback: (state: TerminalProcessState) => void): () => void;
}

/**
 * Browser automation service for web reading, search, and navigation
 */
export interface IBrowserService {
  getState(): BrowserAutomationState;
  navigate(url: string): Promise<void>;
  search(query: string): Promise<void>;
  goBack(): Promise<void>;
  goForward(): Promise<void>;
  reload(): Promise<void>;
  extractPageContent(): Promise<string>;
  subscribe(callback: (state: BrowserAutomationState) => void): () => void;
}

/**
 * Project manager service storing project metadata and paths
 */
export interface IProjectService {
  getProjects(): ProjectMetadata[];
  getActiveProject(): ProjectMetadata | null;
  setActiveProject(id: string): void;
  addProject(project: Omit<ProjectMetadata, 'id' | 'lastModified' | 'isActive'>): Promise<ProjectMetadata>;
  updateProject(id: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata | null>;
  removeProject(id: string): Promise<boolean>;
  validateProjectRoot(rawPath: string): Promise<{ valid: boolean; status: ProjectValidationStatus; rootPath: string; error?: string }>;
  discoverProject(rawPath: string): Promise<ProjectDiscoveryInfo>;
  addProjectByPath(rawPath: string): Promise<ProjectMetadata>;
  getWorkspaceContext(): WorkspaceContext;
  subscribe(callback: (projects: ProjectMetadata[], active: ProjectMetadata | null) => void): () => void;
}

/**
 * Secure file access service
 */
export interface IFileService {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<boolean>;
  createFile(path: string, initialContent?: string): Promise<boolean>;
  deleteFile(path: string): Promise<boolean>;
  renameFile(oldPath: string, newPath: string): Promise<boolean>;
  listDirectory(dirPath: string): Promise<{ name: string; isDir: boolean; size: number }[]>;
}

/**
 * Knowledge & RAG management service
 */
export interface IKnowledgeService {
  getItems(): KnowledgeItem[];
  addItem(item: Omit<KnowledgeItem, 'id' | 'addedAt' | 'status'>): Promise<KnowledgeItem>;
  removeItem(id: string): Promise<boolean>;
  reindexItem(id: string): Promise<void>;
  getStorageStats(): { totalItems: number; totalBytes: number; indexedCount: number };
  subscribe(callback: (items: KnowledgeItem[]) => void): () => void;
}

/**
 * Local training service interface
 */
export interface ITrainingService {
  getState(): TrainingState;
  connectEngine(engineType: string, endpoint?: string): Promise<boolean>;
  startTraining(config: TrainingConfig): Promise<void>;
  stopTraining(): Promise<void>;
  subscribe(callback: (state: TrainingState) => void): () => void;
}

/**
 * Testing and build service
 */
export interface ITestingService {
  getState(): TestingState;
  buildProject(project: ProjectMetadata): Promise<boolean>;
  runAllTests(project: ProjectMetadata): Promise<boolean>;
  runTest(project: ProjectMetadata, testName: string): Promise<boolean>;
  stop(): Promise<void>;
  subscribe(callback: (state: TestingState) => void): () => void;
}

/**
 * System permission policy enforcement service
 */
export interface IPermissionService {
  getPermissions(): SystemPermissions;
  setPermission(type: keyof SystemPermissions, level: PermissionLevel): void;
  setSafeMode(enabled: boolean): void;
  requestPermission(action: string, resource: string, type: keyof SystemPermissions): Promise<boolean>;
  getActiveRequests(): PermissionRequest[];
  subscribe(callback: (perms: SystemPermissions, activeRequests: PermissionRequest[]) => void): () => void;
}

/**
 * Activity center logger and event stream service
 */
export interface IActivityService {
  getEvents(filterCategory?: string): ActivityEvent[];
  logEvent(event: Omit<ActivityEvent, 'id' | 'timestamp' | 'date'>): ActivityEvent;
  updateEvent(id: string, updates: Partial<ActivityEvent>): void;
  clearEvents(): void;
  subscribe(callback: (events: ActivityEvent[]) => void): () => void;
}
