import type { TaskContext, ToolMetadata, ToolStatus } from '../../types/agent.ts';
import { activityService } from '../activityService.ts';
import { browserService } from '../browserService.ts';
import { desktopBridge } from '../desktopBridge.ts';
import { fileService } from '../fileService.ts';
import { permissionService } from '../permissionService.ts';
import { projectService } from '../projectService.ts';
import { terminalService } from '../terminalService.ts';
import { testingService } from '../testingService.ts';
import { resolvePath, normalizePath, isAbsolutePath } from '../pathUtils.ts';

// In-memory snapshot backup store for File Backup & Restore Tool
const fileBackupStore = new Map<string, { originalContent: string; timestamp: string; taskId: string }>();

class ToolRegistry {
  private tools: Map<string, ToolMetadata> = new Map();
  private subscribers: ((tools: ToolMetadata[]) => void)[] = [];

  constructor() {
    this.registerDefaultTools();
  }

  registerTool(tool: ToolMetadata) {
    this.tools.set(tool.id, tool);
    this.notify();
  }

  getTool(id: string): ToolMetadata | undefined {
    return this.tools.get(id);
  }

  getAllTools(): ToolMetadata[] {
    return Array.from(this.tools.values());
  }

  getAvailableTools(): ToolMetadata[] {
    return Array.from(this.tools.values()).filter((t) => t.status === 'available');
  }

  setToolStatus(id: string, status: ToolStatus, message?: string) {
    const tool = this.tools.get(id);
    if (tool) {
      tool.status = status;
      tool.available = status === 'available';
      if (message) tool.statusMessage = message;
      this.notify();
    }
  }

  private registerDefaultTools() {
    // 1. File Tool (Real)
    this.registerTool({
      id: 'file_tool',
      name: 'File Tool',
      description: 'Read, write, search, create, and list project files with boundary protection.',
      version: '1.0.0',
      category: 'file',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['read', 'write', 'create', 'delete', 'list', 'search'] },
        path: { type: 'string', description: 'Relative or absolute file path' },
        content: { type: 'string', description: 'File content for write or create' },
        query: { type: 'string', description: 'Search term for file search' },
      },
      execute: async (args: any, context: TaskContext) => {
        const safeArgs = args && typeof args === 'object' ? args : {};
        const projectPath = context.project?.path || projectService.getActiveProject()?.path || 'C:\\Users\\saif\\Desktop\\personal-ai';
        const rawInput = (safeArgs.path || safeArgs.filePath || safeArgs.file || safeArgs.targetPath || safeArgs.dir || safeArgs.directory || '').trim();

        // Determine target path using robust resolver
        const targetPath = rawInput ? resolvePath(projectPath, rawInput) : normalizePath(projectPath);
        const normTarget = normalizePath(targetPath);
        const normProject = normalizePath(projectPath);

        // Determine if target is a directory
        const isTargetProjectRoot = normTarget.toLowerCase() === normProject.toLowerCase();
        const hasFileExtension = /\.[a-zA-Z0-9_-]+$/.test(rawInput.split(/[\\/]/).pop() || '');
        const isLikelyDirectory =
          !rawInput ||
          rawInput.endsWith('/') ||
          rawInput.endsWith('\\') ||
          rawInput === '.' ||
          rawInput === 'src' ||
          rawInput === 'electron' ||
          rawInput === 'public' ||
          normTarget.toLowerCase().endsWith('\\src') ||
          normTarget.toLowerCase().endsWith('/src') ||
          isTargetProjectRoot ||
          !hasFileExtension;

        // Determine action: default to 'list' if directory, otherwise 'read'
        let action = (safeArgs.action || '').toLowerCase();
        if (!action) {
          action = isLikelyDirectory ? 'list' : 'read';
        }

        if (action === 'read') {
          try {
            let content = '';
            let actualPath = targetPath;

            try {
              content = await fileService.readFile(targetPath);
            } catch (initialErr: any) {
              // If target is actually a directory (EISDIR), auto-switch to directory listing!
              const isActualDir =
                initialErr.message?.includes('EISDIR') ||
                initialErr.message?.includes('is a directory') ||
                initialErr.message?.includes('illegal operation on a directory');

              if (isActualDir) {
                const entries = await fileService.listDirectory(targetPath);
                return {
                  success: true,
                  data: {
                    directory: targetPath,
                    isDir: true,
                    count: entries.length,
                    entries,
                    note: `Path '${targetPath}' is a directory. Automatically listed contents via File Tool.`,
                  },
                };
              }

              // If file not found directly in root, check subdirectories (e.g. src/, src/services/, electron/)
              const baseName = targetPath.split(/[\\/]/).pop() || targetPath;
              const searchAlternatives = [
                resolvePath(projectPath, `src/${baseName}`),
                resolvePath(projectPath, `src/services/${baseName}`),
                resolvePath(projectPath, `src/components/${baseName}`),
                resolvePath(projectPath, `src/types/${baseName}`),
                resolvePath(projectPath, `electron/${baseName}`),
              ];

              let foundAlt = false;
              for (const alt of searchAlternatives) {
                try {
                  content = await fileService.readFile(alt);
                  actualPath = alt;
                  foundAlt = true;
                  break;
                } catch {}
              }

              if (!foundAlt) {
                // Discover related existing files in the project
                let relatedFiles: string[] = [];
                try {
                  const rootEntries = await fileService.listDirectory(projectPath);
                  const srcEntries = await fileService.listDirectory(resolvePath(projectPath, 'src'));
                  const servicesEntries = await fileService.listDirectory(resolvePath(projectPath, 'src/services'));
                  const allFiles = [
                    ...rootEntries.filter((e) => !e.isDir).map((e) => e.name),
                    ...srcEntries.filter((e) => !e.isDir).map((e) => `src/${e.name}`),
                    ...servicesEntries.filter((e) => !e.isDir).map((e) => `src/services/${e.name}`),
                  ];
                  const queryPart = baseName.replace(/\.[^.]+$/, '').toLowerCase();
                  relatedFiles = allFiles.filter((f) => f.toLowerCase().includes(queryPart));
                  if (queryPart.includes('ollama')) {
                    if (!relatedFiles.includes('src/services/aiService.ts')) relatedFiles.push('src/services/aiService.ts');
                    if (!relatedFiles.includes('src/services/desktopBridge.ts')) relatedFiles.push('src/services/desktopBridge.ts');
                  }
                } catch {}

                return {
                  success: false,
                  error: `File '${targetPath}' was not found in the project. Checked via File Tool.`,
                  data: {
                    path: targetPath,
                    notFound: true,
                    suggestedExistingFiles: relatedFiles.length > 0 ? relatedFiles : undefined,
                  },
                };
              }
            }

            return {
              success: true,
              data: {
                path: actualPath,
                resolvedFrom: actualPath !== targetPath ? targetPath : undefined,
                length: content.length,
                preview: content.length > 2500 ? `${content.substring(0, 2500)}\n... [truncated ${content.length - 2500} chars]` : content,
              },
            };
          } catch (readErr: any) {
            return {
              success: false,
              error: `Failed to read '${targetPath}': ${readErr.message}`,
              data: { path: targetPath, notFound: true },
            };
          }
        }

        if (action === 'write') {
          // Backup file before editing
          try {
            const currentContent = await desktopBridge.readFile(targetPath);
            fileBackupStore.set(targetPath, {
              originalContent: currentContent,
              timestamp: new Date().toISOString(),
              taskId: context.taskId,
            });
          } catch {}

          const ok = await fileService.writeFile(targetPath, args.content || '');
          return { success: ok, data: { path: targetPath, written: ok } };
        }

        if (action === 'create') {
          const ok = await fileService.createFile(targetPath, args.content || '');
          return { success: ok, data: { path: targetPath, created: ok } };
        }

        if (action === 'delete') {
          const ok = await fileService.deleteFile(targetPath);
          return { success: ok, data: { path: targetPath, deleted: ok } };
        }

        if (action === 'list') {
          const dir = targetPath || projectPath;
          try {
            const entries = await fileService.listDirectory(dir);
            return {
              success: true,
              data: {
                directory: dir,
                count: entries.length,
                entries,
              },
            };
          } catch (listErr: any) {
            return {
              success: false,
              error: `Failed to list directory '${dir}': ${listErr.message}`,
              data: { directory: dir },
            };
          }
        }

        if (action === 'search') {
          const dir = targetPath || projectPath;
          try {
            const entries = await fileService.listDirectory(dir);
            const query = (args.query || '').toLowerCase();
            const matched = entries.filter((e) =>
              e.name.toLowerCase().includes(query)
            );
            return { success: true, data: { directory: dir, query: args.query, matches: matched } };
          } catch (searchErr: any) {
            return {
              success: false,
              error: `Failed to search directory '${dir}': ${searchErr.message}`,
            };
          }
        }

        throw new Error(`Unsupported action '${action}' in file_tool`);
      },
    });

    // 2. Terminal Tool (Real)
    this.registerTool({
      id: 'terminal_tool',
      name: 'Terminal Tool',
      description: 'Execute Windows commands in the project directory with live stdout/stderr and stop control.',
      version: '1.0.0',
      category: 'terminal',
      permission: 'runTerminalCommands',
      available: true,
      status: 'available',
      inputSchema: {
        command: { type: 'string', description: 'Command to run (e.g. dir, gradlew build, npm test)' },
        cwd: { type: 'string', description: 'Optional working directory' },
      },
      execute: async (args: any, context: TaskContext) => {
        const cmd = args.command;
        if (!cmd) throw new Error('No command provided to terminal_tool');

        const workingDir = args.cwd || context.project?.path || process.cwd();

        // Permission check
        const allowed = await permissionService.requestPermission('Execute Terminal Command', cmd, 'runTerminalCommands');
        if (!allowed) {
          return { success: false, error: 'User denied permission to execute terminal command.' };
        }

        // Open real popup if in Electron
        try {
          await desktopBridge.openPopup('terminal');
        } catch {}

        return new Promise((resolve) => {
          terminalService.executeCommand(cmd, workingDir);
          let capturedStdout = '';
          let capturedStderr = '';

          const unsubData = desktopBridge.onProcessData((data) => {
            if (data.stream === 'stdout') capturedStdout += data.text;
            if (data.stream === 'stderr') capturedStderr += data.text;
          });

          const unsubState = terminalService.subscribe((state) => {
            if (state.status === 'completed' || state.status === 'failed' || state.status === 'stopped') {
              unsubState();
              unsubData();
              resolve({
                success: state.status === 'completed' && (state.exitCode === 0 || state.exitCode === null),
                data: {
                  command: cmd,
                  cwd: workingDir,
                  exitCode: state.exitCode,
                  stdout: capturedStdout || 'Execution completed',
                  stderr: capturedStderr,
                },
                error: state.status === 'failed' ? `Command exited with code ${state.exitCode}` : undefined,
              });
            }
          });
        });
      },
    });

    // 3. Browser Tool (Real)
    this.registerTool({
      id: 'browser_tool',
      name: 'Browser Tool',
      description: 'Automate web navigation, visit URLs, search queries, and read page content.',
      version: '1.0.0',
      category: 'browser',
      permission: 'internetAccess',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['navigate', 'search', 'read_content', 'back'] },
        url: { type: 'string', description: 'Target URL' },
        query: { type: 'string', description: 'Search keywords' },
      },
      execute: async (args: any) => {
        const allowed = await permissionService.requestPermission(
          'Internet Access',
          args.url || args.query || 'Web Browser',
          'internetAccess'
        );
        if (!allowed) {
          return { success: false, error: 'Internet access permission denied by user.' };
        }

        try {
          await desktopBridge.openPopup('browser');
        } catch {}

        const action = args.action || (args.query ? 'search' : 'navigate');
        if (action === 'search') {
          await browserService.search(args.query || 'developer documentation');
          const content = await browserService.extractPageContent();
          return { success: true, data: { query: args.query, content } };
        }

        if (action === 'navigate') {
          await browserService.navigate(args.url || 'https://duckduckgo.com');
          const content = await browserService.extractPageContent();
          return { success: true, data: { url: args.url, content } };
        }

        if (action === 'read_content') {
          const content = await browserService.extractPageContent();
          return { success: true, data: { content } };
        }

        return { success: true, data: browserService.getState() };
      },
    });

    // 4. Git / GitHub Tool (Real local Git CLI)
    this.registerTool({
      id: 'git_tool',
      name: 'Git & GitHub Tool',
      description: 'Execute Git version control commands (status, diff, log, branch). Remote GitHub sync requires auth.',
      version: '1.0.0',
      category: 'git',
      permission: 'runTerminalCommands',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['status', 'log', 'diff', 'branch', 'push', 'pull'] },
      },
      execute: async (args: any, context: TaskContext) => {
        const action = args.action || 'status';
        if (action === 'push' || action === 'pull') {
          return {
            success: false,
            error: 'GitHub remote authentication: Not connected yet. (Local git status/log/diff commands are active).',
          };
        }

        const projectDir = context.project?.path || process.cwd();
        const gitCmd = `git ${action === 'log' ? 'log -n 5 --oneline' : action}`;

        try {
          const allowed = await permissionService.requestPermission('Git Command', gitCmd, 'runTerminalCommands');
          if (!allowed) return { success: false, error: 'Permission denied for git command.' };

          return new Promise((resolve) => {
            terminalService.executeCommand(gitCmd, projectDir);
            let out = '';
            const unsub = desktopBridge.onProcessData((d) => {
              out += d.text;
            });
            const unsubExit = desktopBridge.onProcessExit((e) => {
              unsub();
              unsubExit();
              resolve({
                success: e.code === 0,
                data: { gitOutput: out || 'Git command finished.' },
                error: e.code !== 0 ? `git ${action} failed with code ${e.code}` : undefined,
              });
            });
          });
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    });

    // 5. Project Tool (Real)
    this.registerTool({
      id: 'project_tool',
      name: 'Project Tool',
      description: 'Inspect active project metadata, file tree, structure, and workspace projects.',
      version: '1.0.0',
      category: 'project',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['get_active', 'list_all', 'inspect_tree'] },
      },
      execute: async (args: any, context: TaskContext) => {
        const action = args.action || 'get_active';
        if (action === 'list_all') {
          return { success: true, data: { projects: projectService.getProjects() } };
        }

        const current = context.project || projectService.getActiveProject();
        if (!current) {
          return { success: false, error: 'No active project selected in workspace.' };
        }

        let tree: any[] = [];
        try {
          tree = await fileService.listDirectory(current.path);
        } catch (err: any) {
          // Path might not exist on disk yet
        }

        return {
          success: true,
          data: {
            project: current,
            rootFiles: tree,
          },
        };
      },
    });

    // 6. Code Analysis Tool (Real)
    this.registerTool({
      id: 'code_analysis_tool',
      name: 'Code Analysis Tool',
      description: 'Analyze project architecture, search symbols, find function definitions, and detect issues.',
      version: '1.0.0',
      category: 'analysis',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {
        query: { type: 'string', description: 'Symbol, class name, or function to find' },
      },
      execute: async (args: any, context: TaskContext) => {
        const project = context.project || projectService.getActiveProject();
        if (!project) return { success: false, error: 'No project to analyze.' };

        const allowed = await permissionService.requestPermission('Code Analysis', project.name, 'readFiles');
        if (!allowed) return { success: false, error: 'Permission denied.' };

        try {
          const files = await fileService.listDirectory(project.path);
          const query = (args.query || '').toLowerCase();
          const matches = files.filter((f) => f.name.toLowerCase().includes(query));

          return {
            success: true,
            data: {
              projectName: project.name,
              languages: project.languages,
              matchingFiles: matches,
              totalScanned: files.length,
            },
          };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    });

    // 7. Testing Tool (Real)
    this.registerTool({
      id: 'testing_tool',
      name: 'Testing Tool',
      description: 'Run project unit tests, integration test suites, and regression checks.',
      version: '1.0.0',
      category: 'test',
      permission: 'runTerminalCommands',
      available: true,
      status: 'available',
      inputSchema: {
        suiteName: { type: 'string', description: 'Optional specific test suite' },
      },
      execute: async (_args: any, context: TaskContext) => {
        const proj = context.project || projectService.getActiveProject();
        if (!proj) return { success: false, error: 'No project selected for testing.' };

        const allowed = await permissionService.requestPermission('Run Tests', proj.name, 'runTerminalCommands');
        if (!allowed) return { success: false, error: 'Permission denied for test execution.' };

        const ok = await testingService.runAllTests(proj);
        return {
          success: ok,
          data: testingService.getState(),
        };
      },
    });

    // 8. Web Search / Research Tool (Real)
    this.registerTool({
      id: 'web_search_tool',
      name: 'Web Search & Research Tool',
      description: 'Perform web research and documentation scraping via local browser engine.',
      version: '1.0.0',
      category: 'browser',
      permission: 'internetAccess',
      available: true,
      status: 'available',
      inputSchema: {
        query: { type: 'string', description: 'Research query or documentation topic' },
      },
      execute: async (args: any) => {
        const query = args.query || 'software development';
        const allowed = await permissionService.requestPermission('Web Research', query, 'internetAccess');
        if (!allowed) return { success: false, error: 'Permission denied.' };

        await browserService.search(query);
        const content = await browserService.extractPageContent();
        return { success: true, data: { query, findings: content } };
      },
    });

    // 9. Build & Run Tool (Real)
    this.registerTool({
      id: 'build_run_tool',
      name: 'Build & Run Tool',
      description: 'Detect project build system and trigger clean build and packaging.',
      version: '1.0.0',
      category: 'build',
      permission: 'runTerminalCommands',
      available: true,
      status: 'available',
      inputSchema: {
        target: { type: 'string', description: 'assembleDebug, build, run, etc.' },
      },
      execute: async (_args: any, context: TaskContext) => {
        const proj = context.project || projectService.getActiveProject();
        if (!proj) return { success: false, error: 'No project selected to build.' };

        const allowed = await permissionService.requestPermission('Build Project', proj.name, 'runTerminalCommands');
        if (!allowed) return { success: false, error: 'Permission denied.' };

        const ok = await testingService.buildProject(proj);
        return { success: ok, data: { built: ok, project: proj.name } };
      },
    });

    // 10. Screenshot / Vision Tool (Honest: Not connected yet)
    this.registerTool({
      id: 'screenshot_vision_tool',
      name: 'Screenshot / Vision Tool',
      description: 'Capture screen and analyze application visual rendering via a vision model.',
      version: '1.0.0',
      category: 'misc',
      permission: 'readFiles',
      available: false,
      status: 'not_connected',
      statusMessage: 'Not connected yet (No vision model connected to local Qwen3:14B).',
      inputSchema: {},
      execute: async () => {
        return {
          success: false,
          error: 'Screenshot / Vision Tool is Not connected yet. (Only local text model Qwen3:14B is active).',
        };
      },
    });

    // 11. Process Manager Tool (Real)
    this.registerTool({
      id: 'process_manager_tool',
      name: 'Process Manager Tool',
      description: 'Monitor running task processes, check status, and terminate lingering processes.',
      version: '1.0.0',
      category: 'system',
      permission: 'runTerminalCommands',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['list', 'kill'] },
        pid: { type: 'number' },
      },
      execute: async (args: any) => {
        if (args.action === 'kill' && args.pid) {
          const allowed = await permissionService.requestPermission('Kill Process', `PID ${args.pid}`, 'runTerminalCommands');
          if (!allowed) return { success: false, error: 'Permission denied.' };
          const ok = await desktopBridge.killProcess(args.pid);
          return { success: ok, data: { pid: args.pid, killed: ok } };
        }

        const terminalState = terminalService.getState();
        return {
          success: true,
          data: {
            activeProcesses: terminalState.pid ? [{ pid: terminalState.pid, command: terminalState.command, status: terminalState.status }] : [],
          },
        };
      },
    });

    // 12. File Backup & Restore Tool (Real)
    this.registerTool({
      id: 'backup_restore_tool',
      name: 'File Backup & Restore Tool',
      description: 'Create file snapshots before modification and rollback changes on task error or user request.',
      version: '1.0.0',
      category: 'file',
      permission: 'editFiles',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['backup', 'restore', 'list'] },
        path: { type: 'string', description: 'Path to file' },
      },
      execute: async (args: any, context: TaskContext) => {
        const action = args.action || 'list';
        const targetPath = args.path || '';

        if (action === 'backup' && targetPath) {
          try {
            const content = await desktopBridge.readFile(targetPath);
            fileBackupStore.set(targetPath, {
              originalContent: content,
              timestamp: new Date().toISOString(),
              taskId: context.taskId,
            });
            return { success: true, data: { path: targetPath, backedUp: true } };
          } catch (err: any) {
            return { success: false, error: `Backup failed: ${err.message}` };
          }
        }

        if (action === 'restore' && targetPath) {
          const record = fileBackupStore.get(targetPath);
          if (!record) return { success: false, error: `No backup found for ${targetPath}` };

          const allowed = await permissionService.requestPermission('Restore File Backup', targetPath, 'editFiles');
          if (!allowed) return { success: false, error: 'Permission denied to restore file.' };

          await desktopBridge.writeFile(targetPath, record.originalContent);
          return { success: true, data: { path: targetPath, restored: true, timestamp: record.timestamp } };
        }

        const backups = Array.from(fileBackupStore.entries()).map(([p, r]) => ({
          path: p,
          timestamp: r.timestamp,
          taskId: r.taskId,
        }));
        return { success: true, data: { backups } };
      },
    });

    // 13. Package / Dependency Tool (Real)
    this.registerTool({
      id: 'dependency_tool',
      name: 'Package & Dependency Tool',
      description: 'Inspect package.json, build.gradle, or requirements.txt and list project dependencies.',
      version: '1.0.0',
      category: 'project',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {
        file: { type: 'string', description: 'package.json, build.gradle, requirements.txt' },
      },
      execute: async (args: any, context: TaskContext) => {
        const proj = context.project || projectService.getActiveProject();
        if (!proj) return { success: false, error: 'No project selected.' };

        const targetFile = args.file || 'package.json';
        const fullPath = resolvePath(proj.path, targetFile);

        try {
          const content = await fileService.readFile(fullPath);
          if (targetFile.endsWith('.json')) {
            const parsed = JSON.parse(content);
            return {
              success: true,
              data: {
                dependencies: parsed.dependencies || {},
                devDependencies: parsed.devDependencies || {},
              },
            };
          }
          return { success: true, data: { rawContent: content } };
        } catch (err: any) {
          return { success: false, error: `Unable to read dependencies from ${targetFile}: ${err.message}` };
        }
      },
    });

    // 14. Environment & System Info Tool (Real)
    this.registerTool({
      id: 'system_info_tool',
      name: 'Environment & System Info Tool',
      description: 'Inspect OS platform, hardware profile, and runtime environment safely.',
      version: '1.0.0',
      category: 'system',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {},
      execute: async () => {
        const sysInfo = await desktopBridge.getSystemInfo();
        return {
          success: true,
          data: {
            ...sysInfo,
            targetPC: 'Windows 10 · AMD Ryzen 5 PRO 4650G · RTX 3060 12GB · RAM 16GB',
            model: 'qwen3:14b (Local Ollama on 127.0.0.1:11434)',
          },
        };
      },
    });

    // 15. Documentation Tool (Real)
    this.registerTool({
      id: 'documentation_tool',
      name: 'Documentation Tool',
      description: 'Inspect or generate README and markdown project documentation.',
      version: '1.0.0',
      category: 'misc',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['read_readme', 'write_docs'] },
        content: { type: 'string', description: 'Content to append or write' },
      },
      execute: async (args: any, context: TaskContext) => {
        const proj = context.project || projectService.getActiveProject();
        if (!proj) return { success: false, error: 'No active project.' };

        const readmePath = resolvePath(proj.path, 'README.md');

        if (args.action === 'write_docs' && args.content) {
          const allowed = await permissionService.requestPermission('Update Documentation', readmePath, 'editFiles');
          if (!allowed) return { success: false, error: 'Permission denied.' };
          await fileService.writeFile(readmePath, args.content);
          return { success: true, data: { path: readmePath, updated: true } };
        }

        try {
          const content = await fileService.readFile(readmePath);
          return { success: true, data: { path: readmePath, content } };
        } catch {
          return { success: true, data: { path: readmePath, content: 'No README.md found in project root.' } };
        }
      },
    });

    // 16. Database Tool (Honest: Not connected yet)
    this.registerTool({
      id: 'database_tool',
      name: 'Database Tool',
      description: 'Inspect database schema, run safe migrations, and perform queries.',
      version: '1.0.0',
      category: 'misc',
      permission: 'readFiles',
      available: false,
      status: 'not_connected',
      statusMessage: 'Not connected yet (No local database engine connected).',
      inputSchema: {},
      execute: async () => {
        return {
          success: false,
          error: 'Database Tool is Not connected yet (No local database service configured).',
        };
      },
    });

    // 17. Agent Task Manager Tool (Real)
    this.registerTool({
      id: 'task_manager_tool',
      name: 'Agent Task Manager',
      description: 'Inspect current task context, step count, and execution plan.',
      version: '1.0.0',
      category: 'misc',
      permission: 'readFiles',
      available: true,
      status: 'available',
      inputSchema: {
        action: { type: 'string', enum: ['get_context', 'check_step_limit'] },
      },
      execute: async (_args: any, context: TaskContext) => {
        return {
          success: true,
          data: {
            taskId: context.taskId,
            currentStep: context.currentStep,
            maxSteps: context.maxSteps,
            planStepsCount: context.plan.length,
            state: context.currentState,
          },
        };
      },
    });
  }

  subscribe(callback: (tools: ToolMetadata[]) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getAllTools());
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const list = this.getAllTools();
    for (const sub of this.subscribers) {
      sub(list);
    }
  }
}

export const toolRegistry = new ToolRegistry();
