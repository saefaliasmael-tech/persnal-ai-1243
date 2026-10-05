import type {
  PermissionLevel,
  PermissionRequest,
  SystemPermissions,
} from '../types/models.ts';
import type { IPermissionService } from '../types/services.ts';
import { activityService } from './activityService.ts';

const STORAGE_KEY = 'personal_ai_permissions';

class PermissionService implements IPermissionService {
  private permissions: SystemPermissions = {
    readFiles: 'allow',
    editFiles: 'allow',
    runTerminalCommands: 'ask',
    internetAccess: 'ask',
    installSoftware: 'ask',
    deleteFiles: 'ask',
    deleteProject: 'deny',
    safeMode: true,
  };

  private activeRequests: PermissionRequest[] = [];
  private subscribers: ((perms: SystemPermissions, activeRequests: PermissionRequest[]) => void)[] = [];

  constructor() {
    this.loadPermissions();
  }

  private loadPermissions() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.permissions = { ...this.permissions, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }

  private savePermissions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.permissions));
    } catch {
      // ignore
    }
  }

  getPermissions(): SystemPermissions {
    return { ...this.permissions };
  }

  setPermission(type: keyof SystemPermissions, level: PermissionLevel) {
    if (type === 'safeMode') return;
    this.permissions[type] = level;
    this.savePermissions();
    activityService.logEvent({
      category: 'system',
      icon: 'Shield',
      title: 'Permission Policy Updated',
      description: `Rule for '${String(type)}' set to ${level.toUpperCase()}.`,
      status: 'completed',
    });
    this.notify();
  }

  setSafeMode(enabled: boolean) {
    this.permissions.safeMode = enabled;
    this.savePermissions();
    activityService.logEvent({
      category: 'system',
      icon: enabled ? 'ShieldCheck' : 'ShieldAlert',
      title: 'Safe Mode Changed',
      description: `Safe Mode has been turned ${enabled ? 'ON' : 'OFF'}.`,
      status: 'completed',
    });
    this.notify();
  }

  async requestPermission(action: string, resource: string, type: keyof SystemPermissions): Promise<boolean> {
    const currentRule = this.permissions[type];

    // If policy is strictly denied
    if (currentRule === 'deny') {
      activityService.logEvent({
        category: 'system',
        icon: 'Ban',
        title: 'Action Denied by Security Policy',
        description: `Blocked '${action}' on '${resource}'. Policy rule is DENY.`,
        status: 'failed',
      });
      return false;
    }

    // If allowed (readFiles is safe to auto-approve when policy is 'allow')
    if (currentRule === 'allow' && (!this.permissions.safeMode || type === 'readFiles')) {
      activityService.logEvent({
        category: 'system',
        icon: 'Check',
        title: 'Action Auto-Approved',
        description: `Auto-approved '${action}' under current security policy.`,
        status: 'completed',
      });
      return true;
    }

    // Otherwise prompt the user via real confirmation dialog
    return new Promise<boolean>((resolve) => {
      const reqId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const request: PermissionRequest = {
        id: reqId,
        action,
        resource,
        type,
        details: `Agent requested permission to execute: ${action} on ${resource}`,
        timestamp: new Date().toTimeString().split(' ')[0],
        resolve: (allowed: boolean) => {
          this.activeRequests = this.activeRequests.filter((r) => r.id !== reqId);
          this.notify();
          activityService.logEvent({
            category: 'system',
            icon: allowed ? 'CheckCircle2' : 'XCircle',
            title: allowed ? 'Permission Granted by User' : 'Permission Denied by User',
            description: `User ${allowed ? 'allowed' : 'denied'} '${action}' on '${resource}'.`,
            status: allowed ? 'completed' : 'failed',
          });
          resolve(allowed);
        },
      };

      this.activeRequests.push(request);
      activityService.logEvent({
        category: 'agent',
        icon: 'Lock',
        title: 'Waiting for Permission',
        description: `Agent paused: Waiting for approval to execute '${action}'.`,
        status: 'waiting_permission',
        details: resource,
      });

      this.notify();
    });
  }

  getActiveRequests(): PermissionRequest[] {
    return [...this.activeRequests];
  }

  respondToRequest(requestId: string, allowed: boolean) {
    const req = this.activeRequests.find((r) => r.id === requestId);
    if (req) {
      req.resolve(allowed);
    }
  }

  subscribe(callback: (perms: SystemPermissions, activeRequests: PermissionRequest[]) => void): () => void {
    this.subscribers.push(callback);
    callback({ ...this.permissions }, [...this.activeRequests]);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    const perms = { ...this.permissions };
    const requests = [...this.activeRequests];
    for (const sub of this.subscribers) {
      sub(perms, requests);
    }
  }
}

export const permissionService = new PermissionService();
