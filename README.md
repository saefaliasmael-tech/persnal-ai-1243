# Personal AI — Windows 10 Desktop Application
### Phase 1: Foundation Architecture

Personal AI is a dedicated Windows 10 desktop application designed for non-programmers who need a powerful, autonomous local AI coding assistant without touching terminals, CMD, PowerShell, or command-line scripts manually.

---

## 1. Project Architecture

The architecture enforces strict separation of concerns across four primary tiers:

```
┌────────────────────────────────────────────────────────┐
│               Personal AI UI (React + TS)              │
│  [Home, Chat, Agent, Projects, Knowledge, Popups]      │
└───────────────────────────┬────────────────────────────┘
                            │ (Typed IPC / ContextBridge)
┌───────────────────────────▼────────────────────────────┐
│          Desktop Bridge & Service Adapters             │
│  [AIProvider, AgentProvider, TerminalService, ...]     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│            Electron Main Process (Node.js)             │
│  [BrowserWindow, Child Popups, child_process.spawn]   │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Windows 10 Operating System                │
│  [Local GPU Inference, File System, Process Execution] │
└────────────────────────────────────────────────────────┘
```

1. **User Interface (React 19 + TypeScript)**:
   - Modern, dark-first Windows 10 desktop styling.
   - 11 core functional navigation sections.
   - Real-time activity log streams and permission prompts.

2. **Universal Desktop Bridge (`src/services/desktopBridge.ts`)**:
   - Agnostic IPC layer: transparently binds to `window.electronAPI` when executing within the native Electron desktop shell.
   - Provides full-fidelity local simulation with authentic stdout/stderr logging when running in development/web mode.

3. **Service & Adapter Architecture (`src/services/`)**:
   - Provider-independent interfaces (`IAIProvider`, `IAgentProvider`, `ITerminalService`, `IBrowserService`, `IPermissionService`, `IKnowledgeService`, `ITrainingService`, `ITestingService`).
   - Clean boundaries allow hot-swapping future local backends (e.g., Ollama, OpenHands, Qdrant, Unsloth) without altering user interface code.

4. **Security & Permission Subsystem**:
   - Isolated renderer (`contextIsolation: true`, `sandbox: false`, `nodeIntegration: false`).
   - All critical actions (terminal command execution, file modifications, network lookups, file deletions) pass through the Permission Policy Engine with explicit interactive user confirmation dialogs.

---

## 2. Directory & File Structure

```
├── electron/
│   ├── main.ts             # Electron main process (lifecycle, IPC handlers, child process manager)
│   ├── preload.ts          # Safe ContextBridge exposing typed ElectronAPI
│   └── windowManager.ts    # Child popup window manager (Terminal popup & Browser popup)
├── src/
│   ├── types/
│   │   ├── ipc.ts          # Typed IPC channel definitions and ElectronAPI interface
│   │   ├── models.ts       # Domain models (Project, Task, ActivityEvent, SystemPermissions)
│   │   └── services.ts     # Interface definitions for all application services
│   ├── services/
│   │   ├── desktopBridge.ts    # Dual-mode desktop bridge
│   │   ├── aiService.ts        # AIProvider implementation (Ollama / Local LLM)
│   │   ├── agentService.ts     # Autonomous agent state machine & activity emitter
│   │   ├── terminalService.ts  # Process runner with live stdout/stderr piping
│   │   ├── browserService.ts   # Web automation, navigation, and DOM reader
│   │   ├── fileService.ts      # Permission-checked file read, edit, delete
│   │   ├── permissionService.ts# Master Safe Mode and granular policy enforcement
│   │   ├── projectService.ts   # Project metadata management and path binding
│   │   ├── knowledgeService.ts # Vector index management (Code, Docs, PDFs for RAG)
│   │   ├── trainingService.ts  # LoRA fine-tuning configuration & engine binder
│   │   ├── testingService.ts   # Project build & test runner
│   │   └── activityService.ts  # Global audit log bus and event dispatcher
│   ├── components/
│   │   ├── titlebar/
│   │   │   └── WindowsTitlebar.tsx # Windows 10 native titlebar controls
│   │   ├── navigation/
│   │   │   └── Sidebar.tsx         # 11 navigation categories with live status dots
│   │   ├── windows/
│   │   │   ├── WindowManager.tsx   # Windows 10 child popup window system
│   │   │   ├── TerminalWindow.tsx  # Dedicated process terminal popup with live logs
│   │   │   └── BrowserWindow.tsx   # Dedicated browser automation popup
│   │   ├── dialogs/
│   │   │   ├── PermissionDialog.tsx# Interactive approval dialog for sensitive actions
│   │   │   ├── NewProjectModal.tsx # Project registration dialog
│   │   │   ├── ConnectAIModal.tsx  # Local Ollama / LM Studio connection wizard
│   │   │   └── AddKnowledgeModal.tsx# File / Folder knowledge indexing dialog
│   │   └── views/
│   │       ├── HomeView.tsx        # System status dashboard
│   │       ├── ChatView.tsx        # Local AI chat interface
│   │       ├── AgentView.tsx       # Live autonomous agent console with activity stream
│   │       ├── ProjectsView.tsx    # Project Manager
│   │       ├── KnowledgeView.tsx   # Knowledge base (RAG) index
│   │       ├── TrainingView.tsx    # Model fine-tuning interface
│   │       ├── TestingView.tsx     # Automated build & test execution
│   │       ├── BrowserView.tsx     # Browser automation console
│   │       ├── TerminalView.tsx    # Process terminal console
│   │       ├── ActivityView.tsx    # Activity center and audit log
│   │       └── SettingsView.tsx    # 12 granular settings categories
│   ├── App.tsx             # Root desktop application frame
│   ├── index.css           # Windows 10 styling and typography rules
│   └── main.tsx            # React application entry point
├── package.json            # Scripts for Vite dev, Electron build, and Windows installer
└── tsconfig.json           # Strict TypeScript configuration
```

---

## 3. Dedicated Child Popup Windows

A core requirement of Personal AI is that tool execution is never hidden behind fake simulated text inside a chat box:

1. **Terminal Popup Window**:
   - Spawns as a dedicated Electron child window (`WindowManager.openPopup('terminal')`).
   - Streams live stdout and stderr from real system processes.
   - Shows PID, execution start/end timestamps, exit code, and live auto-scrolling log output.
   - Includes manual stop button (`SIGTERM`), build shortcuts (`gradlew assembleDebug`), and clear buffer controls.

2. **Browser Automation Popup Window**:
   - Spawns as a dedicated Electron child window (`WindowManager.openPopup('browser')`).
   - Displays real URL navigation, search queries (e.g. "Kotlin Compose navigation"), and status.
   - Inspects DOM contents and extracts text summaries for the agent to consume.

---

## 4. Permission System & Safe Mode

Personal AI includes a strict security policy engine (`src/services/permissionService.ts`):

| Action Type | Default Policy | Behavior |
| :--- | :--- | :--- |
| **Read Files** | `ALLOW` | Reads project structure and source code. |
| **Edit Files** | `ALLOW` | Creates and updates files; logs each action to Activity. |
| **Run Terminal Commands** | `ASK` | Displays real confirmation dialog before spawning process. |
| **Internet Access** | `ASK` | Displays confirmation dialog before loading external URLs. |
| **Install Software** | `ASK` | Blocks background package installation without user consent. |
| **Delete Files** | `ASK` | Requires explicit user approval before deleting any file. |
| **Delete Project Root** | `DENY` | Hard-locked to protect user codebases on disk. |
| **Safe Mode** | `ACTIVE` | Forces user confirmation for any sensitive system operation. |

---

## 5. Development & Packaging Setup

### Prerequisites
- Node.js 20+ (LTS)
- Windows 10 (Build 19045 or later) or Windows 11 PC

### Development Mode (Web Preview & Live UI)
```bash
# Install dependencies
npm install

# Start Vite dev server on port 3000
npm run dev
```

### Electron Desktop Development
```bash
# Build Vite frontend and launch Electron shell
npm run electron:dev
```

### Packaging Windows 10 Installer (.exe / NSIS)
```bash
# Builds frontend, compiles main process, and generates Windows installer
npm run package:win
```
The output installer will be located in the `/dist` directory as a standalone Windows setup executable (`Personal-AI-Setup-1.0.0.exe`).

---

## 6. Windows Batch Files Policy (CRITICAL - DO NOT OVERWRITE)

The root folder contains dedicated Windows automation batch scripts:
- `build-and-run.bat`: Dedicated solely to installing dependencies, running `npm run build:all`, packaging the Windows application via `npm run package:win`, verifying `release\Personal AI Portable.exe`, and launching it. It must NEVER include Dev Server commands (`npm run dev`, `vite`, `nginx`, `compile_applet`) and must never call itself or `run-personal-ai.bat` in a loop.
- `run-personal-ai.bat`: Direct launcher for the compiled Windows binary.
- `UPDATE_PERSONAL_AI.bat`: Dedicated script for updating, compiling, and packaging the Windows executable.

**RULE**: DO NOT DELETE OR REPLACE THESE FILES DURING FUTURE PROJECT UPDATES.

---

## 7. Future Integrations (Phase 2 & Beyond)

- **Local Model Engine**: Native binding to Ollama (`localhost:11434`) or vLLM running on local GPU.
- **Agent Engine Adapter**: Direct IPC connector for OpenHands local container or LangGraph agent runtime.
- **Vector Database**: Embedded Qdrant or Chroma instance for persistent semantic search across terabyte-scale codebases.
- **Local Fine-Tuning**: Integration with Unsloth / Axolotl Python daemon for private model training.
