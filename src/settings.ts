import {
  App,
  PluginSettingTab,
  Setting,
  TextAreaComponent,
  Notice,
  setIcon,
} from 'obsidian';
import type TextProcessorPlugin from './main';
import { DeleteActionModal } from './delete-confirm';
import { ConfirmModal } from './confirm-modal';
import { ImportModal } from './import-modal';
import { downloadPack, exportPackText, normalizeCategory } from './io';
import { UserAction, Sequence } from './types';
import { ActionPicker } from './action-picker';
import { AiPromptModal } from './ai-prompt-modal';
import { DEFAULT_AI_PROMPT } from './defaultAiPrompt';

// 设置页：动作管理 + 序列构建器。
// 动作/序列均「按类别分组」展示，类别默认收拢；组内条目为可折叠卡片，支持筛选与排序。
// 编辑采用「草稿」模式：展开后修改只写入草稿，点击「保存」才写回配置；「取消」丢弃草稿。
// 新增项属于「内存草稿」(draftNewItems)，不会写入存储，关闭/刷新设置页即丢弃，必须点保存才持久化。

type ListItem = UserAction | Sequence;
interface CardHandle {
  nameInput: HTMLInputElement;
  catInput: ActionPicker;
  setMeta: (s: string) => void;
}

export class TextProcessorSettingTab extends PluginSettingTab {
  plugin: TextProcessorPlugin;
  // 本次编辑会话内「新增但尚未保存」的条目（不写入存储，刷新设置页即丢弃）
  private draftNewItems: ListItem[] = [];
  // 新增条目后，display() 末尾自动展开其所在分组与编辑卡片（仅触发一次）
  private pendingOpenId?: string;
  // 保存/取消后，display() 重建时强制收起该卡片（值为条目 id），实现「操作后关闭卡片」
  private pendingCloseId?: string;
  // 类别选择器实例（每张动作/序列卡片一个，自绘下拉），display 重建前统一销毁避免监听器泄漏
  private cardPickers: ActionPicker[] = [];
  // 刷新前记录各分组展开状态，重建后恢复。键为 `type|cat`，避免动作/序列同名分组互相覆盖
  private groupOpenState = new Map<string, boolean>();
  // 刷新前记录每张「卡片」（动作/序列）的展开状态，重建后恢复。
  // 否则每次 display() 重建 DOM 后，所有卡片 <details> 都会回归默认折叠，已展开的卡片被收起。
  // 键为 `type|id`（id 在动作/序列内各自唯一），避免两类条目同名互相覆盖。
  private cardOpenState = new Map<string, boolean>();
  // 序列步骤里的自定义下拉选择器实例（原生 datalist 无法滚动/键盘高亮，改用自绘下拉）
  // stepPickers 在每次 renderSteps 重渲前销毁重建；addPicker 跟随卡片生命周期
  private stepPickers: ActionPicker[] = [];
  private addPicker?: ActionPicker;
  private destroyAllPickers() {
    this.stepPickers.forEach((p) => p.destroy());
    this.stepPickers = [];
    this.cardPickers.forEach((p) => p.destroy());
    this.cardPickers = [];
    this.addPicker?.destroy();
    this.addPicker = undefined;
  }

  constructor(app: App, plugin: TextProcessorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // ===== 通用工具 =====
  private catLabel(c?: string): string {
    const s = (c ?? '').trim();
    return s ? s : '未分类';
  }

  // 同类（动作 / 序列各自独立）名称是否重复（排除自身 excludeId），限定在「同类别」内
  private nameExists(
    type: 'action' | 'sequence',
    name: string,
    excludeId?: string,
    category = ''
  ): boolean {
    const n = name.trim();
    if (!n) return false;
    const cat = normalizeCategory(category);
    if (type === 'action') {
      return this.plugin.settings.actions.some(
        (a) =>
          a.id !== excludeId &&
          normalizeCategory(a.category) === cat &&
          a.name.trim() === n
      );
    }
    return this.plugin.settings.sequences.some(
      (s) =>
        s.id !== excludeId &&
        normalizeCategory(s.category) === cat &&
        s.name.trim() === n
    );
  }

  // 在已有名称集合里生成不重复的名字（base 被占用则 base 2 / base 3 ...）
  private genUniqueName(base: string, taken: string[]): string {
    if (!taken.includes(base)) return base;
    let i = 2;
    while (taken.includes(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  }

  // 收集类别（仅限指定类型自身出现过的类别，含「未分类」），供类别输入框下拉使用。
  // 动作与序列各自独立，互不显示对方的类别。
  private collectCategories(type: 'action' | 'sequence'): string[] {
    const cats = new Set<string>();
    const list = type === 'action' ? this.plugin.settings.actions : this.plugin.settings.sequences;
    list.forEach((it) => {
      const c = (it.category ?? '').trim();
      if (c) cats.add(c);
    });
    cats.add('未分类');
    return [...cats].sort((a, b) => {
      if (a === '未分类' && b === '未分类') return 0;
      if (a === '未分类') return 1;
      if (b === '未分类') return -1;
      return a.localeCompare(b, 'zh');
    });
  }

  // 把 items 按类别分组，顺序为：非空类别按字母序，"未分类"（空串）置底
  private groupItems<T>(items: T[], getCat: (t: T) => string): { cat: string; items: T[] }[] {
    const map = new Map<string, T[]>();
    for (const it of items) {
      const c = normalizeCategory(getCat(it));
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(it);
    }
    const cats = [...map.keys()].sort((a, b) => {
      if (a === '' && b === '') return 0;
      if (a === '') return 1;
      if (b === '') return -1;
      return a.localeCompare(b, 'zh');
    });
    return cats.map((c) => ({ cat: c, items: map.get(c)! }));
  }

  private actionNameById(id: string): string {
    const a = this.plugin.settings.actions.find((x) => x.id === id);
    return a ? a.name : '';
  }

  // ===== 可复用输入框：原生 datalist + 框内左侧清空按钮 =====
  // 下拉由浏览器原生 <input list> 提供（点击输入框即弹出候选）；清空按钮只负责一键清空。
  private attachInput(
    parent: HTMLElement,
    opts: {
      value?: string;
      placeholder?: string;
      datalistId?: string;
      wrapperCls?: string;
      onChange?: (v: string) => void;
      onBlur?: (v: string) => void;
    }
  ): { input: HTMLInputElement; sync: () => void } {
    const classes = ['text-batch-input'];
    if (opts.wrapperCls) classes.push(opts.wrapperCls);
    if (opts.datalistId) classes.push('text-batch-input-has-list');
    const wrapper = parent.createEl('div', { cls: classes.join(' ') });
    const input = wrapper.createEl('input', { type: 'text', cls: 'text-batch-input-el' });
    input.value = opts.value ?? '';
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.datalistId) input.setAttribute('list', opts.datalistId);

    const clearBtn = wrapper.createEl('button', {
      type: 'button',
      cls: 'text-batch-clear',
      text: '✕',
      attr: { 'aria-label': '清空' },
    });
    const sync = () => {
      clearBtn.style.display = input.value ? 'flex' : 'none';
    };
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = '';
      sync();
      opts.onChange?.('');
      input.focus();
    });
    input.addEventListener('input', () => {
      sync();
      opts.onChange?.(input.value);
    });
    if (opts.onBlur) {
      input.addEventListener('blur', () => opts.onBlur?.(input.value));
    }
    sync();
    return { input, sync };
  }

  // ===== 卡片外壳（动作 / 序列共用）=====
  private renderCardShell(
    parent: HTMLElement,
    item: ListItem,
    isNew: boolean,
    type: 'action' | 'sequence',
    opts: {
      meta: string;
      onName: (v: string) => void;
      onCat: (v: string) => void;
      onDeleteExisting: () => void;
      onSave: () => string | null; // 返回错误文案或 null
      onCancel: (h: CardHandle) => void;
      renderExtra: (
        body: HTMLElement,
        api: { save: () => void; cancel: () => void; setMeta: (s: string) => void }
      ) => void;
    }
  ): HTMLElement {
    const details = parent.createEl('details', { cls: 'text-batch-card' });
    const summary = details.createEl('summary', { cls: 'text-batch-card-summary' });
    const titleSpan = summary.createEl('span', {
      cls: 'text-batch-card-title',
      text: (item.favorite ? '★ ' : '') + item.name,
    });
    const metaSpan = summary.createEl('span', { cls: 'text-batch-card-meta', text: opts.meta });

    const favBtn = summary.createEl('button', { cls: 'text-batch-card-btn text-batch-fav' });
    setIcon(favBtn, 'star');
    favBtn.title = item.favorite ? '取消常用' : '设为常用';
    favBtn.classList.toggle('text-batch-fav-on', item.favorite);
    favBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.favorite = !item.favorite;
      if (!isNew) this.plugin.saveSettings();
      favBtn.classList.toggle('text-batch-fav-on', item.favorite);
      favBtn.title = item.favorite ? '取消常用' : '设为常用';
      titleSpan.textContent = (item.favorite ? '★ ' : '') + item.name;
    });

    const delBtn = summary.createEl('button', { cls: 'text-batch-card-btn text-batch-danger' });
    setIcon(delBtn, 'trash');
    delBtn.setAttribute('aria-label', '删除');
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isNew) {
        this.discardNewItem(item);
        this.display();
      } else {
        opts.onDeleteExisting();
      }
    });

    const body = details.createEl('div', { cls: 'text-batch-card-body' });
    const row = body.createEl('div', { cls: 'text-batch-inline-fields' });

    const nameField = row.createEl('div', { cls: 'text-batch-field' });
    nameField.createEl('label', { text: '名称', cls: 'text-batch-field-label' });
    const nameInput = this.attachInput(nameField, {
      value: item.name,
      placeholder: '名称',
      onChange: opts.onName,
    }).input;

    const catField = row.createEl('div', { cls: 'text-batch-field' });
    catField.createEl('label', { text: '类别', cls: 'text-batch-field-label' });
    // 类别选择改用自绘下拉（与动作选择器同一套 ActionPicker）：
    // 原生 <datalist> 在 iOS 仅显示键盘上少量候选项、安卓选择不可靠，移动端体验差。
    // 输入即过滤已有类别、点选即填入、也可自由输入新类别。
    const catPicker = new ActionPicker(catField, {
      placeholder: '输入或选择类别…',
      value: (item as { category?: string }).category ?? '',
      getOptions: () =>
        this.collectCategories(type).map((c) => ({ id: c, name: c, category: '' })),
      onSelect: (_id, name) => opts.onCat(name),
      onInput: (name) => opts.onCat(name),
    });
    this.cardPickers.push(catPicker);
    const catInput = catPicker;

    const setMeta = (s: string) => {
      metaSpan.textContent = s;
    };

    const save = () => {
      const err = opts.onSave();
      if (err) {
        new Notice(err);
        return;
      }
      if (isNew) this.commitNewItem(item);
      else this.plugin.saveSettings();
      // 保存（写入数据）后关闭对应卡片
      this.pendingCloseId = item.id;
      this.display();
      new Notice('已保存');
    };
    const cancel = () => {
      if (isNew) {
        this.discardNewItem(item);
        // 取消新增（放弃添加）后关闭对应卡片
        this.pendingCloseId = item.id;
        this.display();
        new Notice('已放弃新增');
      } else {
        // 还原草稿（动作/序列各自的 onCancel 负责），随后整页重建即恢复原始值并关闭卡片
        opts.onCancel(handle);
        this.pendingCloseId = item.id;
        this.display();
      }
    };

    const handle: CardHandle = { nameInput, catInput, setMeta };
    opts.renderExtra(body, { save, cancel, setMeta });
    return details;
  }

  // ===== 动作卡片 =====
  private renderActionCard(parent: HTMLElement, action: UserAction, isNew: boolean): HTMLElement {
    const draft = { name: action.name, code: action.code, category: action.category ?? '' };
    let codeArea!: TextAreaComponent;
    return this.renderCardShell(parent, action, isNew, 'action', {
      meta: `${action.code.split('\n').length} 行代码`,
      onName: (v) => {
        draft.name = v;
      },
      onCat: (v) => {
        draft.category = v;
      },
      onDeleteExisting: () => this.deleteActionWithConfirm(action),
      onSave: () => {
        const name = draft.name.trim();
        if (!name) return '名称不能为空';
        if (
          isNew &&
          (draft.code.trim() === '' || draft.code.trim() === 'return text;')
        ) {
          return '新增动作内容为空：请填写代码后再保存，或点击「取消」放弃。';
        }
        const cat = normalizeCategory(draft.category);
        if (this.nameExists('action', name, action.id, cat)) {
          return `类别「${this.catLabel(cat)}」下名称「${name}」已存在，请修改`;
        }
        action.name = name;
        action.code = draft.code;
        action.category = cat;
        return null;
      },
      onCancel: (h) => {
        draft.name = action.name;
        draft.code = action.code;
        draft.category = action.category ?? '';
        h.nameInput.value = action.name;
        codeArea.setValue(action.code);
        h.catInput.setValue(draft.category);
        new Notice('已取消改动');
      },
      renderExtra: (body, api) => {
        const codeHead = body.createEl('div', { cls: 'text-batch-code-head' });
        codeHead.createEl('label', { text: '代码', cls: 'text-batch-field-label' });
        const codeBtns = codeHead.createEl('div', { cls: 'text-batch-code-btns' });
        codeBtns
          .createEl('button', { cls: 'mod-cta', text: '保存' })
          .addEventListener('click', api.save);
        codeBtns
          .createEl('button', { text: '取消' })
          .addEventListener('click', api.cancel);

        const codeWrap = body.createEl('div', { cls: 'text-batch-code-wrap' });
        codeArea = new TextAreaComponent(codeWrap);
        codeArea.setValue(action.code).onChange((v) => {
          draft.code = v;
        });
        codeArea.inputEl.rows = 4;
        codeArea.inputEl.classList.add('text-batch-code');
      },
    });
  }

  // ===== 序列卡片（含步骤编辑）=====
  private renderSequenceCard(parent: HTMLElement, seq: Sequence, isNew: boolean): HTMLElement {
    const draft = {
      name: seq.name,
      category: seq.category ?? '',
      steps: seq.steps.map((s) => ({ actionId: s.actionId, originalActionId: s.actionId })),
    };
    let stepsContainer!: HTMLElement;
    let renderSteps!: () => void;

    return this.renderCardShell(parent, seq, isNew, 'sequence', {
      meta: `${seq.steps.length} 个步骤`,
      onName: (v) => {
        draft.name = v;
      },
      onCat: (v) => {
        draft.category = v;
      },
      onDeleteExisting: () => {
        const idx = this.plugin.settings.sequences.findIndex((s) => s.id === seq.id);
        if (idx >= 0) this.plugin.settings.sequences.splice(idx, 1);
        this.plugin.saveSettings();
        this.display();
      },
      onSave: () => {
        const name = draft.name.trim();
        if (!name) return '名称不能为空';
        if (isNew && draft.steps.length === 0) {
          return '新增序列尚未添加任何步骤：请先添加动作，或点击「取消」放弃。';
        }
        const cat = normalizeCategory(draft.category);
        if (this.nameExists('sequence', name, seq.id, cat)) {
          return `类别「${this.catLabel(cat)}」下名称「${name}」已存在，请修改`;
        }
        for (let i = 0; i < draft.steps.length; i++) {
          const st = draft.steps[i];
          if (!st.actionId || !st.actionId.trim()) {
            if (st.originalActionId && st.originalActionId.trim()) {
              st.actionId = st.originalActionId;
            } else {
              return `步骤 ${i + 1} 未选择动作，无法保存`;
            }
          }
        }
        seq.name = name;
        seq.category = cat;
        seq.steps = draft.steps.map((s) => ({ actionId: s.actionId }));
        return null;
      },
      onCancel: (h) => {
        draft.name = seq.name;
        draft.category = seq.category ?? '';
        draft.steps = seq.steps.map((s) => ({
          actionId: s.actionId,
          originalActionId: s.actionId,
        }));
        h.nameInput.value = seq.name;
        h.catInput.setValue(draft.category);
        renderSteps();
        new Notice('已取消改动');
      },
      renderExtra: (body, api) => {
        stepsContainer = body.createEl('div', { cls: 'text-batch-steps' });

        const buildSteps = () => {
          // 重渲前先销毁当前步骤的选择器（含其挂在 body 的下拉层与全局监听），防止泄漏
          this.stepPickers.forEach((p) => p.destroy());
          this.stepPickers = [];
          stepsContainer.empty();
          draft.steps.forEach((step, stepIndex) => {
            const stepSetting = new Setting(stepsContainer).setName(`步骤 ${stepIndex + 1}`);
            const stepPicker = new ActionPicker(stepSetting.settingEl, {
              value: this.actionNameById(step.actionId),
              placeholder: '输入或选择动作…',
              getOptions: () =>
                this.plugin.settings.actions.map((a) => ({
                  id: a.id,
                  name: a.name,
                  category: a.category ?? '',
                })),
              onSelect: (id) => {
                step.actionId = id;
              },
              onInput: (v) => {
                const f = this.plugin.settings.actions.find((a) => a.name.trim() === v.trim());
                step.actionId = f ? f.id : '';
              },
              onCommit: (v) => {
                const t = v.trim();
                if (!t) return;
                const f = this.plugin.settings.actions.find((a) => a.name.trim() === t);
                if (!f) {
                  new Notice(`未找到名为「${t}」的动作`);
                  step.actionId = step.originalActionId;
                  stepPicker.setValue(this.actionNameById(step.actionId));
                }
              },
            });
            this.stepPickers.push(stepPicker);

            stepSetting.addButton((btn) =>
              btn
                .setIcon('arrow-up')
                .setTooltip('上移')
                .onClick(() => {
                  if (stepIndex > 0) {
                    const tmp = draft.steps[stepIndex - 1];
                    draft.steps[stepIndex - 1] = draft.steps[stepIndex];
                    draft.steps[stepIndex] = tmp;
                    renderSteps();
                  }
                })
            );
            stepSetting.addButton((btn) =>
              btn
                .setIcon('arrow-down')
                .setTooltip('下移')
                .onClick(() => {
                  if (stepIndex < draft.steps.length - 1) {
                    const tmp = draft.steps[stepIndex + 1];
                    draft.steps[stepIndex + 1] = draft.steps[stepIndex];
                    draft.steps[stepIndex] = tmp;
                    renderSteps();
                  }
                })
            );
            stepSetting.addButton((btn) =>
              btn
                .setIcon('trash')
                .setTooltip('删除步骤')
                .onClick(() => {
                  draft.steps.splice(stepIndex, 1);
                  renderSteps();
                })
            );
          });
          api.setMeta(`${draft.steps.length} 个步骤`);
        };
        renderSteps = buildSteps;
        buildSteps();

        const addSetting = new Setting(body).setName('新步骤');
        addSetting.settingEl.addClass('text-batch-step-add-row');
        this.addPicker = new ActionPicker(addSetting.settingEl, {
          placeholder: '输入或选择动作…',
          getOptions: () =>
            this.plugin.settings.actions.map((a) => ({
              id: a.id,
              name: a.name,
              category: a.category ?? '',
            })),
          // 从下拉直接选择即把该动作添加为新步骤（自动添加，无需额外按钮）
          onSelect: (id) => {
            const found = this.plugin.settings.actions.find((a) => a.id === id);
            if (found) {
              draft.steps.push({ actionId: found.id, originalActionId: '' });
              renderSteps();
              this.addPicker!.setValue('');
            }
          },
        });

        // 序列卡片底部：保存 / 取消（靠右）
        const footer = body.createEl('div', { cls: 'text-batch-card-footer' });
        footer.createEl('button', { cls: 'mod-cta', text: '保存' }).addEventListener('click', api.save);
        footer.createEl('button', { text: '取消' }).addEventListener('click', api.cancel);
      },
    });
  }

  // ===== 列表区块（动作 / 序列共用，差异收敛到回调）=====
  private renderSection(
    container: HTMLElement,
    type: 'action' | 'sequence',
    items: ListItem[],
    opts: {
      title: string;
      desc: string;
      addLabel: string;
      renderCard: (parent: HTMLElement, item: ListItem, isNew: boolean) => HTMLElement;
    }
  ): { cat: string; details: HTMLDetailsElement; cards: { item: ListItem; el: HTMLElement }[] }[] {
    container.createEl('h2', { text: opts.title, cls: 'text-batch-section-title' });
    new Setting(container)
      .setName(opts.addLabel)
      .setDesc(opts.desc)
      .addButton((btn) =>
        btn.setButtonText('+ ' + opts.addLabel).onClick(() => this.addItem(type, ''))
      );

    const groups = this.groupItems(items, (it) => (it as { category?: string }).category ?? '');
    const sortLabels: Record<string, string> = {
      'name-asc': '名称 ↑',
      'name-desc': '名称 ↓',
      'add-asc': '添加顺序 ↑',
      'add-desc': '添加顺序 ↓',
    };
    const allItems = type === 'action' ? this.plugin.settings.actions : this.plugin.settings.sequences;

    type CardRef = { item: ListItem; el: HTMLElement };
    const groupState: { cat: string; details: HTMLDetailsElement; itemsContainer: HTMLElement; cards: CardRef[] }[] = [];

    const toolbar = container.createEl('div', { cls: 'text-batch-toolbar' });
    toolbar.createEl('span', { cls: 'text-batch-toolbar-label', text: '筛选' });
    const filterInput = this.attachInput(toolbar, {
      placeholder: '输入关键字（匹配名称或类别）…',
      wrapperCls: 'text-batch-toolbar-input',
    }).input;

    const sortSel = toolbar.createEl('select', { cls: 'text-batch-sort text-batch-toolbar-sort' });
    Object.entries(sortLabels).forEach(([v, label]) => {
      sortSel.createEl('option', { value: v, text: label });
    });

    let favOnly = false;
    const favBtn = toolbar.createEl('button', {
      cls: 'text-batch-toolbar-btn text-batch-fav',
      text: '☆',
      title: '只显示常用',
    });
    favBtn.addEventListener('click', () => {
      favOnly = !favOnly;
      favBtn.classList.toggle('text-batch-fav-on', favOnly);
      favBtn.textContent = favOnly ? '★' : '☆';
      if (favOnly) groupState.forEach((g) => (g.details.open = true));
      applyFilter();
    });

    // 类别分组默认折叠，因此工具栏按钮初始状态为「全部展开」
    let allCollapsed = true;
    const collapseBtn = toolbar.createEl('button', { cls: 'text-batch-toolbar-btn', title: '全部展开' });
    setIcon(collapseBtn, 'maximize-2');
    collapseBtn.addEventListener('click', () => {
      if (allCollapsed) {
        groupState.forEach((g) => (g.details.open = true));
        allCollapsed = false;
        setIcon(collapseBtn, 'minimize-2');
        collapseBtn.title = '全部折叠';
      } else {
        groupState.forEach((g) => (g.details.open = false));
        allCollapsed = true;
        setIcon(collapseBtn, 'maximize-2');
        collapseBtn.title = '全部展开';
      }
      applyFilter();
    });

    for (const g of groups) {
      const details = container.createEl('details', {
        cls: 'text-batch-group',
        attr: { 'data-category': g.cat, 'data-type': type },
      }) as HTMLDetailsElement;
      const openKey = `${type}|${g.cat}`;
      if (this.groupOpenState.has(openKey)) {
        details.open = this.groupOpenState.get(openKey)!;
      }
      const summary = details.createEl('summary', { cls: 'text-batch-group-summary' });
      summary.createEl('span', {
        cls: 'text-batch-group-title',
        text: `【${this.catLabel(g.cat)}】 (${g.items.length})`,
      });
      const addBtn = summary.createEl('button', { cls: 'text-batch-card-btn', text: '＋ 添加到本类别' });
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.addItem(type, g.cat);
      });
      const itemsContainer = details.createEl('div', { cls: 'text-batch-group-items' });
      const cards: CardRef[] = g.items.map((it) => {
        const el = opts.renderCard(
          itemsContainer,
          it,
          this.draftNewItems.includes(it)
        ) as HTMLDetailsElement;
        // 标记类型与 id，供 display() 刷新前记录、重建后恢复卡片展开状态
        el.setAttribute('data-type', type);
        el.setAttribute('data-card-id', it.id);
        // 优先处理「操作后关闭卡片」：命中 pendingCloseId 则强制收起并消费该标记
        if (this.pendingCloseId === it.id) {
          el.open = false;
          this.pendingCloseId = undefined;
        } else if (this.cardOpenState.has(`${type}|${it.id}`)) {
          // 否则恢复刷新前的卡片展开状态（新增项尚无记录，保持默认折叠，由 pendingOpenId 单独展开）
          el.open = this.cardOpenState.get(`${type}|${it.id}`)!;
        }
        return { item: it, el };
      });
      groupState.push({ cat: g.cat, details, itemsContainer, cards });
    }

    const applyFilter = () => {
      const q = filterInput.value.trim().toLowerCase();
      for (const g of groupState) {
        let anyVisible = false;
        for (const c of g.cards) {
          const it = c.item;
          const nm = it.name.toLowerCase();
          const cm = this.catLabel((it as { category?: string }).category).toLowerCase();
          const match = !q || nm.includes(q) || cm.includes(q);
          const matchFav = !favOnly || !!it.favorite;
          const vis = match && matchFav;
          c.el.style.display = vis ? '' : 'none';
          if (vis) anyVisible = true;
        }
        g.details.style.display = anyVisible ? '' : 'none';
      }
    };
    const applySort = () => {
      const mode = sortSel.value;
      for (const g of groupState) {
        const sorted = [...g.cards].sort((x, y) => {
          if (mode === 'name-asc') return x.item.name.localeCompare(y.item.name, 'zh');
          if (mode === 'name-desc') return y.item.name.localeCompare(x.item.name, 'zh');
          const ix = allItems.indexOf(x.item as UserAction & Sequence);
          const iy = allItems.indexOf(y.item as UserAction & Sequence);
          return mode === 'add-asc' ? ix - iy : iy - ix;
        });
        for (const c of sorted) g.itemsContainer.appendChild(c.el);
      }
    };
    filterInput.addEventListener('input', applyFilter);
    sortSel.addEventListener('change', () => {
      applySort();
      applyFilter();
    });

    return groupState;
  }

  // ===== 新增 / 提交 / 丢弃 =====
  private genId(prefix: string): string {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // 新增项仅放入内存草稿，不写入存储；保存时才落地。
  private addItem(type: 'action' | 'sequence', category: string) {
    let id = '';
    if (type === 'action') {
      // 重名判断同时纳入「已保存动作」与「尚未保存的草稿动作」，保证多次新增时名称序号自动递增
      const taken = [
        ...this.plugin.settings.actions,
        ...this.draftNewItems.filter((i): i is UserAction => 'code' in i),
      ].map((a) => a.name.trim());
      id = this.genId('action');
      this.draftNewItems.push({
        id,
        name: this.genUniqueName('新动作', taken),
        code: 'return text;',
        category: normalizeCategory(category),
        favorite: false,
      } as UserAction);
    } else {
      const taken = [
        ...this.plugin.settings.sequences,
        ...this.draftNewItems.filter((i): i is Sequence => !('code' in i)),
      ].map((s) => s.name.trim());
      id = this.genId('seq');
      this.draftNewItems.push({
        id,
        name: this.genUniqueName('新序列', taken),
        category: normalizeCategory(category),
        favorite: false,
        steps: [],
      } as Sequence);
    }
    this.pendingOpenId = id;
    this.display();
  }

  // 保存时把草稿项从 draftNewItems 移入正式配置并持久化
  private commitNewItem(item: ListItem) {
    const i = this.draftNewItems.indexOf(item);
    if (i >= 0) this.draftNewItems.splice(i, 1);
    if ('code' in item) this.plugin.settings.actions.push(item as UserAction);
    else this.plugin.settings.sequences.push(item as Sequence);
    this.plugin.saveSettings();
  }

  private discardNewItem(item: ListItem) {
    const i = this.draftNewItems.indexOf(item);
    if (i >= 0) this.draftNewItems.splice(i, 1);
  }

  // ===== 删除动作（引用确认）=====
  private deleteActionWithConfirm(action: UserAction) {
    const affected = this.plugin.settings.sequences.filter((seq) =>
      seq.steps.some((st) => st.actionId === action.id)
    );
    const doDelete = (deleteSeqs: boolean) => {
      const idx = this.plugin.settings.actions.findIndex((a) => a.id === action.id);
      if (idx >= 0) this.plugin.settings.actions.splice(idx, 1);
      if (deleteSeqs) {
        const affectedIds = new Set(affected.map((s) => s.id));
        this.plugin.settings.sequences = this.plugin.settings.sequences.filter(
          (s) => !affectedIds.has(s.id)
        );
      } else {
        this.plugin.settings.sequences.forEach((s) => {
          s.steps = s.steps.filter((st) => st.actionId !== action.id);
        });
      }
      this.plugin.saveSettings();
      this.display();
    };
    if (affected.length === 0) {
      doDelete(false);
      return;
    }
    new DeleteActionModal(this.app, this.plugin, action.name, affected, doDelete).open();
  }

  display(): void {
    const { containerEl } = this;
    // 重建前销毁所有自定义下拉选择器（含其挂在 body 的下拉层与 window/document 监听），防止泄漏
    this.destroyAllPickers();
    // 刷新前先记录各分组的展开状态，重建 DOM 后恢复，避免添加/删除/保存后全部折叠
    this.groupOpenState.clear();
    containerEl.querySelectorAll('.text-batch-group[data-category]').forEach((el) => {
      const type = el.getAttribute('data-type') ?? '';
      const cat = el.getAttribute('data-category') ?? '';
      // 动作与序列各自都有「未分类」等同名分组，必须用 type|cat 作键，避免互相覆盖
      this.groupOpenState.set(`${type}|${cat}`, (el as HTMLDetailsElement).open);
    });
    // 同样记录每张「卡片」的展开状态（动作/序列），重建后恢复 —— 否则刷新后已展开的卡片会全部折叠
    this.cardOpenState.clear();
    containerEl.querySelectorAll('.text-batch-card[data-card-id]').forEach((el) => {
      const type = el.getAttribute('data-type') ?? '';
      const id = el.getAttribute('data-card-id') ?? '';
      // 动作与序列各自 id 唯一，用 type|id 作键避免互相覆盖
      this.cardOpenState.set(`${type}|${id}`, (el as HTMLDetailsElement).open);
    });
    containerEl.empty();

    // 类别下拉现已改用自绘 ActionPicker（见 renderCardShell），不再依赖原生 datalist。

    // 动作管理：正式条目 + 未保存草稿
    const actionItems: ListItem[] = [
      ...this.plugin.settings.actions,
      ...this.draftNewItems.filter((i): i is UserAction => 'code' in i),
    ];
    const actionGroupsState = this.renderSection(containerEl, 'action', actionItems, {
      title: '动作（可自定义代码）',
      desc: '动作是一段 JavaScript 代码：拿到变量 text，return 处理后的字符串。',
      addLabel: '新增动作',
      renderCard: (p, it, isNew) => this.renderActionCard(p, it as UserAction, isNew),
    });

    // 序列构建器
    const seqItems: ListItem[] = [
      ...this.plugin.settings.sequences,
      ...this.draftNewItems.filter((i): i is Sequence => !('code' in i)),
    ];
    const seqGroupsState = this.renderSection(containerEl, 'sequence', seqItems, {
      title: '序列（动作的组合）',
      desc: '把多个动作按顺序排列，形成可一键执行的序列。',
      addLabel: '新增序列',
      renderCard: (p, it, isNew) => this.renderSequenceCard(p, it as Sequence, isNew),
    });

    // ===== 导入 / 导出 =====
    containerEl.createEl('h2', { text: '导入 / 导出', cls: 'text-batch-section-title' });
    new Setting(containerEl)
      .setName('导出当前配置')
      .setDesc('把全部动作与序列导出为 JSON，可下载到本地，用于备份或分享给他人。')
      .addButton((btn) =>
        btn.setButtonText('导出').onClick(async () => {
          const text = exportPackText(this.plugin.settings);
          await downloadPack(this.app, text);
        })
      );

    new Setting(containerEl)
      .setName('导入配置')
      .setDesc('从粘贴 / 本地文件 / 远程地址导入动作与序列；解析后会提示重复与冲突，并支持查看明细。')
      .addButton((btn) =>
        btn.setButtonText('导入').onClick(() => {
          new ImportModal(this.plugin.app, this.plugin, undefined, () => this.display()).open();
        })
      );

    new Setting(containerEl)
      .setName('清除所有动作与序列')
      .setDesc(
        '清空当前全部动作与序列（不可撤销）。点击后会先自动把当前配置备份到插件目录（文件名含日期），再要求二次确认。'
      )
      .addButton((btn) =>
        btn
          .setButtonText('清除全部')
          .setWarning()
          .onClick(() => {
            new ConfirmModal(
              this.app,
              '确认清除全部？',
              '此操作将删除全部动作与序列。点击「确认」前，会先将当前配置自动备份到插件目录（含日期），之后仍可在「导入配置」中恢复。',
              () => this.clearAll(),
              '确认清除'
            ).open();
          })
      );

    // ===== AI 提示词 =====
    containerEl.createEl('h2', { text: 'AI 提示词', cls: 'text-batch-section-title' });
    new Setting(containerEl)
      .setName('编辑 AI 提示词')
      .setDesc('打开编辑器，里面是预设 / 你已保存的提示词。可手动修改并保存以便长期使用，也可一键恢复默认。')
      .addButton((btn) =>
        btn.setButtonText('编辑 AI 提示词').onClick(() => {
          new AiPromptModal(this.app, this.plugin).open();
        })
      );

    new Setting(containerEl)
      .setName('一键复制 AI 提示词')
      .setDesc('把当前 AI 提示词复制到剪贴板，直接粘贴到任意网页版 Chat AI 使用。')
      .addButton((btn) =>
        btn.setButtonText('复制 AI 提示词').onClick(async () => {
          const txt = this.plugin.settings.aiPrompt ?? DEFAULT_AI_PROMPT;
          try {
            await navigator.clipboard.writeText(txt);
            new Notice('已复制 AI 提示词到剪贴板');
          } catch (e) {
            // 桌面端 clipboard API 可能受权限/非安全上下文限制，回退到 textarea 选中复制
            const ta = document.createElement('textarea');
            ta.value = txt;
            ta.style.position = 'fixed';
            ta.style.top = '-1000px';
            document.body.appendChild(ta);
            ta.select();
            try {
              document.execCommand('copy');
              new Notice('已复制 AI 提示词到剪贴板');
            } catch (e2) {
              new Notice('复制失败：' + (e2 as Error).message);
            }
            document.body.removeChild(ta);
          }
        })
      );

    // 新增条目后：自动展开所在分组 + 编辑卡片，并把新卡片滚动到可见区域
    if (this.pendingOpenId) {
      const id = this.pendingOpenId;
      this.pendingOpenId = undefined;
      const findAndOpen = (
        states: { cat: string; details: HTMLDetailsElement; cards: { item: ListItem; el: HTMLElement }[] }[]
      ) => {
        for (const g of states) {
          const card = g.cards.find((c) => c.item.id === id);
          if (card) {
            g.details.open = true;
            (card.el as HTMLDetailsElement).open = true;
            card.el.scrollIntoView({ block: 'nearest' });
            return true;
          }
        }
        return false;
      };
      findAndOpen(actionGroupsState) || findAndOpen(seqGroupsState);
    }
    // 防御性清理：若本次重建未消费 pendingCloseId（极端情况下卡片未渲染），也清空避免泄漏
    this.pendingCloseId = undefined;
  }

  // 关闭设置页时销毁所有自定义下拉选择器，避免 window/document 监听泄漏
  hide(): void {
    this.destroyAllPickers();
  }

  // 清除全部动作与序列：先备份当前配置到插件目录，再清空。
  private async clearAll() {
    const pluginDir = '.obsidian/plugins/text-batch-processor';
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupName = `backup-${stamp}.json`;
    const backupPath = `${pluginDir}/${backupName}`;
    const content = exportPackText(this.plugin.settings);
    try {
      await this.app.vault.adapter.write(backupPath, content);
    } catch (e) {
      new Notice('备份失败：' + (e as Error).message + '；已取消清除。');
      return;
    }
    this.plugin.settings.actions = [];
    this.plugin.settings.sequences = [];
    await this.plugin.saveSettings();
    this.display();
    new Notice(`已清除全部，备份已保存到 ${backupPath}`);
  }
}
