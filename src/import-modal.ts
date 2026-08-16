import { App, Modal, Setting, Notice } from 'obsidian';
import { PluginSettings } from './types';
import {
  parsePack,
  Pack,
  applyImport,
  analyzeImport,
  ImportStrategy,
  SameContentStrategy,
  DupeItem,
} from './io';

// 官方/社区示范库地址（对话框的“远程地址”方式默认预填，方便一键拉取）
export const STARTER_URL =
  'https://raw.githubusercontent.com/tayadwx/obsidian-text-batch-processor/main/starter/starter-pack.json';

interface PluginLike {
  settings: PluginSettings;
  saveSettings: () => Promise<void>;
}

export class ImportModal extends Modal {
  private plugin: PluginLike;
  private sourceText = '';
  private pack: Pack | null = null;
  private presetUrl?: string;
  private strategy: ImportStrategy = 'rename-old';
  private sameContentStrategy: SameContentStrategy = 'keep';
  private previewEl!: HTMLElement;
  private onImported?: () => void;

  constructor(
    app: App,
    plugin: PluginLike,
    presetUrl?: string,
    onImported?: () => void
  ) {
    super(app);
    this.plugin = plugin;
    this.presetUrl = presetUrl ?? STARTER_URL;
    this.onImported = onImported;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: '导入动作与序列' });

    // 方式一：粘贴
    contentEl.createEl('h4', { text: '方式一：粘贴 JSON' });
    const ta = contentEl.createEl('textarea');
    ta.placeholder = '在此粘贴导出的配置 JSON';
    ta.style.width = '100%';
    ta.rows = 6;
    ta.classList.add('text-batch-code');
    ta.addEventListener('input', () => {
      this.sourceText = ta.value;
    });

    // 方式二：文件
    contentEl.createEl('h4', { text: '方式二：选择本地文件' });
    const fileInput = contentEl.createEl('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      this.sourceText = await f.text();
      ta.value =
        this.sourceText.length > 500 ? '（已从文件读取，内容较长不显示）' : this.sourceText;
      new Notice('已读取文件，点击「解析并预览」');
    });

    // 方式三：URL
    contentEl.createEl('h4', {
      text: '方式三：远程地址（示范库地址已预填，可直接加载）',
    });
    const urlWrap = contentEl.createEl('div');
    urlWrap.style.display = 'flex';
    urlWrap.style.gap = '8px';
    const urlInput = contentEl.createEl('input');
    urlInput.type = 'text';
    urlInput.style.flex = '1';
    urlInput.placeholder = 'https://.../starter-pack.json';
    if (this.presetUrl) urlInput.value = this.presetUrl;
    const urlBtn = contentEl.createEl('button', { text: '从地址加载' });
    urlBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) {
        new Notice('请输入地址');
        return;
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        this.sourceText = await resp.text();
        ta.value =
          this.sourceText.length > 500 ? '（已从地址读取）' : this.sourceText;
        new Notice('已加载，点击「解析并预览」');
      } catch (e) {
        new Notice('加载失败：' + (e as Error).message);
      }
    });
    urlWrap.appendChild(urlInput);
    urlWrap.appendChild(urlBtn);

    // 解析按钮
    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('解析并预览')
          .setCta()
          .onClick(() => this.preview())
      );

    this.previewEl = contentEl.createEl('div');
  }

  // 渲染一段“重复/冲突”信息：标题 + 数量 + 可展开的明细列表
  private renderDupeSection(
    parent: HTMLElement,
    title: string,
    items: DupeItem[],
    desc: string
  ) {
    if (!items.length) return;
    const wrap = parent.createEl('div', { cls: 'text-batch-dupe' });
    const head = wrap.createEl('div', { cls: 'text-batch-dupe-head' });
    head.createEl('span', {
      text: `${title}：${items.length} 个`,
      cls: 'text-batch-dupe-title',
    });
    const toggle = head.createEl('a', {
      text: '查看详情',
      cls: 'text-batch-link',
    });
    const detail = wrap.createEl('div', { cls: 'text-batch-dupe-detail' });
    detail.style.display = 'none';
    for (const it of items) {
      const line = detail.createEl('div', { cls: 'text-batch-dupe-line' });
      line.createEl('span', {
        text: '• 【' + (it.category || '未分类') + '】' + it.name,
      });
      if (it.existingName && it.existingName !== it.name) {
        line.createEl('span', {
          text: `　→　已有同内容项「${it.existingName}」`,
          cls: 'text-batch-muted',
        });
      }
    }
    toggle.addEventListener('click', () => {
      const open = detail.style.display !== 'none';
      detail.style.display = open ? 'none' : 'block';
      toggle.textContent = open ? '查看详情' : '收起';
    });
    wrap.createEl('div', { text: desc, cls: 'text-batch-muted text-batch-dupe-desc' });
  }

  private preview() {
    this.previewEl.empty();
    if (!this.sourceText.trim()) {
      new Notice('请先提供 JSON 内容');
      return;
    }
    let pack: Pack;
    try {
      pack = parsePack(this.sourceText);
    } catch (e) {
      this.previewEl.createEl('p', { text: '解析失败：' + (e as Error).message });
      this.pack = null;
      return;
    }
    this.pack = pack;
    const na = pack.actions?.length ?? 0;
    const ns = pack.sequences?.length ?? 0;
    this.previewEl.createEl('p', {
      text: `解析成功：动作 ${na} 个，序列 ${ns} 个`,
      cls: 'text-batch-parse-ok',
    });

    // 与当前 vault 对比，提示将发生的重复/冲突
    const analysis = analyzeImport(this.plugin.settings, pack);
    const totalSameName =
      analysis.actionSameNameDiffContent.length +
      analysis.sequenceSameNameDiffContent.length;
    const totalSameContent =
      analysis.actionSameContentDiffName.length +
      analysis.sequenceSameContentDiffName.length;
    const totalExact =
      analysis.actionExactDuplicate.length +
      analysis.sequenceExactDuplicate.length;
    if (totalSameName > 0 || totalSameContent > 0 || totalExact > 0) {
      const box = this.previewEl.createEl('div', { cls: 'text-batch-dupe-box' });
      box.createEl('div', {
        text: '与当前配置对比：',
        cls: 'text-batch-dupe-box-title',
      });
      this.renderDupeSection(
        box,
        '同名不同内容',
        [
          ...analysis.actionSameNameDiffContent,
          ...analysis.sequenceSameNameDiffContent,
        ],
        '导入时将按下方所选策略处理（重命名旧的 / 覆盖旧的）。'
      );
      this.renderDupeSection(
        box,
        '同内容不同名',
        [
          ...analysis.actionSameContentDiffName,
          ...analysis.sequenceSameContentDiffName,
        ],
        '内容相同但名字不同。可在下方选择「保持原有名称」或「用新名称覆盖」。'
      );
      this.renderDupeSection(
        box,
        '完全相同',
        [
          ...analysis.actionExactDuplicate,
          ...analysis.sequenceExactDuplicate,
        ],
        '名字与内容都完全相同，导入时将自动跳过（不会重复创建）。'
      );
    } else {
      this.previewEl.createEl('p', {
        text: '未检测到与当前配置的重复或冲突。',
        cls: 'text-batch-muted',
      });
    }

    // 「同名不同内容」处理策略（仅在存在此类项时显示）
    if (totalSameName > 0) {
      const stratWrap = this.previewEl.createEl('div');
      stratWrap.style.margin = '8px 0';
    stratWrap.createEl('div', {
      text: '同名不同内容项处理策略',
      cls: 'text-batch-strat-title',
    });
    stratWrap.createEl('div', {
      text: '当导入包里存在与当前配置“名称相同、但代码/步骤不同”的动作或序列时，按以下方式处理：',
      cls: 'text-batch-muted',
    });

    const r1 = stratWrap.createEl('label');
    const i1 = r1.createEl('input');
    i1.type = 'radio';
    i1.name = 'imp-strat';
    i1.checked = true;
    i1.addEventListener('change', () => {
      if (i1.checked) this.strategy = 'rename-old';
    });
    r1.appendText(' 重命名旧的（保留双方，默认）');
    stratWrap.createEl('div', {
      text: '旧项改名（追加短标识）后保留，导入项作为新增加入。两边都在，互不覆盖。',
      cls: 'text-batch-muted text-batch-strat-desc',
    });

    const r2 = stratWrap.createEl('label');
    r2.style.display = 'block';
    const i2 = r2.createEl('input');
    i2.type = 'radio';
    i2.name = 'imp-strat';
    i2.addEventListener('change', () => {
      if (i2.checked) this.strategy = 'override';
    });
    r2.appendText(' 覆盖旧的（用导入项替换同名旧项）');
    stratWrap.createEl('div', {
      text: '同名旧项被导入项直接替换（保留旧 id，引用它的序列会自动指向新内容）。仅保留导入项。',
      cls: 'text-batch-muted text-batch-strat-desc',
    });
    }

    // 「同内容不同名」处理策略（仅在存在此类项时显示）
    if (totalSameContent > 0) {
      const scWrap = this.previewEl.createEl('div');
      scWrap.style.margin = '8px 0';
      scWrap.createEl('div', {
        text: '同内容不同名项处理策略',
        cls: 'text-batch-strat-title',
      });
      scWrap.createEl('div', {
        text: '当导入包里存在与当前配置“内容相同、但名称不同”的动作或序列时，按以下方式处理：',
        cls: 'text-batch-muted',
      });
      const s1 = scWrap.createEl('label');
      const si1 = s1.createEl('input');
      si1.type = 'radio';
      si1.name = 'sc-strat';
      si1.checked = true;
      si1.addEventListener('change', () => {
        if (si1.checked) this.sameContentStrategy = 'keep';
      });
      s1.appendText(' 保持原有名称（默认）');
      scWrap.createEl('div', {
        text: '内容完全一样，只是名字不同。沿用当前已有的名称，不重复创建（导入项被跳过）。',
        cls: 'text-batch-muted text-batch-strat-desc',
      });

      const s2 = scWrap.createEl('label');
      s2.style.display = 'block';
      const si2 = s2.createEl('input');
      si2.type = 'radio';
      si2.name = 'sc-strat';
      si2.addEventListener('change', () => {
        if (si2.checked) this.sameContentStrategy = 'rename';
      });
      s2.appendText(' 用新名称覆盖（同名即改成新名字）');
      scWrap.createEl('div', {
        text: '保留当前项的内容与 id，仅把它的名称改成导入包里的新名字；引用它的序列自动继续指向它，不受影响。',
        cls: 'text-batch-muted text-batch-strat-desc',
      });
    }

    new Setting(this.previewEl).addButton((btn) =>
      btn
        .setButtonText('确认导入')
        .setCta()
        .onClick(() => this.confirm())
    );
  }

  private async confirm() {
    if (!this.pack) return;
    const summary = applyImport(
      this.plugin.settings,
      this.pack,
      this.strategy,
      this.sameContentStrategy
    );
    await this.plugin.saveSettings();
    // 导入成功后刷新设置页列表（否则用户仍看到导入前的列表）
    this.onImported?.();
    new Notice(
      `导入完成：新增 ${summary.added}，跳过(内容相同) ${summary.skipped}` +
        (summary.renamedSameContent
          ? `，同内容改新名 ${summary.renamedSameContent}`
          : '') +
        `，重命名旧 ${summary.renamed}，覆盖 ${summary.overridden}` +
        (summary.warnings.length ? `；${summary.warnings.length} 条提示` : '')
    );
    this.close();
  }

  onClose() {
    this.contentEl.empty();
  }
}
