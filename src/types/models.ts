export type NavSection =
  | 'home'
  | 'chat'
  | 'agent'
  | 'projects'
  | 'knowledge'
  | 'training'
  | 'testing'
  | 'browser'
  | 'terminal'
  | 'activity'
  | 'settings';

export type ServiceConnectionStatus = 'ready' | 'connected' | 'not_connected' | 'connecting' | 'error';

export interface ActivityEvent {
  id: string;
  timestamp: string; // HH:mm:ss
  date: string;
  category: 'agent' | 'terminal' | 'browser' | 'files' | 'build' | 'tests' | 'errors' | 'system';
  icon: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting_permission';
  details?: string;
  command?: string;
  path?: string;
  durationMs?: number;
}

export type ProjectValidationStatus =
  | 'valid'
  | 'invalid_path'
  | 'not_directory'
  | 'not_accessible'
  | 'unknown';

export interface ProjectDiscoveryInfo {
  rootPath: string;
  name: string;
  projectType: string;
  framework?: string;
  languages: string[];
  markerFiles: string[];
  fileCount: number;
  validationStatus: ProjectValidationStatus;
  errorMessage?: string;
  lastDiscovered: string;
}

export interface WorkspaceContext {
  project: ProjectMetadata | null;
  rootPath: string | null;
  validationStatus: ProjectValidationStatus;
  discovery: ProjectDiscoveryInfo | null;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  path: string;
  rootPath?: string;
  description: string;
  gitBranch?: string;
  fileCount: number;
  languages: string[];
  projectType?: string;
  framework?: string;
  markerFiles?: string[];
  validationStatus?: ProjectValidationStatus;
  lastDiscovered?: string;
  lastModified: string;
  isActive: boolean;
  notes?: string;
}

export interface TerminalOutputLine {
  id: string;
  type: 'stdout' | 'stderr' | 'system' | 'command';
  text: string;
  timestamp: string;
}

export interface TerminalProcessState {
  pid: number | null;
  command: string;
  cwd: string;
  startTime: string | null;
  endTime: string | null;
  exitCode: number | null;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stopped';
  lines: TerminalOutputLine[];
}

export interface BrowserAutomationState {
  url: string;
  displayUrl: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  lastSearchQuery?: string;
  pageContentSummary?: string;
  history: string[];
  historyIndex: number;
}

export type PermissionLevel = 'allow' | 'ask' | 'deny';

export interface SystemPermissions {
  readFiles: PermissionLevel;
  editFiles: PermissionLevel;
  runTerminalCommands: PermissionLevel;
  internetAccess: PermissionLevel;
  installSoftware: PermissionLevel;
  deleteFiles: PermissionLevel;
  deleteProject: PermissionLevel;
  safeMode: boolean;
}

export interface PermissionRequest {
  id: string;
  action: string;
  resource: string;
  type: keyof SystemPermissions;
  details?: string;
  timestamp: string;
  resolve: (allowed: boolean) => void;
}

export interface KnowledgeItem {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  category: 'code' | 'text' | 'docs' | 'pdf' | 'other';
  sizeBytes: number;
  status: 'processing' | 'indexing' | 'completed' | 'failed';
  itemCount: number;
  addedAt: string;
  errorMessage?: string;
}

export interface TrainingConfig {
  datasetPath: string;
  modelBase: string;
  epochs: number;
  batchSize: number;
  learningRate: number;
  outputLocation: string;
  loraRank: number;
  gradientAccumulationSteps: number;
}

export interface TrainingState {
  engineStatus: 'not_connected' | 'ready' | 'training' | 'completed' | 'error';
  engineName: string;
  currentEpoch: number;
  totalEpochs: number;
  progressPercent: number;
  loss?: number;
  logs: string[];
  activeJobId: string | null;
}

export interface TestSuiteResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'pending';
  durationMs: number;
  message?: string;
  output?: string;
}

export interface TestingState {
  status: 'idle' | 'building' | 'running' | 'completed' | 'failed';
  passedCount: number;
  failedCount: number;
  totalCount: number;
  suites: TestSuiteResult[];
  rawLogs: string[];
}

export interface ChatAttachment {
  name: string;
  path: string;
  size?: number;
  type?: string;
  content?: string;
}

export interface OllamaRuntimeOptions {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  num_ctx?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
  mirostat?: number;
  keep_alive?: string | number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;
  timestamp: string;
  codeBlocks?: { language: string; code: string }[];
  provider?: string;
  model?: string;
  attachments?: ChatAttachment[];
  agentSummary?: string;
}

export interface ContextBudgetConfig {
  reservedOutputTokens?: number;
  safetyMarginTokens?: number;
  systemReserveTokens?: number;
}

export interface ResolvedContextBudget {
  contextLimit: number;
  reservedOutputTokens: number;
  safetyMarginTokens: number;
  systemReserveTokens: number;
  maxInputTokens: number;
  availableHistoryTokens: number;
  resolutionSource: 'explicit_num_ctx' | 'provider_context_window' | 'model_default_40k' | 'fallback_default';
}

export interface ContextPruneDiagnostics {
  originalMessageCount: number;
  prunedMessageCount: number;
  systemMessageCount: number;
  conversationTurnCount: number;
  estimatedInputTokens: number;
  maxInputTokens: number;
  availableHistoryTokens: number;
  isPruned: boolean;
  userMessageExceedsBudget: boolean;
}

export interface PrunedContextResult {
  messages: { role: string; content: string }[];
  diagnostics: ContextPruneDiagnostics;
}

export interface ITokenEstimator {
  estimateTokens(text: string): number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: 'ollama' | 'lmstudio' | 'local_openai_compatible' | 'custom';
  endpoint: string;
  selectedModel: string;
  availableModels: string[];
  status: ServiceConnectionStatus;
  contextWindow: number;
  think?: boolean;
  runtimeOptions?: OllamaRuntimeOptions;
}

export interface AgentConfig {
  id: string;
  provider: 'local_agent' | 'openhands' | 'custom_agent';
  endpoint: string;
  status: ServiceConnectionStatus;
  maxIterations: number;
  autoApproveSafe: boolean;
}

export interface WindowState {
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}
