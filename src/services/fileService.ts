import type { IFileService } from '../types/services.ts';
import { activityService } from './activityService.ts';
import { desktopBridge } from './desktopBridge.ts';
import { permissionService } from './permissionService.ts';
import { normalizePath } from './pathUtils.ts';

class FileService implements IFileService {
  async readFile(path: string): Promise<string> {
    const cleanPath = normalizePath(path);
    const allowed = await permissionService.requestPermission('Read File', cleanPath, 'readFiles');
    if (!allowed) {
      throw new Error(`Permission denied: Unable to read file at ${cleanPath}`);
    }

    try {
      const content = await desktopBridge.readFile(cleanPath);
      activityService.logEvent({
        category: 'files',
        icon: 'FileText',
        title: 'File Read',
        description: `Read contents from ${cleanPath}`,
        status: 'completed',
        path: cleanPath,
      });
      return content;
    } catch (err: any) {
      activityService.logEvent({
        category: 'files',
        icon: 'AlertCircle',
        title: 'File Read Error',
        description: `Failed to read ${cleanPath}: ${err.message}`,
        status: 'failed',
        path: cleanPath,
      });
      throw err;
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    const cleanPath = normalizePath(path);
    const allowed = await permissionService.requestPermission('Edit File', cleanPath, 'editFiles');
    if (!allowed) {
      throw new Error(`Permission denied: Unable to write to file at ${cleanPath}`);
    }

    try {
      const ok = await desktopBridge.writeFile(cleanPath, content);
      activityService.logEvent({
        category: 'files',
        icon: 'FileEdit',
        title: 'File Modified',
        description: `Saved updates to ${cleanPath} (${content.length} chars)`,
        status: 'completed',
        path: cleanPath,
      });
      return ok;
    } catch (err: any) {
      activityService.logEvent({
        category: 'files',
        icon: 'AlertTriangle',
        title: 'File Write Error',
        description: `Failed to write ${cleanPath}: ${err.message}`,
        status: 'failed',
        path: cleanPath,
      });
      throw err;
    }
  }

  async createFile(path: string, initialContent = ''): Promise<boolean> {
    const cleanPath = normalizePath(path);
    const allowed = await permissionService.requestPermission('Create File', cleanPath, 'editFiles');
    if (!allowed) {
      throw new Error(`Permission denied: Unable to create file at ${cleanPath}`);
    }

    const ok = await desktopBridge.writeFile(cleanPath, initialContent);
    activityService.logEvent({
      category: 'files',
      icon: 'FilePlus',
      title: 'File Created',
      description: `Created new file at ${cleanPath}`,
      status: 'completed',
      path: cleanPath,
    });
    return ok;
  }

  async deleteFile(path: string): Promise<boolean> {
    const cleanPath = normalizePath(path);
    const allowed = await permissionService.requestPermission('Delete File', cleanPath, 'deleteFiles');
    if (!allowed) {
      throw new Error(`Permission denied: Unable to delete file at ${cleanPath}`);
    }

    const ok = await desktopBridge.deleteFile(cleanPath);
    activityService.logEvent({
      category: 'files',
      icon: 'Trash2',
      title: 'File Deleted',
      description: `Deleted file at ${cleanPath}`,
      status: 'completed',
      path: cleanPath,
    });
    return ok;
  }

  async renameFile(oldPath: string, newPath: string): Promise<boolean> {
    const cleanOld = normalizePath(oldPath);
    const cleanNew = normalizePath(newPath);
    const allowed = await permissionService.requestPermission('Rename File', `${cleanOld} -> ${cleanNew}`, 'editFiles');
    if (!allowed) {
      throw new Error(`Permission denied to rename file.`);
    }

    const content = await desktopBridge.readFile(cleanOld);
    await desktopBridge.writeFile(cleanNew, content);
    await desktopBridge.deleteFile(cleanOld);

    activityService.logEvent({
      category: 'files',
      icon: 'FolderSync',
      title: 'File Renamed',
      description: `Renamed from ${cleanOld} to ${cleanNew}`,
      status: 'completed',
      path: cleanNew,
    });
    return true;
  }

  async listDirectory(dirPath: string): Promise<{ name: string; isDir: boolean; size: number }[]> {
    const cleanDir = normalizePath(dirPath);
    const entries = await desktopBridge.listFiles(cleanDir);
    return entries.map((e) => ({
      name: e.name,
      isDir: e.isDirectory,
      size: e.size,
    }));
  }
}

export const fileService = new FileService();
