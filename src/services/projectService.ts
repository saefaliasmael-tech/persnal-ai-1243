import type { ProjectDiscoveryInfo, ProjectMetadata, ProjectValidationStatus, WorkspaceContext } from '../types/models.ts';
import type { IProjectService } from '../types/services.ts';
import { activityService } from './activityService.ts';
import { desktopBridge } from './desktopBridge.ts';
import { normalizePath, resolvePath } from './pathUtils.ts';

const STORAGE_KEY = 'personal_ai_projects';
const ACTIVE_KEY = 'personal_ai_active_project';

const DEFAULT_PROJECTS: ProjectMetadata[] = [
  {
    id: 'proj-personal-ai',
    name: 'Personal AI',
    path: 'C:\\Users\\saif\\Desktop\\personal-ai',
    rootPath: 'C:\\Users\\saif\\Desktop\\personal-ai',
    description: 'Windows 10 Desktop Local AI Assistant (Electron + React + TypeScript + Node.js + Ollama Qwen3:14B).',
    gitBranch: 'main',
    fileCount: 45,
    languages: ['TypeScript', 'React', 'Electron', 'Node.js'],
    projectType: 'Node.js Desktop Application',
    framework: 'Electron + React + Vite',
    markerFiles: ['package.json', 'tsconfig.json', 'vite.config.ts', 'electron', 'src'],
    validationStatus: 'valid',
    lastDiscovered: new Date().toISOString(),
    lastModified: new Date().toISOString().split('T')[0],
    isActive: true,
    notes: 'Personal AI primary desktop workspace project.',
  },
];

class ProjectService implements IProjectService {
  private projects: ProjectMetadata[] = [];
  private activeProject: ProjectMetadata | null = null;
  private subscribers: ((projects: ProjectMetadata[], active: ProjectMetadata | null) => void)[] = [];

  constructor() {
    this.loadData();
    // Auto-detect real runtime working directory
    setTimeout(() => {
      this.detectRuntimeProject();
    }, 100);
  }

  private async detectRuntimeProject() {
    try {
      const sysInfo = await desktopBridge.getSystemInfo();
      if (sysInfo.workingDirectory) {
        this.resolveOrSetProjectByPath(sysInfo.workingDirectory);
      }
    } catch {}
  }

  private loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const filtered = Array.isArray(parsed)
          ? parsed.filter((p: any) => p.name !== 'Android Mobile Client' && !String(p.path).includes('AndroidApp'))
          : [];
        if (filtered.length === 0) {
          this.projects = [...DEFAULT_PROJECTS];
          this.saveData();
        } else {
          // Normalize legacy entries to ensure rootPath is populated
          this.projects = filtered.map((p: any) => ({
            ...p,
            rootPath: p.rootPath || normalizePath(p.path),
            path: normalizePath(p.path),
            validationStatus: p.validationStatus || 'valid',
          }));
        }
      } else {
        this.projects = [...DEFAULT_PROJECTS];
        this.saveData();
      }

      const activeId = localStorage.getItem(ACTIVE_KEY);
      if (activeId && activeId !== 'proj-android') {
        this.activeProject = this.projects.find((p) => p.id === activeId) || this.projects[0] || DEFAULT_PROJECTS[0];
      } else {
        this.activeProject = this.projects.find((p) => p.isActive) || this.projects[0] || DEFAULT_PROJECTS[0];
      }
    } catch {
      this.projects = [...DEFAULT_PROJECTS];
      this.activeProject = this.projects[0];
    }
  }

  async validateProjectRoot(
    rawPath: string
  ): Promise<{ valid: boolean; status: ProjectValidationStatus; rootPath: string; error?: string }> {
    const clean = normalizePath(rawPath);
    if (!clean) {
      return { valid: false, status: 'invalid_path', rootPath: '', error: 'Path cannot be empty.' };
    }

    try {
      const entries = await desktopBridge.listFiles(clean);
      if (Array.isArray(entries)) {
        return { valid: true, status: 'valid', rootPath: clean };
      }
      return { valid: false, status: 'unknown', rootPath: clean, error: 'Could not inspect path.' };
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('ENOENT') || msg.includes('no such file')) {
        return { valid: false, status: 'invalid_path', rootPath: clean, error: `Directory does not exist: ${clean}` };
      }
      if (msg.includes('ENOTDIR') || msg.includes('not a directory') || msg.includes('EISDIR')) {
        return { valid: false, status: 'not_directory', rootPath: clean, error: `Target path is a file, not a directory: ${clean}` };
      }
      if (msg.includes('EACCES') || msg.includes('permission denied')) {
        return { valid: false, status: 'not_accessible', rootPath: clean, error: `Access denied to path: ${clean}` };
      }
      return { valid: false, status: 'invalid_path', rootPath: clean, error: msg };
    }
  }

  async discoverProject(rawPath: string): Promise<ProjectDiscoveryInfo> {
    const validation = await this.validateProjectRoot(rawPath);
    const now = new Date().toISOString();

    if (!validation.valid) {
      const parts = normalizePath(rawPath).split(/[\\/]/).filter(Boolean);
      return {
        rootPath: validation.rootPath,
        name: parts[parts.length - 1] || 'Unknown Project',
        projectType: 'Unknown',
        languages: [],
        markerFiles: [],
        fileCount: 0,
        validationStatus: validation.status,
        errorMessage: validation.error,
        lastDiscovered: now,
      };
    }

    const rootPath = validation.rootPath;
    let rootEntries: { name: string; isDirectory: boolean; size: number }[] = [];
    try {
      rootEntries = await desktopBridge.listFiles(rootPath);
    } catch {
      rootEntries = [];
    }

    const entryNames = rootEntries.map((e) => e.name);
    const markerFiles: string[] = [];
    const languages: string[] = [];
    let detectedFramework: string | undefined;
    let detectedType = 'General Software Project';
    let projectName = rootPath.split(/[\\/]/).filter(Boolean).pop() || 'Workspace Project';

    // 1. Check Node.js / JavaScript / TypeScript Ecosystem
    const hasPackageJson = entryNames.includes('package.json');
    const hasTsConfig = entryNames.includes('tsconfig.json');
    const hasViteConfig = entryNames.some((n) => n.startsWith('vite.config.'));

    if (hasPackageJson) {
      markerFiles.push('package.json');
      detectedType = 'Node.js Application';

      try {
        const pkgContent = await desktopBridge.readFile(resolvePath(rootPath, 'package.json'));
        const pkg = JSON.parse(pkgContent);
        if (pkg.name && typeof pkg.name === 'string') {
          projectName = pkg.name;
        }

        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        const frameworkList: string[] = [];

        if (deps['electron'] || entryNames.includes('electron')) {
          frameworkList.push('Electron');
        }
        if (deps['react'] || deps['react-dom']) {
          frameworkList.push('React');
        }
        if (deps['vite'] || hasViteConfig) {
          frameworkList.push('Vite');
        }
        if (deps['next']) {
          frameworkList.push('Next.js');
        }
        if (deps['vue']) {
          frameworkList.push('Vue');
        }
        if (deps['svelte']) {
          frameworkList.push('Svelte');
        }
        if (deps['express'] || deps['fastify'] || deps['@nestjs/core']) {
          frameworkList.push('Node.js Backend');
        }

        if (frameworkList.length > 0) {
          detectedFramework = frameworkList.join(' + ');
        }
      } catch {
        // Safe JSON parsing fallback
      }

      if (hasTsConfig) {
        markerFiles.push('tsconfig.json');
        languages.push('TypeScript');
      } else {
        languages.push('JavaScript');
      }
    }

    // 2. Check Rust
    if (entryNames.includes('Cargo.toml')) {
      markerFiles.push('Cargo.toml');
      detectedType = 'Rust Project';
      languages.push('Rust');
      if (entryNames.includes('tauri.conf.json') || entryNames.includes('src-tauri')) {
        detectedFramework = detectedFramework ? `${detectedFramework} + Tauri` : 'Tauri';
      }
    }

    // 3. Check Python
    if (entryNames.includes('pyproject.toml') || entryNames.includes('requirements.txt') || entryNames.includes('Pipfile')) {
      if (entryNames.includes('pyproject.toml')) markerFiles.push('pyproject.toml');
      if (entryNames.includes('requirements.txt')) markerFiles.push('requirements.txt');
      detectedType = 'Python Project';
      languages.push('Python');
    }

    // 4. Check Go
    if (entryNames.includes('go.mod')) {
      markerFiles.push('go.mod');
      detectedType = 'Go Project';
      languages.push('Go');
    }

    // 5. Check Flutter / Dart
    if (entryNames.includes('pubspec.yaml')) {
      markerFiles.push('pubspec.yaml');
      detectedType = 'Flutter Application';
      detectedFramework = 'Flutter';
      languages.push('Dart');
    }

    // 6. Check Java / Gradle / Maven
    if (entryNames.includes('build.gradle') || entryNames.includes('build.gradle.kts') || entryNames.includes('pom.xml')) {
      if (entryNames.includes('build.gradle')) markerFiles.push('build.gradle');
      if (entryNames.includes('pom.xml')) markerFiles.push('pom.xml');
      detectedType = 'Java / JVM Project';
      languages.push('Java');
    }

    // Deduplicate languages and populate if empty
    const uniqueLanguages = Array.from(new Set(languages));
    if (uniqueLanguages.length === 0) {
      uniqueLanguages.push('Text');
    }

    const fileCount = rootEntries.filter((e) => !e.isDirectory).length;

    return {
      rootPath,
      name: projectName,
      projectType: detectedType,
      framework: detectedFramework,
      languages: uniqueLanguages,
      markerFiles,
      fileCount,
      validationStatus: 'valid',
      lastDiscovered: now,
    };
  }

  async addProjectByPath(rawPath: string): Promise<ProjectMetadata> {
    const discovery = await this.discoverProject(rawPath);
    const cleanPath = discovery.rootPath || normalizePath(rawPath);
    const existing = this.projects.find((p) => normalizePath(p.path).toLowerCase() === cleanPath.toLowerCase());

    if (existing) {
      const updated: ProjectMetadata = {
        ...existing,
        name: discovery.name || existing.name,
        rootPath: cleanPath,
        path: cleanPath,
        projectType: discovery.projectType,
        framework: discovery.framework || existing.framework,
        markerFiles: discovery.markerFiles,
        languages: discovery.languages.length > 0 ? discovery.languages : existing.languages,
        validationStatus: discovery.validationStatus,
        lastDiscovered: discovery.lastDiscovered,
      };
      await this.updateProject(existing.id, updated);
      this.setActiveProject(existing.id);
      return updated;
    }

    const newProj: ProjectMetadata = {
      id: `proj-${Date.now()}`,
      name: discovery.name,
      path: cleanPath,
      rootPath: cleanPath,
      description: discovery.framework ? `${discovery.projectType} (${discovery.framework})` : discovery.projectType,
      gitBranch: 'main',
      fileCount: discovery.fileCount || 20,
      languages: discovery.languages,
      projectType: discovery.projectType,
      framework: discovery.framework,
      markerFiles: discovery.markerFiles,
      validationStatus: discovery.validationStatus,
      lastDiscovered: discovery.lastDiscovered,
      lastModified: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: 'Dynamically discovered project workspace.',
    };

    this.projects = this.projects.map((p) => ({ ...p, isActive: false }));
    this.projects.unshift(newProj);
    this.activeProject = newProj;
    this.saveData();
    activityService.logEvent({
      category: 'system',
      icon: 'FolderKanban',
      title: 'Project Discovered & Added',
      description: `Discovered '${newProj.name}' (${newProj.path}) - ${newProj.framework || newProj.projectType}`,
      status: 'completed',
      path: newProj.path,
    });
    this.notify();
    return newProj;
  }

  resolveOrSetProjectByPath(rawPath: string): ProjectMetadata {
    const clean = normalizePath(rawPath);
    if (!clean) {
      return this.getActiveProject() || DEFAULT_PROJECTS[0];
    }

    const cleanLower = clean.toLowerCase();
    const existing = this.projects.find((p) => normalizePath(p.path).toLowerCase() === cleanLower);

    if (existing) {
      if (!existing.isActive) {
        this.setActiveProject(existing.id);
      }
      return existing;
    }

    // Derive name from path
    const parts = clean.split(/[\\/]/).filter(Boolean);
    const name = parts[parts.length - 1] || 'Workspace Project';

    const newProj: ProjectMetadata = {
      id: `proj-${Date.now()}`,
      name,
      path: clean,
      rootPath: clean,
      description: `Project at ${clean}`,
      gitBranch: 'main',
      fileCount: 40,
      languages: ['TypeScript', 'React', 'Electron', 'Node.js'],
      lastModified: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: 'Dynamically detected project workspace.',
    };

    this.projects = this.projects.map((p) => ({ ...p, isActive: false }));
    this.projects.unshift(newProj);
    this.activeProject = newProj;
    this.saveData();
    this.notify();
    return newProj;
  }

  getWorkspaceContext(): WorkspaceContext {
    const proj = this.getActiveProject();
    return {
      project: proj,
      rootPath: proj ? proj.rootPath || normalizePath(proj.path) : null,
      validationStatus: proj?.validationStatus || (proj ? 'valid' : 'unknown'),
      discovery: null,
    };
  }

  private saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.projects));
      if (this.activeProject) {
        localStorage.setItem(ACTIVE_KEY, this.activeProject.id);
      }
    } catch {
      // ignore
    }
  }

  getProjects(): ProjectMetadata[] {
    return [...this.projects];
  }

  getActiveProject(): ProjectMetadata | null {
    return this.activeProject;
  }

  setActiveProject(id: string) {
    const project = this.projects.find((p) => p.id === id);
    if (project) {
      this.projects = this.projects.map((p) => ({
        ...p,
        isActive: p.id === id,
      }));
      this.activeProject = { ...project, isActive: true };
      this.saveData();
      activityService.logEvent({
        category: 'agent',
        icon: 'FolderKanban',
        title: 'Active Project Changed',
        description: `Switched active project to '${project.name}'. Path: ${project.path}`,
        status: 'completed',
        path: project.path,
      });
      this.notify();
    }
  }

  async addProject(
    data: Omit<ProjectMetadata, 'id' | 'lastModified' | 'isActive'>
  ): Promise<ProjectMetadata> {
    const normRoot = normalizePath(data.path);
    const newProj: ProjectMetadata = {
      ...data,
      path: normRoot,
      rootPath: data.rootPath || normRoot,
      id: `proj-${Date.now()}`,
      lastModified: new Date().toISOString().split('T')[0],
      isActive: this.projects.length === 0,
      validationStatus: data.validationStatus || 'valid',
    };

    this.projects.push(newProj);
    if (newProj.isActive || !this.activeProject) {
      this.activeProject = newProj;
    }

    this.saveData();
    activityService.logEvent({
      category: 'system',
      icon: 'FolderPlus',
      title: 'Project Added',
      description: `Added project '${newProj.name}' (${newProj.path}). Files: ${newProj.fileCount}.`,
      status: 'completed',
      path: newProj.path,
    });
    this.notify();
    return newProj;
  }

  async updateProject(id: string, updates: Partial<ProjectMetadata>): Promise<ProjectMetadata | null> {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const normPath = updates.path ? normalizePath(updates.path) : this.projects[index].path;
    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      path: normPath,
      rootPath: updates.rootPath || normPath,
      lastModified: new Date().toISOString().split('T')[0],
    };

    if (this.activeProject && this.activeProject.id === id) {
      this.activeProject = this.projects[index];
    }

    this.saveData();
    activityService.logEvent({
      category: 'system',
      icon: 'Edit',
      title: 'Project Renamed / Updated',
      description: `Updated project metadata for '${this.projects[index].name}'.`,
      status: 'completed',
    });
    this.notify();
    return this.projects[index];
  }

  async removeProject(id: string): Promise<boolean> {
    const toRemove = this.projects.find((p) => p.id === id);
    if (!toRemove) return false;

    this.projects = this.projects.filter((p) => p.id !== id);
    if (this.activeProject && this.activeProject.id === id) {
      this.activeProject = this.projects[0] || null;
      if (this.activeProject) {
        this.activeProject.isActive = true;
      }
    }

    this.saveData();
    activityService.logEvent({
      category: 'system',
      icon: 'FolderMinus',
      title: 'Project Removed from Workspace',
      description: `Removed project '${toRemove.name}' from application list (disk files preserved).`,
      status: 'completed',
    });
    this.notify();
    return true;
  }

  subscribe(callback: (projects: ProjectMetadata[], active: ProjectMetadata | null) => void): () => void {
    this.subscribers.push(callback);
    callback([...this.projects], this.activeProject);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const list = [...this.projects];
    const active = this.activeProject;
    for (const sub of this.subscribers) {
      sub(list, active);
    }
  }
}

export const projectService = new ProjectService();
