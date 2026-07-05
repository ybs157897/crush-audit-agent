import type { Workspace } from './client';

const REGISTRY_KEY = 'crush-web-known-workspaces';
const MAX_ENTRIES = 64;

export type KnownWorkspace = {
  path: string;
  id?: string;
  lastUsed: number;
};

export function normalizeWorkspacePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

export function workspacePathId(path: string): string {
  return `path:${normalizeWorkspacePath(path)}`;
}

export function isPathWorkspaceId(id: string): boolean {
  return id.startsWith('path:');
}

export function loadKnownWorkspaces(): KnownWorkspace[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as KnownWorkspace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveKnownWorkspaces(list: KnownWorkspace[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
}

/** Remember a workspace path so it stays in the sidebar after server teardown. */
export function rememberWorkspace(ws: Workspace): void {
  const norm = normalizeWorkspacePath(ws.path);
  const list = loadKnownWorkspaces().filter(
    (k) => normalizeWorkspacePath(k.path) !== norm,
  );
  list.unshift({
    path: ws.path,
    id: isPathWorkspaceId(ws.id) ? undefined : ws.id,
    lastUsed: Date.now(),
  });
  saveKnownWorkspaces(list);
}

/** Merge server-running workspaces with locally remembered paths. */
export function mergeWorkspaces(running: Workspace[]): Workspace[] {
  const runningByPath = new Map(
    running.map((ws) => [normalizeWorkspacePath(ws.path), ws]),
  );

  for (const live of running) {
    rememberWorkspace(live);
  }

  const result: Workspace[] = [];
  const seen = new Set<string>();

  for (const entry of loadKnownWorkspaces().sort((a, b) => b.lastUsed - a.lastUsed)) {
    const norm = normalizeWorkspacePath(entry.path);
    if (seen.has(norm)) continue;
    seen.add(norm);

    const live = runningByPath.get(norm);
    if (live) {
      result.push(live);
    } else {
      result.push({ id: workspacePathId(entry.path), path: entry.path });
    }
  }

  for (const live of running) {
    const norm = normalizeWorkspacePath(live.path);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(live);
    }
  }

  return result;
}

export function findKnownWorkspaceById(id: string): KnownWorkspace | undefined {
  return loadKnownWorkspaces().find(
    (k) => k.id === id || workspacePathId(k.path) === id,
  );
}
