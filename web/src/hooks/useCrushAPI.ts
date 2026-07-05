import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '../api/client';
import type {
  Workspace, Session, Message, SSEPayload, AgentInfo,
  LSPInfo, MCPInfo, PermissionRequest, WorkspaceConfig, Attachment, Todo,
} from '../api/client';
import { useSSE } from './useSSE';
import { parseSSEEnvelope, messageFromSSE } from '../api/client';
import {
  mergeWorkspaces,
  rememberWorkspace,
  findKnownWorkspaceById,
  workspacePathId,
  normalizeWorkspacePath,
  isPathWorkspaceId,
} from '../api/workspaceRegistry';
import { isDefaultSessionTitle, titleFromFirstMessage, firstUserTextFromMessages } from '../api/sessionTitle';

function upsertMessage(list: Message[], msg: Message): Message[] {
  const idx = list.findIndex((m) => m.id === msg.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = msg;
    return next;
  }
  const withoutTemp = list.filter((m) => !m.id.startsWith('temp-') || m.role !== msg.role);
  return [...withoutTemp, msg];
}

export type SessionRuntimeStatus = 'running' | 'done';

export interface CrushAPI {
  workspace: Workspace | null;
  workspaces: Workspace[];
  session: Session | null;
  sessions: Session[];
  sessionsByWorkspace: Record<string, Session[]>;
  sessionStatus: Record<string, SessionRuntimeStatus>;
  messages: Message[];
  files: string[];
  skills: Array<{ name: string; description: string; state?: string }>;
  lsps: LSPInfo[];
  mcps: MCPInfo[];
  agentInfo: AgentInfo | null;
  config: WorkspaceConfig | null;
  queuedCount: number;
  queuedPrompts: string[];
  isBusy: boolean;
  yolo: boolean;
  needsInit: boolean;
  error: string | null;
  cwd: string;
  sseConnected: boolean;
  clientId: string;
  sendMessage: (text: string, attachments?: Attachment[]) => Promise<void>;
  runShell: (command: string) => Promise<void>;
  createNewSession: () => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string, workspaceId?: string) => Promise<void>;
  deleteSessionById: (sessionId: string, workspaceId?: string) => Promise<void>;
  updateTodo: (index: number, status: string) => Promise<void>;
  cancel: () => Promise<void>;
  clearQueue: () => Promise<void>;
  summarize: () => Promise<void>;
  grantPermission: (action: 'allow' | 'allow_session' | 'deny') => Promise<void>;
  refreshAgent: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  switchModel: (provider: string, model: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  switchToSession: (workspaceId: string, sessionId: string) => Promise<void>;
  openWorkspaceFolder: (path: string) => Promise<void>;
  setYolo: (enabled: boolean) => Promise<void>;
  initializeProject: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshAllSessions: () => Promise<void>;
  clearError: () => void;
  bootstrapping: boolean;
}

export function useCrushAPI(
  onPermission?: (req: PermissionRequest) => void,
  onToast?: (msg: string) => void,
  onLifecycle?: (state: { needsOnboarding: boolean; needsInit: boolean; noSession: boolean }) => void,
): CrushAPI {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionsByWorkspace, setSessionsByWorkspace] = useState<Record<string, Session[]>>({});
  const [sessionStatus, setSessionStatus] = useState<Record<string, SessionRuntimeStatus>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [skills, setSkills] = useState<Array<{ name: string; description: string; state?: string }>>([]);
  const [lsps, setLsps] = useState<LSPInfo[]>([]);
  const [mcps, setMcps] = useState<MCPInfo[]>([]);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [config, setConfig] = useState<WorkspaceConfig | null>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [queuedPrompts, setQueuedPrompts] = useState<string[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [yolo, setYolo] = useState(false);
  const [needsInit, setNeedsInit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [clientId] = useState(() => api.getClientId());
  const sessionRef = useRef<Session | null>(null);
  const workspaceRef = useRef<Workspace | null>(null);
  sessionRef.current = session;
  workspaceRef.current = workspace;
  const workspaceId = workspace?.id || null;
  const sessions = workspace?.path
    ? (sessionsByWorkspace[normalizeWorkspacePath(workspace.path)] ?? [])
    : [];

  const setWorkspaceSessions = useCallback((pathKey: string, list: Session[]) => {
    setSessionsByWorkspace((prev) => ({ ...prev, [pathKey]: list }));
  }, []);

  const workspacePathKey = useCallback((ws: { path: string } | null | undefined): string | null => {
    if (!ws?.path) return null;
    return normalizeWorkspacePath(ws.path);
  }, []);

  const patchSessionBusy = useCallback((pathKey: string, sessionId: string, busy: boolean) => {
    setSessionsByWorkspace((prev) => {
      const list = prev[pathKey];
      if (!list) return prev;
      return {
        ...prev,
        [pathKey]: list.map((s) => (s.id === sessionId ? { ...s, is_busy: busy } : s)),
      };
    });
    if (sessionRef.current?.id === sessionId) {
      setSession((s) => (s ? { ...s, is_busy: busy } : s));
    }
  }, []);

  const markSessionStatus = useCallback((sessionId: string, status: SessionRuntimeStatus) => {
    setSessionStatus((prev) => ({ ...prev, [sessionId]: status }));
  }, []);
  const onPermissionRef = useRef(onPermission);
  const onToastRef = useRef(onToast);
  const onLifecycleRef = useRef(onLifecycle);
  onPermissionRef.current = onPermission;
  onToastRef.current = onToast;
  onLifecycleRef.current = onLifecycle;

  const refreshMeta = useCallback(async (wid?: string) => {
    const id = wid || workspaceId;
    if (!id) return;
    try {
      const [info, cfg, lspList, mcpList, skillList, skip] = await Promise.all([
        api.getAgentInfo(id),
        api.getWorkspaceConfig(id),
        api.getLSPs(id),
        api.getMCPs(id),
        api.getSkills(id),
        api.getPermissionsSkip(id),
      ]);
      setAgentInfo(info);
      setConfig(cfg);
      setLsps(lspList);
      setMcps(mcpList);
      setSkills(skillList);
      setIsBusy(info.is_busy);
      setYolo(skip);
    } catch { /* ignore */ }
  }, [workspaceId]);

  const refreshSessionData = useCallback(async (sid: string, full = true, wid?: string) => {
    const id = wid || workspaceId;
    if (!id) return;
    try {
      const tasks: Promise<unknown>[] = [
        api.getSession(id, sid),
        api.getQueuedPromptCount(id, sid),
        api.listQueuedPrompts(id, sid),
        api.getFiles(id, sid),
      ];
      if (full) tasks.unshift(api.getMessages(id, sid));
      const results = await Promise.all(tasks);
      let i = 0;
      if (full) {
        setMessages(results[i++] as Message[]);
      }
      const sess = results[i++] as Session;
      setSession(sess);
      setQueuedCount(results[i++] as number);
      setQueuedPrompts(results[i++] as string[]);
      setFiles(results[i++] as string[]);
      setIsBusy(sess.is_busy ?? false);
    } catch { /* ignore */ }
  }, [workspaceId]);

  const refreshSessions = useCallback(async (wid?: string) => {
    const id = wid || workspaceId;
    if (!id) return;
    const ws = workspaces.find((w) => w.id === id)
      || (workspaceRef.current?.id === id ? workspaceRef.current : null);
    if (!ws || isPathWorkspaceId(ws.id)) return;
    const list = await api.getSessions(ws.id);
    const key = workspacePathKey(ws);
    if (key) setWorkspaceSessions(key, list);
  }, [workspaceId, workspaces, setWorkspaceSessions, workspacePathKey]);

  const refreshQueue = useCallback(async (sid?: string, wid?: string) => {
    const id = wid || workspaceId;
    const s = sid || sessionRef.current?.id;
    if (!id || !s) return;
    try {
      const [count, prompts] = await Promise.all([
        api.getQueuedPromptCount(id, s),
        api.listQueuedPrompts(id, s),
      ]);
      setQueuedCount(count);
      setQueuedPrompts(prompts);
    } catch { /* ignore */ }
  }, [workspaceId]);

  const handleSSEEvent = useCallback((event: SSEPayload) => {
    if (!workspaceId) return;
    const { envelopeType, payload } = parseSSEEnvelope(event);
    const sid = sessionRef.current?.id;

    if (envelopeType === 'permission_request' && payload && typeof payload === 'object') {
      onPermissionRef.current?.(payload as PermissionRequest);
      return;
    }

    if (envelopeType === 'run_complete') {
      setIsBusy(false);
      if (sid) {
        markSessionStatus(sid, 'done');
        const busyKey = workspacePathKey(workspaceRef.current);
        if (busyKey) patchSessionBusy(busyKey, sid, false);
        refreshSessionData(sid, true);
        refreshQueue(sid, workspaceId);
      }
      refreshSessions();
      refreshMeta();
      return;
    }

    if (envelopeType === 'agent_event' && payload && typeof payload === 'object') {
      const ev = payload as { type?: string };
      if (ev.type === 'error') onToastRef.current?.('Agent 错误');
      return;
    }

    if (envelopeType === 'config_changed') {
      refreshMeta();
      return;
    }

    if (envelopeType === 'message') {
      const msg = messageFromSSE(event);
      if (!msg) return;
      if (msg.session_id === sid) {
        setMessages((prev) => upsertMessage(prev, msg));
        setIsBusy(!msg.finished);
        setError(null);
      }
      if (workspaceId) {
        if (msg.finished) {
          markSessionStatus(msg.session_id, 'done');
          const busyKey = workspacePathKey(workspaceRef.current);
          if (busyKey) patchSessionBusy(busyKey, msg.session_id, false);
          refreshSessions(workspaceId);
          refreshQueue(msg.session_id, workspaceId);
        } else {
          markSessionStatus(msg.session_id, 'running');
          const busyKey = workspacePathKey(workspaceRef.current);
          if (busyKey) patchSessionBusy(busyKey, msg.session_id, true);
        }
      }
      return;
    }

    if (envelopeType === 'session') {
      const payloadSid = payload && typeof payload === 'object'
        ? String((payload as { id?: string }).id || sid || '')
        : sid;
      if (payloadSid && workspaceId) {
        refreshSessions(workspaceId);
      }
      if (sid) {
        refreshSessionData(sid, false);
        refreshSessions(workspaceId);
      }
    }
  }, [workspaceId, refreshSessionData, refreshMeta, refreshSessions, markSessionStatus, patchSessionBusy, workspacePathKey, refreshQueue]);

  const refreshWorkspaces = useCallback(async () => {
    const list = await api.getWorkspaces();
    setWorkspaces(mergeWorkspaces(list));
    return list;
  }, []);

  const ensureWorkspaceRunning = useCallback(async (target: Workspace): Promise<Workspace> => {
    const running = await api.getWorkspaces();
    const norm = normalizeWorkspacePath(target.path);
    const live = running.find((r) => normalizeWorkspacePath(r.path) === norm);
    if (live) {
      rememberWorkspace(live);
      return live;
    }
    const created = await api.createWorkspace(target.path, clientId);
    rememberWorkspace(created);
    return created;
  }, [clientId]);

  const fetchSessionsMap = useCallback(async (wsList: Workspace[]) => {
    if (!wsList.length) return {} as Record<string, Session[]>;
    const entries = await Promise.all(
      wsList.map(async (w) => {
        const key = normalizeWorkspacePath(w.path);
        let live = w;
        if (isPathWorkspaceId(w.id)) {
          try {
            live = await ensureWorkspaceRunning(w);
          } catch {
            return [key, [] as Session[]] as const;
          }
        }
        try {
          return [key, await api.getSessions(live.id)] as const;
        } catch {
          return [key, [] as Session[]] as const;
        }
      }),
    );
    const map: Record<string, Session[]> = {};
    for (const [key, sess] of entries) map[key] = sess;
    return map;
  }, [ensureWorkspaceRunning]);

  const refreshAllSessions = useCallback(async (wsList?: Workspace[]) => {
    const list = wsList ?? workspaces;
    if (!list.length) return;
    const map = await fetchSessionsMap(list);
    setSessionsByWorkspace((prev) => ({ ...prev, ...map }));
    setWorkspaces(mergeWorkspaces(await api.getWorkspaces()));
  }, [workspaces, fetchSessionsMap]);

  /** Fill placeholder titles from the first user message in each session. */
  const backfillSessionTitles = useCallback(async (
    wsList: Workspace[],
    sessionsMap: Record<string, Session[]>,
  ) => {
    const tasks: { ws: Workspace; session: Session; pathKey: string }[] = [];
    for (const ws of wsList) {
      const pathKey = normalizeWorkspacePath(ws.path);
      for (const s of sessionsMap[pathKey] ?? []) {
        if (isDefaultSessionTitle(s.title) && !s.title_overridden) {
          tasks.push({ ws, session: s, pathKey });
        }
      }
    }
    if (!tasks.length) return;

    const updates: { pathKey: string; sessionId: string; title: string }[] = [];
    const batch = tasks.slice(0, 24);

    await Promise.all(batch.map(async ({ ws, session, pathKey }) => {
      let wsId = ws.id;
      if (isPathWorkspaceId(wsId)) {
        try {
          const live = await ensureWorkspaceRunning(ws);
          wsId = live.id;
        } catch {
          return;
        }
      }
      try {
        const userMsgs = await api.getUserMessages(wsId, session.id);
        const text = firstUserTextFromMessages(userMsgs);
        if (!text) return;
        const newTitle = titleFromFirstMessage(text);
        await api.saveSession(wsId, { ...session, title: newTitle });
        updates.push({ pathKey, sessionId: session.id, title: newTitle });
      } catch { /* ignore */ }
    }));

    if (!updates.length) return;

    setSessionsByWorkspace((prev) => {
      const next = { ...prev };
      for (const u of updates) {
        const list = next[u.pathKey];
        if (!list) continue;
        next[u.pathKey] = list.map((s) =>
          s.id === u.sessionId ? { ...s, title: u.title } : s,
        );
      }
      return next;
    });

    const curId = sessionRef.current?.id;
    const hit = updates.find((u) => u.sessionId === curId);
    if (hit) {
      setSession((s) => (s ? { ...s, title: hit.title } : s));
    }
  }, [ensureWorkspaceRunning, setSessionsByWorkspace]);

  const resolveWorkspaceTarget = useCallback((id: string, merged: Workspace[]): Workspace | null => {
    const direct = merged.find((w) => w.id === id);
    if (direct) return direct;
    const known = findKnownWorkspaceById(id);
    if (known) return { id: workspacePathId(known.path), path: known.path };
    return null;
  }, []);

  const activateWorkspace = useCallback(async (ws: Workspace, sessionIdHint?: string) => {
    rememberWorkspace(ws);
    api.setLastWorkspaceId(ws.id, ws.path);
    setWorkspace(ws);
    setError(null);
    setMessages([]);
    try { await api.initAgent(ws.id); } catch { /* already init */ }
    const [list, initNeeded] = await Promise.all([
      api.getSessions(ws.id),
      api.projectNeedsInit(ws.id).catch(() => false),
    ]);
    setWorkspaceSessions(workspacePathKey(ws) || normalizeWorkspacePath(ws.path), list);
    setNeedsInit(initNeeded);
    setMessages([]);
    setIsBusy(false);

    const savedId = sessionIdHint || api.getLastSessionId(ws.id, ws.path);
    const target = savedId && list.some((s) => s.id === savedId) ? savedId : list[0]?.id;
    if (target) {
      const s = list.find((item) => item.id === target)!;
      setSession(s);
      api.setLastSessionId(ws.id, target, ws.path);
      await api.setCurrentSession(ws.id, target, clientId);
      await refreshSessionData(target, true, ws.id);
      if (s.is_busy) markSessionStatus(target, 'running');
    } else {
      setSession(null);
    }
    await refreshMeta(ws.id);
  }, [clientId, refreshSessionData, refreshMeta, setWorkspaceSessions, markSessionStatus, workspacePathKey]);

  const switchWorkspace = useCallback(async (id: string) => {
    if (id === workspaceId) return;
    const merged = mergeWorkspaces(await api.getWorkspaces());
    const target = resolveWorkspaceTarget(id, merged);
    if (!target) return;
    const live = await ensureWorkspaceRunning(target);
    setWorkspaces(mergeWorkspaces(await api.getWorkspaces()));
    await activateWorkspace(live);
  }, [workspaceId, activateWorkspace, ensureWorkspaceRunning, resolveWorkspaceTarget]);

  const openWorkspaceFolder = useCallback(async (path: string) => {
    const trimmed = path.trim();
    if (!trimmed) return;
    const merged = mergeWorkspaces(await api.getWorkspaces());
    const norm = normalizeWorkspacePath(trimmed);
    let target = merged.find(
      (w) => normalizeWorkspacePath(w.path) === norm,
    );
    if (!target) {
      target = { id: workspacePathId(trimmed), path: trimmed };
    }
    const live = await ensureWorkspaceRunning(target);
    const list = mergeWorkspaces(await api.getWorkspaces());
    setWorkspaces(list);
    await refreshAllSessions(list);
    await activateWorkspace(live);
  }, [ensureWorkspaceRunning, activateWorkspace, refreshAllSessions]);

  const { connected: sseConnected } = useSSE(workspaceId, clientId, handleSSEEvent);

  // Bootstrap once per clientId — callbacks via refs to avoid re-init loops.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        const workspacesList = mergeWorkspaces(await api.getWorkspaces());
        if (cancelled) return;
        setWorkspaces(workspacesList);

        const savedPath = api.getLastWorkspacePath();
        const savedWsId = api.getLastWorkspaceId();
        let wsTarget: Workspace | null = null;
        if (savedPath) {
          const norm = normalizeWorkspacePath(savedPath);
          wsTarget = workspacesList.find((w) => normalizeWorkspacePath(w.path) === norm) ?? null;
        }
        if (!wsTarget && savedWsId) {
          wsTarget = resolveWorkspaceTarget(savedWsId, workspacesList);
        }
        if (!wsTarget && workspacesList.length > 0) {
          wsTarget = workspacesList[0];
        }
        if (!wsTarget) {
          const created = await api.createWorkspace('.', clientId);
          rememberWorkspace(created);
          wsTarget = created;
        }

        const live = await ensureWorkspaceRunning(wsTarget);
        const finalList = mergeWorkspaces(await api.getWorkspaces());
        if (cancelled) return;
        setWorkspaces(finalList);

        const allSessions = await fetchSessionsMap(finalList);
        if (cancelled) return;
        setSessionsByWorkspace(allSessions);

        void backfillSessionTitles(finalList, allSessions);

        for (const sess of Object.values(allSessions)) {
          for (const s of sess) {
            if (s.is_busy) markSessionStatus(s.id, 'running');
          }
        }

        const list = allSessions[normalizeWorkspacePath(live.path)] ?? [];
        const initNeeded = await api.projectNeedsInit(live.id).catch(() => false);
        if (cancelled) return;
        setNeedsInit(initNeeded);

        const savedSessionId = api.getLastSessionId(live.id, live.path);
        const target = savedSessionId && list.some((s) => s.id === savedSessionId)
          ? savedSessionId
          : list[0]?.id;

        api.setLastWorkspaceId(live.id, live.path);
        setWorkspace(live);
        try { await api.initAgent(live.id); } catch { /* already init */ }

        if (target) {
          const s = list.find((item) => item.id === target)!;
          setSession(s);
          api.setLastSessionId(live.id, target, live.path);
          await api.setCurrentSession(live.id, target, clientId);
          await refreshSessionData(target, true, live.id);
          if (s.is_busy) markSessionStatus(target, 'running');
        } else {
          setSession(null);
          setMessages([]);
        }
        await refreshMeta(live.id);

        const onboarded = localStorage.getItem('crush-web-onboarded') === '1';
        onLifecycleRef.current?.({
          needsOnboarding: !onboarded,
          needsInit: initNeeded,
          noSession: list.length === 0,
        });
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap runs once per clientId
  }, [clientId]);

  const ensureSession = useCallback(async (): Promise<Session> => {
    if (!workspaceId) throw new Error('无 workspace');
    if (session) return session;
    const s = await api.createSession(workspaceId, '新会话');
    setSession(s);
    await api.setCurrentSession(workspaceId, s.id, clientId);
    await refreshSessions();
    return s;
  }, [workspaceId, session, clientId, refreshSessions]);

  const sendMessage = useCallback(async (text: string, attachments?: Attachment[]) => {
    if (!workspaceId) return;
    setError(null);
    try {
      const active = await ensureSession();
      const busy = isBusy || active.is_busy;
      if (busy) {
        await api.sendMessage(workspaceId, active.id, text, attachments);
        await refreshQueue(active.id, workspaceId);
        return;
      }
      const tempMsg: Message = {
        id: 'temp-' + Date.now(),
        session_id: active.id,
        role: 'user',
        content: [{ type: 'text', text }],
        created_at: Date.now(),
      };
      setMessages((prev) => [...prev, tempMsg]);
      setIsBusy(true);
      markSessionStatus(active.id, 'running');
      const busyKey = workspacePathKey(workspaceRef.current);
      if (busyKey) patchSessionBusy(busyKey, active.id, true);
      await api.sendMessage(workspaceId, active.id, text, attachments);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setIsBusy(false);
      if (sessionRef.current) {
        const busyKey = workspacePathKey(workspaceRef.current);
        if (busyKey) patchSessionBusy(busyKey, sessionRef.current.id, false);
      }
    }
  }, [workspaceId, ensureSession, markSessionStatus, patchSessionBusy, workspacePathKey, isBusy, refreshQueue, setWorkspaceSessions]);

  const runShell = useCallback(async (command: string) => {
    if (!workspaceId) return;
    setError(null);
    try {
      const active = await ensureSession();
      const result = await api.runShellCommand(workspaceId, active.id, command);
      const shellMsg: Message = {
        id: 'shell-' + Date.now(),
        session_id: active.id,
        role: 'user',
        content: [{
          type: 'shell',
          command,
          tool_output: result.output,
          exit_code: result.exit_code,
        }],
        created_at: Date.now(),
      };
      setMessages((prev) => [...prev, shellMsg]);
      await refreshSessionData(active.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [workspaceId, ensureSession, refreshSessionData]);

  const createNewSession = useCallback(async () => {
    if (!workspaceId) return;
    setSession(null);
    setMessages([]);
    setIsBusy(false);
    api.clearLastSessionId(workspaceId, workspaceRef.current?.path);
    try {
      await api.setCurrentSession(workspaceId, '', clientId);
    } catch { /* best-effort */ }
  }, [workspaceId, clientId]);

  const switchSession = useCallback(async (sessionId: string) => {
    if (!workspaceId) return;
    setError(null);
    setMessages([]);
    try {
      const s = await api.getSession(workspaceId, sessionId);
      setSession(s);
      api.setLastSessionId(workspaceId, sessionId, workspaceRef.current?.path);
      await api.setCurrentSession(workspaceId, sessionId, clientId);
      await refreshSessionData(sessionId);
      await refreshQueue(sessionId);
      if (s.is_busy) markSessionStatus(sessionId, 'running');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [workspaceId, clientId, refreshSessionData, markSessionStatus, refreshQueue]);

  const switchToSession = useCallback(async (wid: string, sessionId: string) => {
    if (!wid || !sessionId) return;
    setError(null);
    if (wid !== workspaceId) {
      const merged = mergeWorkspaces(await api.getWorkspaces());
      const target = resolveWorkspaceTarget(wid, merged);
      if (!target) return;
      const live = await ensureWorkspaceRunning(target);
      setWorkspaces(mergeWorkspaces(await api.getWorkspaces()));
      await activateWorkspace(live, sessionId);
      return;
    }
    await switchSession(sessionId);
  }, [workspaceId, activateWorkspace, switchSession, ensureWorkspaceRunning, resolveWorkspaceTarget]);

  const renameSession = useCallback(async (sessionId: string, title: string, wid?: string) => {
    const merged = mergeWorkspaces(await api.getWorkspaces());
    const targetId = wid || workspaceId;
    if (!targetId) return;
    const target = resolveWorkspaceTarget(targetId, merged)
      || (workspaceRef.current?.id === targetId ? workspaceRef.current : null);
    if (!target) return;
    const live = await ensureWorkspaceRunning(target);

    const updated = await api.renameSession(live.id, sessionId, title.trim());
    const list = await api.getSessions(live.id);
    const key = workspacePathKey(live);
    if (key) setWorkspaceSessions(key, list);
    if (session?.id === sessionId && workspaceRef.current?.id === live.id) {
      setSession(updated);
    }
  }, [workspaceId, session?.id, setWorkspaceSessions, workspacePathKey, ensureWorkspaceRunning, resolveWorkspaceTarget]);

  const deleteSessionById = useCallback(async (sessionId: string, wid?: string) => {
    const merged = mergeWorkspaces(await api.getWorkspaces());
    const targetId = wid || workspaceId;
    if (!targetId) return;
    const target = resolveWorkspaceTarget(targetId, merged)
      || (workspaceRef.current?.id === targetId ? workspaceRef.current : null);
    if (!target) return;
    const live = await ensureWorkspaceRunning(target);

    await api.deleteSession(live.id, sessionId);
    setSessionStatus((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    const list = await api.getSessions(live.id);
    const key = workspacePathKey(live);
    if (key) setWorkspaceSessions(key, list);
    setWorkspaces(mergeWorkspaces(await api.getWorkspaces()));

    const currentSid = sessionRef.current?.id;
    const currentWid = workspaceRef.current?.id;
    if (currentWid === live.id && currentSid === sessionId) {
      if (list.length > 0) {
        await switchSession(list[0].id);
      } else {
        setSession(null);
        setMessages([]);
        api.clearLastSessionId(live.id, live.path);
      }
    }
  }, [workspaceId, setWorkspaceSessions, switchSession, ensureWorkspaceRunning, resolveWorkspaceTarget, workspacePathKey]);

  const updateTodo = useCallback(async (index: number, status: string) => {
    if (!workspaceId || !session?.todos) return;
    const todos: Todo[] = session.todos.map((t, i) =>
      i === index ? { ...t, status } : t,
    );
    const updated = await api.saveSession(workspaceId, { ...session, todos });
    setSession(updated);
  }, [workspaceId, session]);

  const cancel = useCallback(async () => {
    if (!workspaceId || !session) return;
    try {
      if (queuedCount > 0) {
        await api.clearQueue(workspaceId, session.id);
        setQueuedCount(0);
        setQueuedPrompts([]);
        return;
      }
      await api.cancelSession(workspaceId, session.id);
      setIsBusy(false);
      markSessionStatus(session.id, 'done');
      const busyKey = workspacePathKey(workspaceRef.current);
      if (busyKey) patchSessionBusy(busyKey, session.id, false);
      await refreshSessions();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [workspaceId, session, queuedCount, markSessionStatus, patchSessionBusy, refreshSessions]);

  const clearQueue = useCallback(async () => {
    if (!workspaceId || !session) return;
    await api.clearQueue(workspaceId, session.id);
    setQueuedCount(0);
    setQueuedPrompts([]);
  }, [workspaceId, session]);

  const summarize = useCallback(async () => {
    if (!workspaceId || !session) return;
    await api.summarizeSession(workspaceId, session.id);
    await refreshSessionData(session.id);
  }, [workspaceId, session, refreshSessionData]);

  const grantPermission = useCallback(async () => {
    /* handled via AppShell + grantPermissionAction */
  }, []);

  const refreshAgent = useCallback(async () => {
    if (!workspaceId) return;
    await api.updateAgent(workspaceId);
    await refreshMeta();
  }, [workspaceId, refreshMeta]);

  const switchModel = useCallback(async (provider: string, model: string) => {
    if (!workspaceId) return;
    await api.setPreferredModel(workspaceId, provider, model);
    await api.updateAgent(workspaceId);
    await refreshMeta();
  }, [workspaceId, refreshMeta]);

  const setYoloMode = useCallback(async (enabled: boolean) => {
    if (!workspaceId) return;
    try {
      await api.setPermissionsSkip(workspaceId, enabled);
      setYolo(enabled);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [workspaceId]);

  const initializeProject = useCallback(async () => {
    if (!workspaceId) return;
    await api.markProjectInitialized(workspaceId);
    setNeedsInit(false);
    const prompt = await api.getInitPrompt(workspaceId);
    if (prompt) await sendMessage(prompt);
  }, [workspaceId, sendMessage]);

  return {
    workspace, workspaces, session, sessions, sessionsByWorkspace, sessionStatus,
    messages, files, skills, lsps, mcps,
    agentInfo, config, queuedCount, queuedPrompts,
    isBusy, yolo, needsInit, error, cwd: workspace?.path || '', sseConnected, clientId,
    sendMessage, runShell, createNewSession, switchSession, switchToSession,
    renameSession, deleteSessionById,
    updateTodo, cancel, clearQueue, summarize, grantPermission, refreshAgent, refreshConfig: refreshMeta,
    switchModel, switchWorkspace, openWorkspaceFolder,
    setYolo: setYoloMode, initializeProject, refreshSessions, refreshAllSessions,
    clearError: () => setError(null),
    bootstrapping,
  };
}
