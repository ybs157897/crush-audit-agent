import { useMemo } from 'react';
import type { Session, Workspace } from '../api/client';
import { normalizeWorkspacePath } from '../api/workspaceRegistry';
import { workspaceLabel } from '../ui/common/utils';

export type SessionSearchHit = {
  workspace: Workspace;
  session: Session;
};

export function flattenSessions(
  workspaces: Workspace[],
  sessionsByWorkspace: Record<string, Session[]>,
): SessionSearchHit[] {
  const hits: SessionSearchHit[] = [];
  for (const ws of workspaces) {
    const key = normalizeWorkspacePath(ws.path);
    const list = sessionsByWorkspace[key] ?? [];
    for (const session of list) {
      hits.push({ workspace: ws, session });
    }
  }
  return hits;
}

export function filterSessionHits(
  hits: SessionSearchHit[],
  query: string,
): SessionSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return hits.slice(0, 50);
  return hits.filter((hit) => {
    const title = (hit.session.title || '').toLowerCase();
    const body = (hit.session.searchable_text || '').toLowerCase();
    const wsName = workspaceLabel(hit.workspace.path).toLowerCase();
    const path = hit.workspace.path.toLowerCase();
    return title.includes(q) || body.includes(q) || wsName.includes(q) || path.includes(q);
  }).slice(0, 50);
}

export function useSessionSearch(
  workspaces: Workspace[],
  sessionsByWorkspace: Record<string, Session[]>,
  query: string,
): SessionSearchHit[] {
  return useMemo(() => {
    const all = flattenSessions(workspaces, sessionsByWorkspace);
    return filterSessionHits(all, query);
  }, [workspaces, sessionsByWorkspace, query]);
}
