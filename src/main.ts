import { Plugin, Editor, Menu, Notice } from 'obsidian';
import { PluginSettings, UserAction, Sequence, DEFAULT_SETTINGS } from './types';
import { runAction, runSequence } from './actions';
import { TextProcessorSettingTab } from './settings';
import { PickerModal } from './picker';
import { DEFAULT_AI_PROMPT } from './defaultAiPrompt';

export default class TextProcessorPlugin extends Plugin {
  settings: PluginSettings;
  private commandIds: string[] = [];

  async onload() {
    await this.loadSettings();
    this.registerIcons();
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
    // AI 提示词缺失或为空时回退到内置预设（首次安装 / 旧配置升级场景）
    if (!this.settings.aiPrompt || !this.settings.aiPrompt.trim()) {
      this.settings.aiPrompt = DEFAULT_AI_PROMPT;
    }
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

  // 注册自定义「双 T」图标（两个紧密排列的 T），用于命令与移动端工具栏
  private registerIcons() {
    try {
      this.addIcon(
        'text-batch',
        '<path d="M3.5 6h7"/><path d="M7 6v13"/><path d="M13.5 6h7"/><path d="M17 6v13"/>'
      );
    } catch (e) {
      // 图标注册失败不应影响插件加载：降级为无图标，命令仍可用
      console.warn('文本批处理：自定义图标注册失败', e);
    }
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
    // 注意：移动端工具栏对自定义图标的支持不稳定，因此这里使用内置 lucide 图标
    // text-cursor-input（PC 右键菜单已验证可显示），保证移动端能正常添加此命令。
    this.addCommand({
      id: 'open-picker',
      name: '选择动作或序列（菜单）',
      icon: 'text-cursor-input',
      callback: () => {
        new PickerModal(this.app, this).open();
      },
    });
    this.commandIds.push(this.fullId('open-picker'));

    // 2) 每个动作 = 一条命令（可被快捷键 / 移动端工具栏 / 命令面板直接调用）
    for (const action of this.settings.actions) {
      const cat = action.category?.trim() || '未分类';
      this.addCommand({
        id: `action:${action.id}`,
        name: `动作：【${cat}】${action.name}`,
        icon: 'text-cursor-input',
        editorCallback: (editor: Editor) =>
          this.runOnEditor(editor, (t) => runAction(action, t)),
      });
      this.commandIds.push(this.fullId(`action:${action.id}`));
    }

    // 3) 每个序列 = 一条命令
    const map = this.getActionsMap();
    for (const seq of this.settings.sequences) {
      const cat = seq.category?.trim() || '未分类';
      this.addCommand({
        id: `sequence:${seq.id}`,
        name: `序列：【${cat}】${seq.name}`,
        icon: 'text-cursor-input',
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
