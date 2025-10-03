import * as vscode from 'vscode';
import { VscodeTasksProvider } from './vscode-tasks-sidebar/vscodeTasksProvider';

// find-unused-exports:ignore-next-line-exports
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('VSCode Tasks Sidebar');
  const vscodeTasksProvider = new VscodeTasksProvider(outputChannel);
  vscode.window.registerTreeDataProvider(
    'vscodeTasksSidebar',
    vscodeTasksProvider
  );

  let disposable: vscode.Disposable;

  disposable = vscode.commands.registerCommand(
    'vscodeTasksSidebar.runTask',
    (task: vscode.Task) => {
      vscodeTasksProvider.runTask(task);
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    'vscodeTasksSidebar.refresh',
    () => {
      outputChannel.appendLine('Manual refresh requested');
      vscodeTasksProvider.refresh();
    }
  );
  context.subscriptions.push(disposable);

  const setIsGroupedContext = (isGrouped: boolean) => {
    vscode.commands.executeCommand('setContext', 'isGrouped', isGrouped);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('vscodeTasksSidebar.viewAsGroups', () => {
      setIsGroupedContext(true);
      vscodeTasksProvider.viewAsGroups();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vscodeTasksSidebar.viewAsList', () => {
      setIsGroupedContext(false);
      vscodeTasksProvider.viewAsList();
    })
  );

  setIsGroupedContext(false);

  // Auto-refresh when workspace tasks.json changes (.vscode/tasks.json)
  const tasksJsonWatcher = vscode.workspace.createFileSystemWatcher(
    '**/.vscode/tasks.json'
  );
  context.subscriptions.push(tasksJsonWatcher);
  // Debounced refresh to coalesce rapid file events
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleRefresh = () => {
    outputChannel.appendLine('Scheduling tasks refresh in 200ms');
    if (refreshTimer !== undefined) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      outputChannel.appendLine('Auto-refreshing tasks after tasks.json change');
      vscodeTasksProvider.refresh();
      refreshTimer = undefined;
    }, 200);
  };

  context.subscriptions.push(
    tasksJsonWatcher.onDidCreate(() => scheduleRefresh())
  );
  context.subscriptions.push(
    tasksJsonWatcher.onDidChange(() => scheduleRefresh())
  );

  context.subscriptions.push(
    tasksJsonWatcher.onDidDelete(() => scheduleRefresh())
  );

  vscode.tasks.onDidStartTask((e) => {
    const vscodeTask = vscodeTasksProvider.findVscodeTask(e.execution.task);
    if (vscodeTask) {
      vscodeTask.setIsRunning(true);
      vscodeTasksProvider.updateTree();
    }
  });

  vscode.tasks.onDidEndTask((e) => {
    const vscodeTask = vscodeTasksProvider.findVscodeTask(e.execution.task);
    if (vscodeTask) {
      vscodeTask.setIsRunning(false);
      vscodeTasksProvider.updateTree();
    }
  });
}

export function deactivate() {}
