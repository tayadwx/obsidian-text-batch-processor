import { Modal, App, Setting } from 'obsidian';
import type TextProcessorPlugin from './main';
import { Sequence } from './types';

// 删除动作时的确认弹窗：
// - 列出所有引用了该动作的序列
// - 提供「同时删除这些序列」勾选框
// - 用户勾选 + 确认 → 动作与序列一并删除
// - 用户未勾选 + 确认 → 仅删除动作，并自动从序列中移除对该动作的引用（序列保留）
export class DeleteActionModal extends Modal {
  private plugin: TextProcessorPlugin;
  private actionName: string;
  private affected: Sequence[];
  private onConfirm: (deleteSequences: boolean) => void;

  constructor(
    app: App,
    plugin: TextProcessorPlugin,
    actionName: string,
    affected: Sequence[],
    onConfirm: (deleteSequences: boolean) => void
  ) {
    super(app);
    this.plugin = plugin;
    this.actionName = actionName;
    this.affected = affected;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h3', { text: '删除动作' });
    contentEl.createEl('p', {
      text: `动作「${this.actionName}」被以下 ${this.affected.length} 个序列引用。删除后这些引用将失效。`,
    });

    const list = contentEl.createEl('ul');
    list.style.margin = '8px 0';
    this.affected.forEach((s) => {
      list.createEl('li', { text: s.name });
    });

    let deleteSeqs = false;
    new Setting(contentEl)
      .setName('同时删除这些序列')
      .setDesc(
        '勾选后，将一并删除上面列出的序列；不勾选则仅删除动作，并自动从序列中移除引用（序列保留）。'
      )
      .addToggle((t) => t.onChange((v) => (deleteSeqs = v)));

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText('取消').onClick(() => this.close())
      )
      .addButton((b) =>
        b
          .setButtonText('确认删除')
          .setWarning()
          .onClick(() => {
            this.onConfirm(deleteSeqs);
            this.close();
          })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
