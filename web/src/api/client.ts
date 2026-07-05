import { normalizeWorkspacePath } from './workspaceRegistry';

const BASE = '/v1';
const CLIENT_ID_KEY = 'crush-client-id';
const LAST_WORKSPACE_KEY = 'crush-web-last-workspace-id';
const LAST_WORKSPACE_PATH_KEY = 'crush-web-last-workspace-path';

const lastSessionKeyByPath = (path: string) =>
  `crush-web-last-session-path-${normalizeWorkspacePath(path)}`;
const lastSessionKeyById = (workspaceId: string) => `crush-web-last-session-${workspaceId}`;

interface RawPart {
  type: string;
  data: Record<string, unknown>;
}

export interface Workspace {
  id: string;
  path: string;
  client_id?: string;
}

export interface Todo {
  content: string;
  status: string;
  active_form?: string;
}

export interface Session {
  id: string;
  title: string;
  title_source?: string;
  title_overridden?: boolean;
  searchable_text?: string;
  cost: number;
  completion_tokens: number;
  prompt_tokens: number;
  estimated_usage?: number;
  created_at: number;
  updated_at: number;
  todos?: Todo[];
  is_busy?: boolean;
}

export interface MessageContent {
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'shell';
  text?: string;
  tool_name?: string;
  tool_call_id?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  status?: string;
  command?: string;
  exit_code?: number;
  thinking_finished?: boolean;
  thinking_started_at?: number;
  thinking_finished_at?: number;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: MessageContent[];
  created_at: number;
  finished?: boolean;
}

export interface AgentInfo {
  is_busy: boolean;
  is_ready: boolean;
  model: { id: string; name: string; context_window?: number };
  model_cfg: {
    model: string;
    provider: string;
    think?: boolean;
    reasoning_effort?: string;
  };
}

export interface LSPInfo {
  name: string;
  state: string;
  diagnostic_count?: number;
  error?: string;
}

export interface MCPInfo {
  name: string;
  state: string;
  tools?: number;
  prompts?: number;
  resources?: number;
}

export interface PermissionRequest {
  id: string;
  session_id: string;
  tool_call_id: string;
  tool_name: string;
  description: string;
  action: string;
  params?: unknown;
  path?: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  context_window?: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  base_url?: string;
  type?: string;
  api_key?: string;
  disable?: boolean;
  models?: ProviderModel[];
  discover_models?: boolean;
  system_prompt_prefix?: string;
}

export interface WorkspaceConfig {
  models?: { large?: { model?: string; provider?: string }; small?: { model?: string; provider?: string } };
  providers?: Record<string, ProviderConfig>;
  options?: { yolo?: boolean };
}

export type ConfigScope = 0 | 1;

export const PROVIDER_TYPES: Array<{ value: string; label: string }> = [
  { value: 'openai-compat', label: 'OpenAI 兼容 (/v1/chat/completions)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'vercel', label: 'Vercel AI Gateway' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'google-vertex', label: 'Google Vertex' },
  { value: 'hyper', label: 'Hyper' },
  { value: 'litellm', label: 'LiteLLM' },
  { value: 'llamacpp', label: 'llama.cpp' },
  { value: 'lmstudio', label: 'LM Studio' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'omlx', label: 'OMLX' },
];

export interface Attachment {
  file_path: string;
  file_name: string;
  mime_type: string;
  content: string;
}

export interface SSEPayload {
  type: string;
  payload: unknown;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function getLastWorkspaceId(): string | null {
  return localStorage.getItem(LAST_WORKSPACE_KEY);
}

export function getLastWorkspacePath(): string | null {
  return localStorage.getItem(LAST_WORKSPACE_PATH_KEY);
}

export function setLastWorkspaceId(id: string, path?: string): void {
  localStorage.setItem(LAST_WORKSPACE_KEY, id);
  if (path) {
    localStorage.setItem(LAST_WORKSPACE_PATH_KEY, normalizeWorkspacePath(path));
  }
}

/** Last session for a workspace, keyed by stable path (falls back to legacy id key). */
export function getLastSessionId(workspaceId: string, workspacePath?: string): string | null {
  if (workspacePath) {
    const byPath = localStorage.getItem(lastSessionKeyByPath(workspacePath));
    if (byPath) return byPath;
  }
  return localStorage.getItem(lastSessionKeyById(workspaceId));
}

export function setLastSessionId(
  workspaceId: string,
  sessionId: string,
  workspacePath?: string,
): void {
  localStorage.setItem(lastSessionKeyById(workspaceId), sessionId);
  if (workspacePath) {
    localStorage.setItem(lastSessionKeyByPath(workspacePath), sessionId);
  }
}

export function clearLastSessionId(workspaceId: string, workspacePath?: string): void {
  localStorage.removeItem(lastSessionKeyById(workspaceId));
  if (workspacePath) {
    localStorage.removeItem(lastSessionKeyByPath(workspacePath));
  }
}

export function normalizeMessage(raw: Record<string, unknown>): Message {
  const parts = (raw.parts || []) as RawPart[];
  const content: MessageContent[] = [];

  for (const part of parts) {
    const data = part.data || {};
    switch (part.type) {
      case 'text':
        content.push({ type: 'text', text: String(data.text || '') });
        break;
      case 'reasoning': {
        const finishedAt = Number(data.finished_at ?? 0);
        content.push({
          type: 'thinking',
          text: String(data.thinking || ''),
          thinking_finished: finishedAt > 0,
          thinking_started_at: Number(data.started_at ?? 0) || undefined,
          thinking_finished_at: finishedAt || undefined,
        });
        break;
      }
      case 'tool_call': {
        let toolInput: Record<string, unknown> = {};
        if (typeof data.input === 'string' && data.input) {
          try { toolInput = JSON.parse(data.input); } catch { toolInput = { raw: data.input }; }
        } else if (data.input && typeof data.input === 'object') {
          toolInput = data.input as Record<string, unknown>;
        }
        content.push({
          type: 'tool_call',
          tool_call_id: String(data.id || ''),
          tool_name: String(data.name || 'unknown'),
          tool_input: toolInput,
          status: data.finished ? 'done' : 'running',
        });
        break;
      }
      case 'tool_result':
        content.push({
          type: 'tool_result',
          tool_call_id: String(data.tool_call_id || ''),
          tool_name: String(data.name || 'unknown'),
          tool_output: String(data.content || data.data || ''),
          status: data.is_error ? 'error' : 'done',
        });
        break;
      case 'shell_command':
        content.push({
          type: 'shell',
          command: String(data.command || ''),
          tool_output: String(data.output || ''),
          exit_code: Number(data.exit_code ?? 0),
        });
        break;
      default:
        break;
    }
  }

  const finished = parts.some((p) => p.type === 'finish');

  return {
    id: String(raw.id || ''),
    session_id: String(raw.session_id || ''),
    role: raw.role as Message['role'],
    content,
    created_at: Number(raw.created_at || 0),
    finished,
  };
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'Failed to fetch') {
      throw new Error('无法连接 Crush API，请确认 crush server 已启动（端口 7600）');
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 502) {
      throw new Error('Crush API 未运行（502）。请执行 .\\scripts\\start-gui.ps1 或 .\\scripts\\start-web.ps1');
    }
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204 || res.status === 202) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`无效的 JSON 响应: ${text.slice(0, 120)}`);
  }
}

export async function getWorkspaces(): Promise<Workspace[]> {
  const data = await jsonFetch<Array<Workspace & Record<string, unknown>>>(`${BASE}/workspaces`);
  return data.map((ws) => ({ id: String(ws.id), path: String(ws.path || '.') }));
}

export async function createWorkspace(path: string, clientId?: string): Promise<Workspace> {
  return jsonFetch(`${BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, client_id: clientId || getClientId() }),
  });
}

export async function initAgent(workspaceId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/agent/init`, { method: 'POST' });
}

export async function getAgentInfo(workspaceId: string): Promise<AgentInfo> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/agent`);
}

export async function updateAgent(workspaceId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/agent/update`, { method: 'POST' });
}

export async function setPreferredModel(
  workspaceId: string,
  provider: string,
  model: string,
  modelType: 'large' | 'small' = 'large',
  scope: 0 | 1 = 0,
): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/config/model`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope,
      model_type: modelType,
      model: { provider, model },
    }),
  });
}

export async function getWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfig> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/config`);
}

export async function getProviders(workspaceId: string): Promise<Record<string, ProviderConfig>> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/providers`);
}

export async function setConfigField(
  workspaceId: string,
  key: string,
  value: unknown,
  scope: ConfigScope = 0,
): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/config/set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, key, value }),
  });
}

export async function removeConfigField(
  workspaceId: string,
  key: string,
  scope: ConfigScope = 0,
): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/config/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, key }),
  });
}

export async function setProviderAPIKey(
  workspaceId: string,
  providerId: string,
  apiKey: string,
  scope: ConfigScope = 0,
): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/config/provider-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope,
      provider_id: providerId,
      kind: 'string',
      api_key: apiKey,
    }),
  });
}

export async function saveProviderConfig(
  workspaceId: string,
  provider: ProviderConfig,
  apiKey?: string,
  scope: ConfigScope = 0,
): Promise<void> {
  const payload: ProviderConfig = {
    id: provider.id,
    name: provider.name,
    base_url: provider.base_url,
    type: provider.type || 'openai-compat',
    disable: provider.disable ?? false,
    models: provider.models ?? [],
    discover_models: provider.discover_models ?? false,
  };
  if (provider.system_prompt_prefix) {
    payload.system_prompt_prefix = provider.system_prompt_prefix;
  }
  await setConfigField(workspaceId, `providers.${provider.id}`, payload, scope);
  if (apiKey !== undefined && apiKey.trim() !== '') {
    await setProviderAPIKey(workspaceId, provider.id, apiKey.trim(), scope);
  }
}

export async function deleteProviderConfig(
  workspaceId: string,
  providerId: string,
  scope: ConfigScope = 0,
): Promise<void> {
  await removeConfigField(workspaceId, `providers.${providerId}`, scope);
}

export async function getSessions(workspaceId: string): Promise<Session[]> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/sessions`);
}

export async function getSession(workspaceId: string, sessionId: string): Promise<Session> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/sessions/${sessionId}`);
}

export async function createSession(workspaceId: string, title?: string): Promise<Session> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title || '新会话' }),
  });
}

export async function saveSession(workspaceId: string, session: Session): Promise<Session> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/sessions/${session.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
}

export async function renameSession(
  workspaceId: string,
  sessionId: string,
  title: string,
): Promise<Session> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/sessions/${sessionId}/title`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

export async function deleteSession(workspaceId: string, sessionId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function setCurrentSession(workspaceId: string, sessionId: string, clientId?: string): Promise<void> {
  const cid = clientId || getClientId();
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/current-session?client_id=${cid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
}

export async function getMessages(workspaceId: string, sessionId: string): Promise<Message[]> {
  const raw: Record<string, unknown>[] = await jsonFetch(
    `${BASE}/workspaces/${workspaceId}/sessions/${sessionId}/messages`,
  );
  return raw.map(normalizeMessage);
}

export async function getUserMessages(workspaceId: string, sessionId: string): Promise<Message[]> {
  const raw: Record<string, unknown>[] = await jsonFetch(
    `${BASE}/workspaces/${workspaceId}/sessions/${sessionId}/messages/user`,
  );
  return raw.map(normalizeMessage);
}

export async function sendMessage(
  workspaceId: string,
  sessionId: string,
  prompt: string,
  attachments?: Attachment[],
): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, prompt, attachments: attachments || [] }),
  });
}

export async function setPermissionsSkip(workspaceId: string, skip: boolean): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/permissions/skip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skip }),
  });
}

export async function getPermissionsSkip(workspaceId: string): Promise<boolean> {
  const data = await jsonFetch<{ skip: boolean }>(`${BASE}/workspaces/${workspaceId}/permissions/skip`);
  return !!data.skip;
}

export async function projectNeedsInit(workspaceId: string): Promise<boolean> {
  const data = await jsonFetch<{ needs_init: boolean }>(`${BASE}/workspaces/${workspaceId}/project/needs-init`);
  return !!data.needs_init;
}

export async function markProjectInitialized(workspaceId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/project/init`, { method: 'POST' });
}

export async function getInitPrompt(workspaceId: string): Promise<string> {
  const data = await jsonFetch<{ prompt: string }>(`${BASE}/workspaces/${workspaceId}/project/init-prompt`);
  return data.prompt || '';
}

export async function runShellCommand(
  workspaceId: string,
  sessionId: string,
  command: string,
  termWidth = 80,
): Promise<{ output: string; exit_code: number }> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/agent/sessions/${sessionId}/shell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, term_width: termWidth }),
  });
}

export async function cancelSession(workspaceId: string, sessionId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/agent/sessions/${sessionId}/cancel`, { method: 'POST' });
}

export async function summarizeSession(workspaceId: string, sessionId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/agent/sessions/${sessionId}/summarize`, { method: 'POST' });
}

export async function getQueuedPromptCount(workspaceId: string, sessionId: string): Promise<number> {
  const data = await jsonFetch<number | { count?: number }>(
    `${BASE}/workspaces/${workspaceId}/agent/sessions/${sessionId}/prompts/queued`,
  );
  if (typeof data === 'number') return data;
  return data?.count ?? 0;
}

export async function listQueuedPrompts(workspaceId: string, sessionId: string): Promise<string[]> {
  const data = await jsonFetch<string[] | null>(
    `${BASE}/workspaces/${workspaceId}/agent/sessions/${sessionId}/prompts/list`,
  );
  return data ?? [];
}

export async function clearQueue(workspaceId: string, sessionId: string): Promise<void> {
  await jsonFetch(`${BASE}/workspaces/${workspaceId}/agent/sessions/${sessionId}/prompts/clear`, { method: 'POST' });
}

export async function grantPermission(
  workspaceId: string,
  permission: PermissionRequest,
  action: 'allow' | 'allow_session' | 'deny',
): Promise<boolean> {
  const data = await jsonFetch<{ resolved: boolean }>(`${BASE}/workspaces/${workspaceId}/permissions/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permission, action }),
  });
  return data.resolved;
}

export async function getFiles(workspaceId: string, sessionId: string): Promise<string[]> {
  try {
    const data = await jsonFetch<unknown>(`${BASE}/workspaces/${workspaceId}/sessions/${sessionId}/filetracker/files`);
    if (!Array.isArray(data)) return [];
    return data.map((f) => (typeof f === 'string' ? f : (f as { path: string }).path));
  } catch {
    return [];
  }
}

export async function getSkills(workspaceId: string): Promise<Array<{ name: string; description: string; state?: string }>> {
  try {
    return await jsonFetch(`${BASE}/workspaces/${workspaceId}/skills`);
  } catch {
    return [];
  }
}

export async function readSkill(
  workspaceId: string,
  skillId: string,
): Promise<{ content: string; name: string }> {
  const data = await jsonFetch<{ content: string; result: { name?: string } }>(
    `${BASE}/workspaces/${workspaceId}/skills/read`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_id: skillId }),
    },
  );
  const raw = data.content || '';
  let content = raw;
  try {
    content = atob(raw);
  } catch {
    /* already plain text */
  }
  return { content, name: data.result?.name || skillId };
}

export async function getLSPs(workspaceId: string): Promise<LSPInfo[]> {
  try {
    const data = await jsonFetch<Record<string, LSPInfo>>(`${BASE}/workspaces/${workspaceId}/lsps`);
    return Object.entries(data).map(([name, info]) => ({ ...info, name }));
  } catch {
    return [];
  }
}

export async function getMCPs(workspaceId: string): Promise<MCPInfo[]> {
  try {
    const data = await jsonFetch<Record<string, MCPInfo>>(`${BASE}/workspaces/${workspaceId}/mcp/states`);
    return Object.entries(data).map(([name, info]) => ({ ...info, name }));
  } catch {
    return [];
  }
}

export async function getLSPDiagnostics(workspaceId: string, lspName: string): Promise<unknown> {
  return jsonFetch(`${BASE}/workspaces/${workspaceId}/lsps/${lspName}/diagnostics`);
}

export function createEventSource(workspaceId: string, clientId?: string): EventSource {
  const cid = clientId || getClientId();
  return new EventSource(`${BASE}/workspaces/${workspaceId}/events?client_id=${cid}`);
}

/** Parse nested SSE pubsub envelope. */
export function parseSSEEnvelope(data: SSEPayload): {
  envelopeType: string;
  eventType: string;
  payload: unknown;
} {
  const envelopeType = data.type;
  const inner = data.payload;
  if (inner && typeof inner === 'object' && 'type' in inner && 'payload' in inner) {
    return {
      envelopeType,
      eventType: String((inner as { type: string }).type),
      payload: (inner as { payload: unknown }).payload,
    };
  }
  return { envelopeType, eventType: envelopeType, payload: inner };
}

/** Extract a normalized message from an SSE payload, if present. */
export function messageFromSSE(data: SSEPayload): Message | null {
  const { envelopeType, payload } = parseSSEEnvelope(data);
  if (envelopeType !== 'message' || !payload || typeof payload !== 'object') return null;
  return normalizeMessage(payload as Record<string, unknown>);
}
