import { FuzzySuggestModal, App, Notice, MarkdownView } from 'obsidian';
import type TextProcessorPlugin from './main';
import { runAction, runSequence } from './actions';
import { Sequence, UserAction } from './types';

type PickerItem =
  | { kind: 'action'; action: UserAction }
  | { kind: 'sequence'; sequence: Sequence };

// “选择动作或序列”的弹窗（模糊搜索），对应你说的“按钮/命令触发 → 弹出可用动作和序列菜单”。
export class PickerModal extends FuzzySuggestModal<PickerItem> {
  private plugin: TextProcessorPlugin;

  constructor(app: App, plugin: TextProcessorPlugin) {
    super(app);
    this.plugin = plugin;
    this.setPlaceholder('选择要执行的动作或序列…');
  }

  getItems(): PickerItem[] {
    const settings = this.plugin.settings;
    // 常用（favorite）置顶，方便一键直达；其余按“动作在前、序列在后”排列
    const favActions: PickerItem[] = settings.actions
      .filter((a) => a.favorite)
      .map((a) => ({ kind: 'action', action: a } as PickerItem));
    const favSeqs: PickerItem[] = settings.sequences
      .filter((s) => s.favorite)
      .map((s) => ({ kind: 'sequence', sequence: s } as PickerItem));
    const restActions: PickerItem[] = settings.actions
      .filter((a) => !a.favorite)
      .map((a) => ({ kind: 'action', action: a } as PickerItem));
    const restSeqs: PickerItem[] = settings.sequences
      .filter((s) => !s.favorite)
      .map((s) => ({ kind: 'sequence', sequence: s } as PickerItem));
    return [...favActions, ...favSeqs, ...restActions, ...restSeqs];
  }

  getItemText(item: PickerItem): string {
    const star = item.kind === 'action'
      ? item.action.favorite ? '★ ' : ''
      : item.sequence.favorite ? '★ ' : '';
    const cat =
      item.kind === 'action'
        ? item.action.category?.trim() || '未分类'
        : item.sequence.category?.trim() || '未分类';
    const kind = item.kind === 'action' ? '动作' : '序列';
    const name =
      item.kind === 'action' ? item.action.name : item.sequence.name;
    return `${star}${kind}：【${cat}】${name}`;
  }

  onChooseItem(item: PickerItem): void {
    const editor = this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!editor) {
      new Notice('请先打开一篇笔记');
      return;
    }
    const selection = editor.getSelection();
    try {
      if (item.kind === 'action') {
        const out = selection
          ? runAction(item.action, selection)
          : runAction(item.action, editor.getValue());
        if (selection) editor.replaceSelection(out);
        else editor.setValue(out);
      } else {
        const map = this.plugin.getActionsMap();
        const out = selection
          ? runSequence(item.sequence, map, selection)
          : runSequence(item.sequence, map, editor.getValue());
        if (selection) editor.replaceSelection(out);
        else editor.setValue(out);
      }
    } catch (e) {
      new Notice('执行出错：' + (e as Error).message);
    }
  }
}
