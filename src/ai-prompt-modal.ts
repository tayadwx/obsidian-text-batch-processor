import { App, Modal, TextAreaComponent, TextComponent, Notice, requestUrl } from 'obsidian';
import type TextProcessorPlugin from './main';
import { DEFAULT_AI_PROMPT, DEFAULT_AI_PROMPT_URL } from './defaultAiPrompt';

// AI 提示词编辑弹窗：文本域预填当前/默认提示词，用户可手动修改并保存，或一键恢复默认；
// 也支持从网址（默认 defaultprompt.md 的 GitHub raw 地址，或用户自定义的网址）拉取提示词。
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
        '这是用于让网页版 Chat AI 生成「可导入配置 JSON」的提示词。可手动修改并保存以便长期使用；也可一键恢复为内置默认提示词，或从网址拉取（留空则用默认网址）。',
    });

    // 「从网址获取」区：URL 输入框 + 获取按钮
    const fetchRow = contentEl.createEl('div', { cls: 'text-batch-aiprompt-fetch' });
    const urlInput = new TextComponent(fetchRow);
    urlInput.inputEl.classList.add('text-batch-aiprompt-url');
    urlInput.setPlaceholder('留空则使用默认网址');
    fetchRow
      .createEl('button', { text: '从网址获取', cls: 'mod-cta' })
      .addEventListener('click', async () => {
        const raw = urlInput.getValue().trim();
        const target = raw || DEFAULT_AI_PROMPT_URL;
        try {
          const resp = await requestUrl({ url: target });
          if (resp.status !== 200) {
            new Notice(`从网址获取失败：HTTP ${resp.status}`);
            return;
          }
          if (!resp.text || !resp.text.trim()) {
            new Notice('从网址获取的内容为空');
            return;
          }
          this.ta.setValue(resp.text);
          new Notice('已拉取提示词，请检查后点击「保存」');
        } catch (e: any) {
          new Notice('从网址获取失败：' + (e?.message || String(e)));
        }
      });

    contentEl.createEl('p', {
      cls: 'text-batch-muted text-batch-aiprompt-defaulturl',
      text: '默认网址：' + DEFAULT_AI_PROMPT_URL,
    });

    const wrap = contentEl.createEl('div', { cls: 'text-batch-aiprompt-wrap' });
    this.ta = new TextAreaComponent(wrap);
    this.ta.setValue(this.plugin.settings.aiPrompt ?? DEFAULT_AI_PROMPT);
    this.ta.inputEl.rows = 24;
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
