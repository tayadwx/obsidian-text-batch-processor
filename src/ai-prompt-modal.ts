import { App, Modal, TextAreaComponent, Notice } from 'obsidian';
import type TextProcessorPlugin from './main';
import { DEFAULT_AI_PROMPT } from './defaultAiPrompt';

// AI 提示词编辑弹窗：文本域预填当前/默认提示词，用户可手动修改并保存，或一键恢复默认。
export class AiPromptModal extends Modal {
  private plugin: TextProcessorPlugin;
  private ta!: TextAreaComponent;

  constructor(app: App, plugin: TextProcessorPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h3', { text: '编辑 AI 提示词' });
    contentEl.createEl('p', {
      cls: 'text-batch-muted',
      text:
        '这是用于让网页版 Chat AI 生成「可导入配置 JSON」的提示词。可手动修改并保存以便长期使用；也可一键恢复为内置默认提示词。',
    });

    const wrap = contentEl.createEl('div', { cls: 'text-batch-aiprompt-wrap' });
    this.ta = new TextAreaComponent(wrap);
    this.ta.setValue(this.plugin.settings.aiPrompt ?? DEFAULT_AI_PROMPT);
    this.ta.inputEl.rows = 26;
    this.ta.inputEl.classList.add('text-batch-aiprompt');

    const footer = contentEl.createEl('div', { cls: 'text-batch-modal-footer' });
    footer
      .createEl('button', { cls: 'mod-cta', text: '保存' })
      .addEventListener('click', () => {
        this.plugin.settings.aiPrompt = this.ta.getValue();
        this.plugin.saveSettings();
        new Notice('AI 提示词已保存');
        this.close();
      });
    footer
      .createEl('button', { text: '恢复默认' })
      .addEventListener('click', () => {
        this.ta.setValue(DEFAULT_AI_PROMPT);
        this.plugin.settings.aiPrompt = DEFAULT_AI_PROMPT;
        this.plugin.saveSettings();
        new Notice('已恢复默认 AI 提示词');
        this.close();
      });
  }

  onClose() {
    this.contentEl.empty();
  }
}
