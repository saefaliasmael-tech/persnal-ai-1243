/**
 * Path Utilities for Personal AI (Windows 10 & Universal)
 * Provides reliable Windows path normalization, absolute path detection,
 * and project boundary resolution without fragile string operations.
 */

export function cleanQuotes(p: string): string {
  if (!p) return '';
  return p.trim().replace(/^["']|["']$/g, '').trim();
}

export function isAbsolutePath(p: string): boolean {
  if (!p) return false;
  const clean = cleanQuotes(p);
  // Windows drive letter: e.g. C:\ or C:/ or D:
  if (/^[a-zA-Z]:[\\/]/.test(clean)) return true;
  // Windows UNC: \\server\share
  if (/^\\\\[^\\]+/.test(clean)) return true;
  // POSIX absolute: /var/...
  if (clean.startsWith('/')) return true;
  return false;
}

export function normalizePath(p: string): string {
  if (!p) return '';
  let clean = cleanQuotes(p);

  // Detect if Windows path (starts with drive letter or UNC or has backslashes)
  const isWindows = /^[a-zA-Z]:/.test(clean) || clean.startsWith('\\\\') || clean.includes('\\');

  if (isWindows) {
    // Unify all slashes to backslash for Windows consistency
    clean = clean.replace(/\//g, '\\');
    // Remove duplicate backslashes except leading UNC \\
    const isUNC = clean.startsWith('\\\\');
    clean = clean.replace(/\\+/g, '\\');
    if (isUNC && !clean.startsWith('\\\\')) {
      clean = '\\' + clean;
    }
    // Remove trailing backslash unless it's a drive root like C:\
    if (clean.length > 3 && clean.endsWith('\\')) {
      clean = clean.slice(0, -1);
    }
  } else {
    // POSIX
    clean = clean.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (clean.length > 1 && clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
  }

  return clean;
}

export function resolvePath(baseDir: string, relativeOrAbsolute: string): string {
  const target = cleanQuotes(relativeOrAbsolute);
  if (!target) return normalizePath(baseDir);

  if (isAbsolutePath(target)) {
    return normalizePath(target);
  }

  const base = normalizePath(baseDir);
  if (!base) return normalizePath(target);

  const isWindows = base.includes('\\') || /^[a-zA-Z]:/.test(base);
  const sep = isWindows ? '\\' : '/';

  // Strip leading ./ or .\
  const cleanRelative = target.replace(/^(\.\/|\.\\)+/, '');

  return normalizePath(`${base}${sep}${cleanRelative}`);
}

/**
 * Extracts absolute path mentioned in user prompt or instruction (e.g. C:\Users\saif\Desktop\personal-ai)
 */
export function extractPathFromText(text: string): string | null {
  if (!text) return null;

  // Match Windows path with drive letter: e.g. C:\Users\saif\Desktop\personal-ai or "C:\..."
  const winMatch = text.match(/(?:[a-zA-Z]:[\\/][^\s"'<>|?*]+|"[a-zA-Z]:[\\/][^"<>|?*]+")/);
  if (winMatch) {
    return cleanQuotes(winMatch[0]);
  }

  // Match POSIX absolute path
  const posixMatch = text.match(/(?:\/[a-zA-Z0-9_\-\.]+)+/);
  if (posixMatch && !posixMatch[0].startsWith('/api')) {
    return cleanQuotes(posixMatch[0]);
  }

  return null;
}
