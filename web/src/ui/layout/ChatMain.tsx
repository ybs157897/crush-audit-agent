import { pantera } from '../../theme/pantera';
import type { Message, WorkspaceConfig, Attachment, Todo, Workspace } from '../../api/client';
import { ChatArea } from '../chat/ChatArea';
import { ChatPlaceholder } from '../chat/ChatPlaceholder';
import { PillsPanel } from '../pills/PillsPanel';
import { Editor } from '../editor/Editor';
import { QueueBar } from '../editor/QueueBar';

const MAIN_MAX = 720;

function Composer({
  editorValue, onEditorChange, onSend, onShell, isBusy, editorFocused, yolo,
  onOpenCommands, onOpenFilePicker, attachments, onAttachmentsChange,
  config, currentProvider, currentModel, onSwitchModel, onOpenModelSettings,
  workspaces, workspaceId, workspacePath, onSwitchWorkspace, onOpenWorkspaceFolder,
  floating,
  queueBar,
}: {
  editorValue: string;
  onEditorChange: (v: string) => void;
  onSend: (text: string, attachments?: Attachment[]) => void;
  onShell: (command: string) => void;
  isBusy: boolean;
  editorFocused: boolean;
  yolo: boolean;
  onOpenCommands: () => void;
  onOpenFilePicker: () => void;
  attachments: Attachment[];
  onAttachmentsChange: (a: Attachment[]) => void;
  config: WorkspaceConfig | null;
  currentProvider?: string;
  currentModel?: string;
  onSwitchModel: (provider: string, model: string) => void;
  onOpenModelSettings: () => void;
  workspaces: Workspace[];
  workspaceId?: string;
  workspacePath?: string;
  onSwitchWorkspace: (id: string) => void;
  onOpenWorkspaceFolder: (path: string) => void;
  floating?: boolean;
  queueBar?: React.ReactNode;
}) {
  return (
    <div>
      {queueBar}
      <Editor
        value={editorValue}
        onValueChange={onEditorChange}
        onSend={onSend}
        onShell={onShell}
        isBusy={isBusy}
        focused={editorFocused}
        yolo={yolo}
        onOpenCommands={onOpenCommands}
        onOpenFilePicker={onOpenFilePicker}
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
        config={config}
        currentProvider={currentProvider}
        currentModel={currentModel}
        onSwitchModel={onSwitchModel}
        onOpenModelSettings={onOpenModelSettings}
        workspaces={workspaces}
        workspaceId={workspaceId}
        workspacePath={workspacePath}
        onSwitchWorkspace={onSwitchWorkspace}
        onOpenWorkspaceFolder={onOpenWorkspaceFolder}
        floating={floating}
      />
    </div>
  );
}

export function ChatMain({
  messages,
  isBusy,
  chatFocused,
  editorFocused,
  editorValue,
  onEditorChange,
  onSend,
  onShell,
  yolo,
  onOpenCommands,
  onOpenFilePicker,
  attachments,
  onAttachmentsChange,
  config,
  currentProvider,
  currentModel,
  onSwitchModel,
  onOpenModelSettings,
  workspaces,
  workspaceId,
  workspacePath,
  onSwitchWorkspace,
  onOpenWorkspaceFolder,
  todos,
  queuedCount,
  queuedPrompts,
  pillsExpanded,
  onToggleTodo,
  onClearQueue,
  skills,
  modelName,
}: {
  messages: Message[];
  isBusy: boolean;
  chatFocused: boolean;
  editorFocused: boolean;
  editorValue: string;
  onEditorChange: (v: string) => void;
  onSend: (text: string, attachments?: Attachment[]) => void;
  onShell: (command: string) => void;
  yolo: boolean;
  onOpenCommands: () => void;
  onOpenFilePicker: () => void;
  attachments: Attachment[];
  onAttachmentsChange: (a: Attachment[]) => void;
  config: WorkspaceConfig | null;
  currentProvider?: string;
  currentModel?: string;
  onSwitchModel: (provider: string, model: string) => void;
  onOpenModelSettings: () => void;
  workspaces: Workspace[];
  workspaceId?: string;
  workspacePath?: string;
  onSwitchWorkspace: (id: string) => void;
  onOpenWorkspaceFolder: (path: string) => void;
  todos: Todo[];
  queuedCount: number;
  queuedPrompts: string[];
  pillsExpanded: boolean;
  onToggleTodo: (index: number, status: string) => void;
  onClearQueue: () => void;
  skills?: Array<{ name: string; description: string }>;
  modelName?: string;
}) {
  const empty = messages.length === 0;
  const showPills = pillsExpanded && (todos.length > 0 || queuedCount > 0);

  const queueBar = (
    <QueueBar
      queuedCount={queuedCount}
      queuedPrompts={queuedPrompts}
      isBusy={isBusy}
      onClearQueue={onClearQueue}
    />
  );

  const composerProps = {
    editorValue, onEditorChange, onSend, onShell, isBusy, editorFocused, yolo,
    onOpenCommands, onOpenFilePicker, attachments, onAttachmentsChange,
    config, currentProvider, currentModel, onSwitchModel, onOpenModelSettings,
    workspaces, workspaceId, workspacePath, onSwitchWorkspace, onOpenWorkspaceFolder,
    queueBar,
  };

  return (
    <div style={{
      gridArea: 'main',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      minHeight: 0,
      background: pantera.bgBase,
    }}>
      {empty ? (
        <ChatPlaceholder
          workspacePath={workspacePath}
          modelName={modelName}
          skills={skills}
          onSuggestion={onEditorChange}
          composer={<Composer {...composerProps} floating />}
        />
      ) : (
        <>
          <div style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            minHeight: 0,
          }}>
            <div style={{
              width: '100%',
              maxWidth: MAIN_MAX,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              padding: '0 20px',
            }}>
              <ChatArea messages={messages} isBusy={isBusy} focused={chatFocused} showGreeting={false} />
            </div>
          </div>

          {showPills && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 20px' }}>
              <div style={{ width: '100%', maxWidth: MAIN_MAX }}>
                <PillsPanel
                  todos={todos}
                  queuedCount={queuedCount}
                  queuedPrompts={queuedPrompts}
                  expanded={pillsExpanded}
                  onToggleTodo={onToggleTodo}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 20px 20px', flexShrink: 0 }}>
            <div style={{ width: '100%', maxWidth: MAIN_MAX }}>
              <Composer {...composerProps} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
