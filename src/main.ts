import { Plugin, Editor, Menu, Notice } from 'obsidian';
import { PluginSettings, UserAction, Sequence, DEFAULT_SETTINGS } from './types';
import { runAction, runSequence } from './actions';
import { TextProcessorSettingTab } from './settings';
import { PickerModal } from './picker';

export default class TextProcessorPlugin extends Plugin {
  settings: PluginSettings;
  private commandIds: string[] = [];

  async onload() {
    await this.loadSettings();
    this.registerAllCommands();
    this.addSettingTab(new TextProcessorSettingTab(this.app, this));
    // 桌面端：选中文本后右键菜单出现“文本批处理”
    this.registerEvent(this.app.workspace.on('editor-menu', this.onEditorMenu));
  }

  onunload() {
    // 命令会随插件卸载自动清理
  }

  async loadSettings() {
    const data = await this.loadData();
    this.settings = data
      ? { ...DEFAULT_SETTINGS, ...data }
      : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.registerAllCommands();
  }

  getActionsMap(): Map<string, UserAction> {
    return new Map(this.settings.actions.map((a) => [a.id, a]));
  }

  private fullId(id: string): string {
    return `${this.manifest.id}:${id}`;
  }

  private clearCommands() {
    for (const id of this.commandIds) {
      // 动态移除旧命令，保证动作/序列增删改名后命令面板是最新的
      (this.app.commands as any).removeCommand(id);
    }
    this.commandIds = [];
  }

  private registerAllCommands() {
    this.clearCommands();

    // 1) 通用菜单命令：弹出“动作/序列”选择框（按钮/命令触发路径）
    this.addCommand({
      id: 'open-picker',
      name: '选择动作或序列（菜单）',
      callback: () => {
        new PickerModal(this.app, this).open();
      },
    });
    this.commandIds.push(this.fullId('open-picker'));

    // 2) 每个动作 = 一条命令（可被快捷键 / 移动端工具栏 / 命令面板直接调用）
    for (const action of this.settings.actions) {
      this.addCommand({
        id: `action:${action.id}`,
        name: `动作：${action.name}`,
        editorCallback: (editor: Editor) =>
          this.runOnEditor(editor, (t) => runAction(action, t)),
      });
      this.commandIds.push(this.fullId(`action:${action.id}`));
    }

    // 3) 每个序列 = 一条命令
    const map = this.getActionsMap();
    for (const seq of this.settings.sequences) {
      this.addCommand({
        id: `sequence:${seq.id}`,
        name: `序列：${seq.name}`,
        editorCallback: (editor: Editor) =>
          this.runOnEditor(editor, (t) => runSequence(seq, map, t)),
      });
      this.commandIds.push(this.fullId(`sequence:${seq.id}`));
    }
  }

  // 在编辑器上执行：有选区就处理选区，没选区就处理整篇
  private runOnEditor(editor: Editor, transform: (text: string) => string) {
    const selection = editor.getSelection();
    try {
      if (selection) {
        editor.replaceSelection(transform(selection));
      } else {
        editor.setValue(transform(editor.getValue()));
      }
    } catch (e) {
      new Notice('文本批处理执行出错：' + (e as Error).message);
    }
  }

  // 桌面端右键菜单：仅当选中文本时显示。
  // 说明：Obsidian 右键菜单的“子菜单”依赖未公开 API setSubmenu，在你这版 Obsidian 上渲染不稳定
  // （点了没反应、不显示展开箭头）。因此这里改为：点击“文本批处理”直接弹出选择对话框
  // （模糊搜索，常用项置顶），交互最稳、也最接近最初“弹出对话框选择动作/序列”的设计。
  private onEditorMenu = (menu: Menu, editor: Editor) => {
    const selection = editor.getSelection();
    if (!selection) return;
    menu.addItem((item) =>
      item
        .setTitle('文本批处理')
        .setIcon('text-cursor-input')
        .onClick(() => {
          new PickerModal(this.app, this).open();
        })
    );
  };
}
