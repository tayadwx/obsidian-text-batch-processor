import { Modal, App, Setting } from 'obsidian';

// 通用二次确认弹窗：标题 + 说明 + 取消/确认两按钮，避免误触。
export class ConfirmModal extends Modal {
  private title: string;
  private message: string;
  private confirmText: string;
  private onConfirm: () => void;

  constructor(
    app: App,
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = '确认'
  ) {
    super(app);
    this.title = title;
    this.message = message;
    this.confirmText = confirmText;
    this.onConfirm = onConfirm;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: this.title });
    contentEl.createEl('p', { text: this.message });

    new Setting(contentEl)
      .addButton((b) =>
        b.setButtonText('取消').onClick(() => this.close())
      )
      .addButton((b) =>
        b
          .setButtonText(this.confirmText)
          .setWarning()
          .onClick(() => {
            this.onConfirm();
            this.close();
          })
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}
