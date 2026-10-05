import type { SkillManifest } from '../../types/agent.ts';

const DEFAULT_SKILLS: SkillManifest[] = [
  {
    id: 'skill-project-manager',
    name: 'Personal AI Project Inspector & Manager',
    description: 'High-level workspace inspection, file verification, package.json analysis, and project structure checks via File Tool.',
    version: '1.0.0',
    category: 'management',
    enabled: true,
    tools: ['file_tool', 'project_tool', 'task_manager_tool', 'system_info_tool', 'code_analysis_tool', 'documentation_tool'],
    permissions: ['readFiles', 'editFiles'],
    instructions:
      'Inspect project files, read source code, analyze folder layout, verify runtime requirements via File Tool, and organize structured task execution.',
    examples: ['Inspect project structure', 'Check package.json and project files', 'Read App.tsx and source files via File Tool'],
  },
  {
    id: 'skill-fullstack-dev',
    name: 'Personal AI Desktop & Full-Stack Developer',
    description: 'Windows 10 Desktop application development (Electron, React, TypeScript, Vite, Node.js, and Ollama Qwen3:14B).',
    version: '1.0.0',
    category: 'development',
    enabled: true,
    tools: ['file_tool', 'terminal_tool', 'dependency_tool', 'code_analysis_tool', 'build_run_tool', 'project_tool'],
    permissions: ['readFiles', 'editFiles', 'runTerminalCommands'],
    instructions:
      'Inspect and edit frontend and backend source files, manage dependencies, verify build output, and automate Windows desktop development workflows.',
    examples: ['Inspect package.json dependencies', 'Read and edit TypeScript components', 'Run build and packaging scripts'],
  },
  {
    id: 'skill-debugging',
    name: 'Debugging & Verification',
    description: 'Failure analysis, stack trace inspection, regression test execution, and safe rollback.',
    version: '1.0.0',
    category: 'testing',
    enabled: true,
    tools: ['file_tool', 'code_analysis_tool', 'testing_tool', 'terminal_tool', 'backup_restore_tool'],
    permissions: ['readFiles', 'editFiles', 'runTerminalCommands'],
    instructions:
      'Inspect source files, diagnose root cause of errors, create backups before modifying code, and verify fixes.',
    examples: ['Inspect code and error logs', 'Diagnose build failure stack trace', 'Verify component logic'],
  },
  {
    id: 'skill-git',
    name: 'Git & Version Control',
    description: 'Inspect repository status, branches, commit logs, and local file changes safely.',
    version: '1.0.0',
    category: 'vcs',
    enabled: true,
    tools: ['file_tool', 'git_tool', 'terminal_tool'],
    permissions: ['runTerminalCommands', 'readFiles'],
    instructions:
      'Run git status, review branch diffs, inspect recent commits, and manage local project version control safely.',
    examples: ['Check git status', 'Review unstaged changes', 'View git log'],
  },
  {
    id: 'skill-web-research',
    name: 'Web Research & Documentation',
    description: 'Technical reference lookups, developer documentation retrieval, and API specs.',
    version: '1.0.0',
    category: 'research',
    enabled: true,
    tools: ['file_tool', 'web_search_tool', 'browser_tool', 'documentation_tool'],
    permissions: ['internetAccess', 'readFiles'],
    instructions:
      'Search official developer documentation, extract technical specifications, and summarize APIs.',
    examples: ['Search React documentation', 'Look up Electron API', 'Search Ollama documentation'],
  },
];

class SkillRegistry {
  private skills: Map<string, SkillManifest> = new Map();
  private subscribers: ((skills: SkillManifest[]) => void)[] = [];

  constructor() {
    this.loadSkills();
  }

  private loadSkills() {
    try {
      const saved = localStorage.getItem('personal_ai_skills');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If saved skills contained legacy android skill as primary, refresh to default skills
        const hasLegacyAndroid = Array.isArray(parsed) && parsed.some((s: any) => s.id === 'skill-android-dev');
        if (hasLegacyAndroid) {
          DEFAULT_SKILLS.forEach((s) => this.skills.set(s.id, { ...s }));
          this.persist();
          return;
        }

        parsed.forEach((s: SkillManifest) => {
          if (!s.tools.includes('file_tool')) {
            s.tools.unshift('file_tool');
          }
          this.skills.set(s.id, s);
        });
        return;
      }
    } catch {}

    DEFAULT_SKILLS.forEach((s) => this.skills.set(s.id, { ...s }));
  }

  private persist() {
    try {
      localStorage.setItem('personal_ai_skills', JSON.stringify(Array.from(this.skills.values())));
    } catch {}
  }

  getAllSkills(): SkillManifest[] {
    return Array.from(this.skills.values());
  }

  getEnabledSkills(): SkillManifest[] {
    return Array.from(this.skills.values()).filter((s) => s.enabled);
  }

  getSkill(id: string): SkillManifest | undefined {
    return this.skills.get(id);
  }

  setSkillEnabled(id: string, enabled: boolean) {
    const skill = this.skills.get(id);
    if (skill) {
      skill.enabled = enabled;
      this.persist();
      this.notify();
    }
  }

  addCustomSkill(manifest: Omit<SkillManifest, 'id' | 'isCustom'>): SkillManifest {
    const newSkill: SkillManifest = {
      ...manifest,
      id: `skill-custom-${Date.now()}`,
      isCustom: true,
      enabled: true,
    };
    this.skills.set(newSkill.id, newSkill);
    this.persist();
    this.notify();
    return newSkill;
  }

  /**
   * Future GitHub Skill Downloader stub - marked honestly as Not connected yet
   */
  async installSkillFromGitHub(_repoUrl: string): Promise<{ success: boolean; error: string }> {
    return {
      success: false,
      error: 'GitHub Skill auto-installer is Not connected yet (Planned for future stage. Built-in and custom skills are fully active).',
    };
  }

  selectSkillForTask(task: string): SkillManifest {
    const lower = task.toLowerCase();
    const enabled = this.getEnabledSkills();

    // Inspection & Project File tasks
    const isProjectOrFileTask =
      lower.includes('project') ||
      lower.includes('مشروع') ||
      lower.includes('فحص') ||
      lower.includes('افحص') ||
      lower.includes('اقرأ') ||
      lower.includes('اقرا') ||
      lower.includes('ملف') ||
      lower.includes('كود') ||
      lower.includes('تحليل') ||
      lower.includes('أداة') ||
      lower.includes('file') ||
      lower.includes('inspect') ||
      lower.includes('read') ||
      lower.includes('package.json') ||
      lower.includes('app.tsx') ||
      lower.includes('src');

    if (isProjectOrFileTask) {
      return this.skills.get('skill-project-manager') || this.skills.get('skill-fullstack-dev') || enabled[0];
    }

    if (lower.includes('git') || lower.includes('جيت') || lower.includes('branch') || lower.includes('commit') || lower.includes('diff')) {
      return this.skills.get('skill-git') || enabled[0];
    }
    if (lower.includes('search') || lower.includes('بحث') || lower.includes('web') || lower.includes('doc') || lower.includes('internet') || lower.includes('browse')) {
      return this.skills.get('skill-web-research') || enabled[0];
    }
    if (lower.includes('test') || lower.includes('اختبار') || lower.includes('debug') || lower.includes('تصحيح') || lower.includes('crash')) {
      return this.skills.get('skill-debugging') || enabled[0];
    }

    return this.skills.get('skill-fullstack-dev') || this.skills.get('skill-project-manager') || enabled[0];
  }

  subscribe(callback: (skills: SkillManifest[]) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getAllSkills());
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const list = this.getAllSkills();
    for (const sub of this.subscribers) {
      sub(list);
    }
  }
}

export const skillRegistry = new SkillRegistry();
