import { useEffect, useMemo, useState, useCallback } from 'react';

import { pantera } from '../../theme/pantera';

import { useCrush, grantPermissionAction } from '../../context/CrushContext';

import { useUi, sidebarColumnWidth } from '../state/store';

import { useKeyboard } from '../../hooks/useKeyboard';

import { Header } from '../header/Header';

import { Sidebar } from '../sidebar/Sidebar';

import { SidebarRail } from '../sidebar/SidebarRail';
import { ChatMain } from '../layout/ChatMain';

import { StatusBar } from '../status/StatusBar';

import { ErrorBanner } from '../common/ErrorBanner';

import { SessionsDialog } from '../dialogs/SessionsDialog';

import { ModelsDialog } from '../dialogs/ModelsDialog';

import { CommandsDialog, type CommandItem } from '../dialogs/CommandsDialog';

import { PermissionsDialog } from '../dialogs/PermissionsDialog';

import { OnboardingDialog } from '../dialogs/OnboardingDialog';

import { InitializeDialog } from '../dialogs/InitializeDialog';

import { FilePickerDialog } from '../dialogs/FilePickerDialog';

import { SearchModal } from '../dialogs/SearchModal';

import { LandingView } from '../layout/LandingView';

import { CompletionsPopup, type CompletionItem } from '../completions/CompletionsPopup';

import { displaySessionTitle } from '../../api/sessionTitle';

import type { Attachment } from '../../api/client';

import * as api from '../../api/client';

import { attachmentFromText } from '../common/attachments';



const COMPACT_WIDTH = 960;



export function AppShell() {

  const crush = useCrush();

  const { state, dispatch } = useUi();

  const [editorValue, setEditorValue] = useState('');

  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);

  const [modelsTab, setModelsTab] = useState<'switch' | 'settings'>('switch');

  const topDialog = state.dialogStack[state.dialogStack.length - 1];



  useEffect(() => {

    dispatch({ type: 'SET_YOLO', yolo: crush.yolo });

  }, [crush.yolo, dispatch]);



  useEffect(() => {

    const check = () => {

      const compact = window.innerWidth < COMPACT_WIDTH;

      dispatch({ type: 'SET_COMPACT', compact });

    };

    check();

    window.addEventListener('resize', check);

    return () => window.removeEventListener('resize', check);

  }, [dispatch]);



  const toggleYolo = useCallback(async () => {

    const next = !crush.yolo;

    await crush.setYolo(next);

    dispatch({ type: 'SET_YOLO', yolo: next });

  }, [crush, dispatch]);



  const showToast = useCallback((msg: string) => {

    dispatch({ type: 'SET_TOAST', message: msg });

    setTimeout(() => dispatch({ type: 'SET_TOAST', message: null }), 4000);

  }, [dispatch]);



  const handleNewSession = useCallback(async () => {

    await crush.createNewSession();

    dispatch({ type: 'SET_UI_STATE', uiState: 'chat' });

  }, [crush, dispatch]);



  const handleSelectSession = useCallback(async (wid: string, id: string) => {

    await crush.switchToSession(wid, id);

    dispatch({ type: 'SET_UI_STATE', uiState: 'chat' });

  }, [crush, dispatch]);



  const handleDeleteSession = useCallback(async (wid: string, id: string, title: string) => {

    if (!window.confirm(`确定删除会话「${displaySessionTitle(title)}」？此操作不可恢复。`)) return;

    await crush.deleteSessionById(id, wid);

    showToast('会话已删除');

  }, [crush, showToast]);



  const handleRenameSession = useCallback(async (wid: string, id: string, title: string) => {

    const trimmed = title.trim();

    if (!trimmed) return;

    await crush.renameSession(id, trimmed, wid);

    showToast('会话已重命名');

  }, [crush, showToast]);



  const openSearch = useCallback(() => {
    dispatch({ type: 'OPEN_DIALOG', dialog: 'search' });
    crush.refreshAllSessions();
  }, [dispatch, crush]);

  const keyboardActions = useMemo(() => ({

    onCancel: () => crush.cancel(),

    onNewSession: () => { handleNewSession(); },

    onOpenSessions: () => dispatch({ type: 'OPEN_DIALOG', dialog: 'sessions' }),

    onOpenSearch: () => openSearch(),

    onOpenModels: () => { setModelsTab('switch'); dispatch({ type: 'OPEN_DIALOG', dialog: 'models' }); },

    onOpenCommands: () => dispatch({ type: 'OPEN_DIALOG', dialog: 'commands' }),

    onTogglePills: () => dispatch({ type: 'TOGGLE_PILLS' }),

    onToggleYolo: () => { toggleYolo(); },

    onOpenFilePicker: () => dispatch({ type: 'OPEN_DIALOG', dialog: 'filePicker' }),

  }), [crush, dispatch, toggleYolo, handleNewSession, openSearch]);



  const openModels = useCallback(() => {

    setModelsTab('switch');

    dispatch({ type: 'OPEN_DIALOG', dialog: 'models' });

  }, [dispatch]);



  const openModelSettings = useCallback(() => {

    setModelsTab('settings');

    dispatch({ type: 'OPEN_DIALOG', dialog: 'models' });

  }, [dispatch]);



  useKeyboard(keyboardActions, editorValue);



  const commands: CommandItem[] = useMemo(() => [

    { id: 'new', label: '新建会话', category: 'Session', action: () => { handleNewSession(); } },

    { id: 'sessions', label: '切换会话', category: 'Session', action: () => dispatch({ type: 'OPEN_DIALOG', dialog: 'sessions' }) },

    { id: 'summarize', label: '总结会话', category: 'Session', action: () => crush.summarize() },

    { id: 'models', label: '选择模型', category: 'Config', action: () => { setModelsTab('switch'); dispatch({ type: 'OPEN_DIALOG', dialog: 'models' }); } },

    { id: 'model-settings', label: '模型设置', category: 'Config', action: () => { setModelsTab('settings'); dispatch({ type: 'OPEN_DIALOG', dialog: 'models' }); } },

    { id: 'refresh', label: '刷新 Agent', category: 'Config', action: () => crush.refreshAgent() },

    { id: 'yolo', label: crush.yolo ? '关闭 YOLO' : '开启 YOLO', category: 'Config', action: () => toggleYolo() },

    { id: 'clear-queue', label: '清空队列', category: 'Agent', action: () => crush.clearQueue() },

    { id: 'cancel', label: '取消运行', category: 'Agent', action: () => crush.cancel() },

  ], [crush, dispatch, toggleYolo, handleNewSession]);



  const handleCompletionSelect = useCallback(async (item: CompletionItem) => {

    const atIdx = editorValue.lastIndexOf('@');

    if (atIdx < 0) return;

    const before = editorValue.slice(0, atIdx);

    const insertText = `@${item.label} `;

    setEditorValue(before + insertText);



    if (item.kind === 'skill' && crush.workspace) {

      try {

        const { content, name } = await api.readSkill(crush.workspace.id, item.value);

        setPendingAttachments((prev) => [...prev, attachmentFromText(name, content)]);

      } catch { /* ignore */ }

    }

  }, [editorValue, crush.workspace]);



  const modelName = crush.agentInfo?.model?.name || crush.agentInfo?.model_cfg?.model || '—';

  const tokens = (crush.session?.prompt_tokens || 0) + (crush.session?.completion_tokens || 0);

  const lspErrors = crush.lsps.reduce((n, l) => n + (l.diagnostic_count || 0), 0);

  const sidebarMode = state.compactMode ? 'hidden' : state.sidebarMode;
  const sidebarCol = sidebarColumnWidth(sidebarMode);
  const showSidebarColumn = sidebarCol !== null;

  const showDetailsOverlay = state.compactMode && state.detailsOpen;

  const yoloActive = crush.yolo || state.yolo;



  const closeDialog = () => dispatch({ type: 'CLOSE_DIALOG' });



  const gridAreas = (() => {
    if (crush.error) {
      return showSidebarColumn
        ? `"header header" "error error" "sidebar main" "status status"`
        : `"header header" "error error" "main main" "status status"`;
    }
    return showSidebarColumn
      ? `"header header" "sidebar main" "status status"`
      : `"header header" "main main" "status status"`;
  })();



  if (crush.error && !crush.workspace) {

    return (

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>

        <div style={{ color: pantera.error, fontSize: 14 }}>无法连接到 Crush</div>

        <div style={{ color: pantera.fgMostSubtle, fontSize: 12 }}>{crush.error}</div>

        <div style={{ color: pantera.fgMoreSubtle, fontSize: 11 }}>请运行 scripts/start-gui.ps1（桌面）或 start-web.ps1（浏览器）</div>

      </div>

    );

  }



  if (crush.bootstrapping) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 10,
        background: pantera.bgBase, color: pantera.fgMoreSubtle,
      }}>
        <style>{`@keyframes crush-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 20, color: pantera.busy, animation: 'crush-spin 0.9s linear infinite' }}>◌</span>
        <div style={{ fontSize: 13 }}>正在加载会话记录...</div>
      </div>
    );
  }



  if (state.uiState === 'onboarding') {

    return (

      <OnboardingDialog onContinue={() => {

        localStorage.setItem('crush-web-onboarded', '1');

        if (crush.needsInit) {

          dispatch({ type: 'SET_UI_STATE', uiState: 'initialize' });

        } else if (crush.sessions.length === 0) {

          dispatch({ type: 'SET_UI_STATE', uiState: 'landing' });

        } else {

          dispatch({ type: 'SET_UI_STATE', uiState: 'chat' });

        }

      }} />

    );

  }



  if (state.uiState === 'initialize') {

    return (

      <InitializeDialog

        onInitialize={async () => {

          await crush.initializeProject();

          dispatch({ type: 'SET_UI_STATE', uiState: crush.sessions.length > 0 ? 'chat' : 'landing' });

        }}

        onSkip={() => dispatch({ type: 'SET_UI_STATE', uiState: crush.sessions.length > 0 ? 'chat' : 'landing' })}

      />

    );

  }



  if (state.uiState === 'landing') {

    return (

      <LandingView
        onNewSession={() => { handleNewSession(); }}
        workspaces={crush.workspaces}
        onSelectWorkspace={(id) => {
          crush.switchWorkspace(id).then(() => {
            dispatch({ type: 'SET_UI_STATE', uiState: 'chat' });
          });
        }}
        onOpenFolder={async () => {
          let path: string | null = null;
          if (window.crushDesktop?.pickFolder) {
            path = await window.crushDesktop.pickFolder();
          }
          if (!path) {
            path = window.prompt('输入项目文件夹路径')?.trim() || null;
          }
          if (path) {
            await crush.openWorkspaceFolder(path);
            dispatch({ type: 'SET_UI_STATE', uiState: 'chat' });
          }
        }}
      />

    );

  }



  return (

    <>

      <div style={{

        display: 'grid',

        gridTemplateAreas: gridAreas,

        gridTemplateRows: crush.error ? '40px auto 1fr 24px' : '40px 1fr 24px',

        gridTemplateColumns: showSidebarColumn ? `${sidebarCol} 1fr` : '1fr',

        height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative',

      }}>

        <Header

          session={crush.session}

          modelName={modelName}

          compact={state.compactMode}

          cwd={crush.cwd}

          contextUsed={tokens}

          contextWindow={crush.agentInfo?.model?.context_window}

          lspErrors={lspErrors}

          onToggleSidebar={() => dispatch({ type: 'CYCLE_SIDEBAR_MODE' })}

          sidebarMode={sidebarMode}

          onToggleDetails={() => dispatch({ type: 'TOGGLE_DETAILS' })}

        />

        {crush.error && <ErrorBanner message={crush.error} onDismiss={crush.clearError} />}

        {state.toast && (

          <div style={{

            gridColumn: '1 / -1', padding: '6px 12px', background: pantera.info + '30',

            color: pantera.info, fontSize: 11, textAlign: 'center',

          }}>{state.toast}</div>

        )}

        {sidebarMode === 'expanded' && (
          <Sidebar
            workspaces={crush.workspaces}
            workspaceId={crush.workspace?.id ?? null}
            session={crush.session}
            sessionsByWorkspace={crush.sessionsByWorkspace}
            sessionStatus={crush.sessionStatus}
            agentInfo={crush.agentInfo}
            onOpenModelSettings={openModelSettings}
            onOpenSearch={openSearch}
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
            onSelectWorkspace={(id) => crush.switchWorkspace(id)}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />
        )}

        {sidebarMode === 'rail' && (
          <SidebarRail
            workspacePath={crush.cwd}
            workspaces={crush.workspaces}
            onExpandSidebar={() => dispatch({ type: 'SET_SIDEBAR_MODE', mode: 'expanded' })}
            onNewSession={handleNewSession}
            onOpenSearch={openSearch}
            onOpenModelSettings={openModelSettings}
            onSelectWorkspace={(id) => crush.switchWorkspace(id)}
          />
        )}

        <ChatMain

          messages={crush.messages}

          isBusy={crush.isBusy}

          chatFocused={state.focus === 'chat'}

          editorFocused={state.focus === 'editor'}

          editorValue={editorValue}

          onEditorChange={setEditorValue}

          onSend={crush.sendMessage}

          onShell={crush.runShell}

          yolo={yoloActive}

          onOpenCommands={() => dispatch({ type: 'OPEN_DIALOG', dialog: 'commands' })}

          onOpenFilePicker={() => dispatch({ type: 'OPEN_DIALOG', dialog: 'filePicker' })}

          attachments={pendingAttachments}

          onAttachmentsChange={setPendingAttachments}

          config={crush.config}

          currentProvider={crush.agentInfo?.model_cfg?.provider}

          currentModel={crush.agentInfo?.model_cfg?.model}

          onSwitchModel={(p, m) => crush.switchModel(p, m)}

          onOpenModelSettings={openModelSettings}

          workspaces={crush.workspaces}

          workspaceId={crush.workspace?.id}

          workspacePath={crush.cwd}

          onSwitchWorkspace={(id) => crush.switchWorkspace(id)}

          onOpenWorkspaceFolder={(path) => crush.openWorkspaceFolder(path)}

          todos={crush.session?.todos || []}

          queuedCount={crush.queuedCount}

          queuedPrompts={crush.queuedPrompts}

          pillsExpanded={state.pillsExpanded}

          onToggleTodo={(index, status) => crush.updateTodo(index, status)}

          onClearQueue={() => crush.clearQueue()}

          skills={crush.skills}

          modelName={modelName}

        />

        <StatusBar

          session={crush.session}

          sseConnected={crush.sseConnected}

          focus={state.focus}

          isBusy={crush.isBusy}

          queuedCount={crush.queuedCount}

          fullHelp={state.fullHelp}

          yolo={yoloActive}

          contextWindow={crush.agentInfo?.model?.context_window}

        />

      </div>



      {showDetailsOverlay && (

        <div style={{

          position: 'fixed', top: 40, left: 0, right: 0, bottom: 0,

          background: pantera.bgBase, zIndex: 50, overflow: 'auto',

        }}>

          <Sidebar
            workspaces={crush.workspaces}
            workspaceId={crush.workspace?.id ?? null}
            session={crush.session}
            sessionsByWorkspace={crush.sessionsByWorkspace}
            sessionStatus={crush.sessionStatus}
            agentInfo={crush.agentInfo}
            compact
            onOpenModelSettings={openModelSettings}
            onOpenSearch={openSearch}
            onNewSession={handleNewSession}
            onSelectSession={handleSelectSession}
            onSelectWorkspace={(id) => crush.switchWorkspace(id)}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />

        </div>

      )}



      {topDialog === 'search' && (
        <SearchModal
          workspaces={crush.workspaces}
          sessionsByWorkspace={crush.sessionsByWorkspace}
          currentSessionId={crush.session?.id}
          onSelect={(wid, sid) => handleSelectSession(wid, sid)}
          onClose={closeDialog}
        />
      )}

      {topDialog === 'sessions' && (

        <SessionsDialog

          sessions={crush.sessions}

          currentId={crush.session?.id}

          onSelect={(id) => handleSelectSession(crush.workspace!.id, id)}

          onCreate={handleNewSession}

          onDelete={(id) => {
            const title = crush.sessions.find((s) => s.id === id)?.title || '';
            handleDeleteSession(crush.workspace!.id, id, title);
          }}

          onRename={(id, title) => crush.renameSession(id, title)}

          onClose={closeDialog}

        />

      )}

      {topDialog === 'models' && crush.workspace && (

        <ModelsDialog

          workspaceId={crush.workspace.id}

          config={crush.config}

          currentModel={crush.agentInfo?.model_cfg?.model}

          currentProvider={crush.agentInfo?.model_cfg?.provider}

          onSelect={(provider, model) => crush.switchModel(provider, model)}

          onRefresh={() => crush.refreshConfig()}

          onError={(msg) => showToast(msg)}

          onSuccess={(msg) => showToast(msg)}

          initialTab={modelsTab}

          onClose={closeDialog}

        />

      )}

      {topDialog === 'commands' && (

        <CommandsDialog commands={commands} onClose={closeDialog} />

      )}

      {topDialog === 'filePicker' && (

        <FilePickerDialog

          onSelect={(atts) => setPendingAttachments((prev) => [...prev, ...atts])}

          onClose={closeDialog}

        />

      )}

      {topDialog === 'permissions' && state.pendingPermission && crush.workspace && (

        <PermissionsDialog

          permission={state.pendingPermission}

          onAllow={async () => {

            await grantPermissionAction(crush.workspace!.id, state.pendingPermission!, 'allow');

            dispatch({ type: 'SET_PERMISSION', permission: null });

            closeDialog();

          }}

          onAllowSession={async () => {

            await grantPermissionAction(crush.workspace!.id, state.pendingPermission!, 'allow_session');

            dispatch({ type: 'SET_PERMISSION', permission: null });

            closeDialog();

          }}

          onDeny={async () => {

            await grantPermissionAction(crush.workspace!.id, state.pendingPermission!, 'deny');

            dispatch({ type: 'SET_PERMISSION', permission: null });

            closeDialog();

          }}

          onClose={closeDialog}

        />

      )}

      <CompletionsPopup

        editorValue={editorValue}

        files={crush.files}

        skills={crush.skills}

        onSelect={handleCompletionSelect}

      />

    </>

  );

}

