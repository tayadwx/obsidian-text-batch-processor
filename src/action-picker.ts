// 动作选择器：自绘可滚动下拉，替代原生 <datalist>。
// 原生 datalist 的弹层高度/滚动/键盘高亮滚动均由浏览器托管、不可定制，
// 列表过长时上下键会选到可视区外而看不到高亮项、列表也不滚动。
//
// 实现要点（经过多次校正后的最终方案）：
// 下拉层挂在输入框自身的容器 .text-batch-input 内（该容器在 styles.css 里是
// position:relative），用 position:absolute + top:100% 让它天然贴在输入框正下方。
// 这样列表的「偏移父级」就是输入框容器，二者处于同一坐标/变换空间，
// 无论 Obsidian 给 body / .app-container / .modal-container 加什么 transform、
// filter、will-change，列表都绝不会错位到视口中心、也绝不会被设置弹窗遮挡
// （它本就是设置页 DOM 树的一部分，处于设置弹窗的层叠上下文之内）。
// 同时保证同一时刻只有一个下拉处于打开状态，且输入框失焦时自动关闭。
export interface ActionOption {
  id: string;
  name: string;
  category: string;
}

export interface ActionPickerOpts {
  placeholder?: string;
  value?: string;
  // 每次展开时实时拉取选项，保证新增动作之后也能立刻出现在列表里
  getOptions: () => ActionOption[];
  // 从列表里选中某一项
  onSelect: (id: string, name: string) => void;
  // 输入框内容变化（用于实时写回草稿的 actionId）
  onInput?: (name: string) => void;
  // 收起时（失焦 / 点外部）用当前文本做最终校验（如：不存在则还原）
  onCommit?: (name: string) => void;
}

export class ActionPicker {
  // 全局唯一激活的下拉，保证同一时刻只能有一个打开
  private static active: ActionPicker | null = null;

  private wrapper: HTMLElement;
  private input: HTMLInputElement;
  private clearBtn: HTMLButtonElement;
  private opts: ActionPickerOpts;
  private listEl?: HTMLElement;
  private filtered: ActionOption[] = [];
  private activeIdx = -1;
  private open = false;
  private justPicked = false;
  private scrollListeners: Array<{ el: EventTarget; fn: EventListener }> = [];

  private docPointerDown = (e: MouseEvent) => {
    if (!this.open) return;
    const t = e.target as Node;
    if (this.wrapper.contains(t)) return;
    if (this.listEl && this.listEl.contains(t)) return;
    this.closeList();
  };

  // 定位宿主：下拉层直接挂到输入框自身的容器 .text-batch-input 内。
  // 该容器在 styles.css 里是 position:relative，于是列表的偏移父级就是它，
  // 列表必精准贴在输入框正下方，且天然处于设置弹窗的层叠上下文之内（不会被遮挡）。
  private findHost(): HTMLElement {
    return this.wrapper;
  }

  private onWindowResize = () => {
    if (!this.open) return;
    this.positionList();
  };

  private onAncestorScroll = () => {
    if (!this.open) return;
    this.positionList();
  };

  private onDocumentWheel = (e: WheelEvent) => {
    if (!this.open) return;
    // 列表锚定在输入框容器内、随设置页滚动自动跟随，无需因滚动关闭；
    // 仅当滚轮落在列表自身之上时阻止冒泡，让列表内部滚动正常进行。
    if (this.listEl && this.listEl.contains(e.target as Node)) {
      e.stopPropagation();
    }
  };

  constructor(parent: HTMLElement, opts: ActionPickerOpts) {
    this.opts = opts;
    this.wrapper = parent.createEl('div', {
      cls: 'text-batch-input text-batch-picker',
    });
    this.input = this.wrapper.createEl('input', { type: 'text', cls: 'text-batch-input-el' });
    this.input.value = opts.value ?? '';
    if (opts.placeholder) this.input.placeholder = opts.placeholder;

    // 清空按钮：点击清空并重新展开列表
    this.clearBtn = this.wrapper.createEl('button', {
      type: 'button',
      cls: 'text-batch-clear',
      text: '✕',
      attr: { 'aria-label': '清空' },
    });
    this.clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.input.value = '';
      this.syncClear();
      this.opts.onInput?.('');
      this.input.focus();
      this.openList();
    });

    this.input.addEventListener('focus', () => {
      if (!this.open) this.openList();
    });
    this.input.addEventListener('click', () => {
      if (!this.open) this.openList();
    });
    this.input.addEventListener('input', () => {
      this.syncClear();
      this.opts.onInput?.(this.input.value);
      if (!this.open) this.openList();
      else this.filterAndRender();
    });
    // 失焦时若焦点没有落在自身容器或下拉层内，则收起
    this.input.addEventListener('blur', (e) => {
      const rel = (e as FocusEvent).relatedTarget as Node | null;
      if (rel && (this.wrapper.contains(rel) || (this.listEl && this.listEl.contains(rel)))) return;
      this.closeList();
    });
    this.input.addEventListener('keydown', (e) => this.onKey(e));

    // 捕获阶段监听，保证在输入框自身的 mousedown 之前就能判断是否点到了外部
    document.addEventListener('mousedown', this.docPointerDown, true);
    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('wheel', this.onDocumentWheel, { capture: true, passive: true });
    this.attachScrollListeners();
    this.syncClear();
  }

  private syncClear() {
    this.clearBtn.style.display = this.input.value ? 'flex' : 'none';
  }

  private onKey(e: KeyboardEvent) {
    if (!this.open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        this.openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.filtered.length === 0) return;
      this.activeIdx = (this.activeIdx + 1) % this.filtered.length;
      this.highlightAndScroll();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.filtered.length === 0) return;
      this.activeIdx = (this.activeIdx - 1 + this.filtered.length) % this.filtered.length;
      this.highlightAndScroll();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.activeIdx >= 0 && this.filtered[this.activeIdx]) this.select(this.filtered[this.activeIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.closeList();
    }
  }

  private openList() {
    // 打开前先关闭其它已打开的下拉，保证全局唯一
    if (ActionPicker.active && ActionPicker.active !== this) {
      ActionPicker.active.closeList();
    }
    ActionPicker.active = this;
    if (this.open) {
      this.filterAndRender();
      return;
    }
    this.open = true;
    const host = this.findHost();
    const list = host.createEl('div', { cls: 'text-batch-picker-list' });
    this.listEl = list;
    this.filterAndRender();
  }

  // 列表挂在外层 .text-batch-input（position:relative）容器内，
  // 用 position:absolute + top:100% 让它天然贴在输入框正下方——
  // 偏移父级就是输入框容器，二者同处一个坐标/变换空间，无论祖先有无 transform
  // 都不会错位。靠近视口底部时翻到输入框上方。
  private positionList() {
    if (!this.listEl) return;
    const inputRect = this.input.getBoundingClientRect();
    const listH = this.listEl.offsetHeight || 240;
    // 下方空间不足（接近视口底部）且上方有空间则翻到输入框上方
    const flipUp =
      inputRect.bottom + listH + 8 > window.innerHeight && inputRect.top - listH - 8 > 0;
    this.listEl.style.position = 'absolute';
    this.listEl.style.left = '0';
    this.listEl.style.width = '100%';
    if (flipUp) {
      this.listEl.style.top = 'auto';
      this.listEl.style.bottom = 'calc(100% + 4px)';
    } else {
      this.listEl.style.top = 'calc(100% + 4px)';
      this.listEl.style.bottom = 'auto';
    }
  }

  private filterAndRender() {
    const q = this.input.value.trim().toLowerCase();
    const all = this.opts.getOptions();
    // 同时匹配「动作名」或「动作类别」
    this.filtered = q
      ? all.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (o.category ?? '').toLowerCase().includes(q)
        )
      : all.slice();
    if (this.activeIdx >= this.filtered.length) this.activeIdx = this.filtered.length - 1;
    if (this.activeIdx < 0 && this.filtered.length > 0) this.activeIdx = 0;
    this.renderItems();
    this.positionList();
  }

  private renderItems() {
    if (!this.listEl) return;
    this.listEl.empty();
    if (this.filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-batch-picker-empty';
      empty.textContent = '无匹配项';
      this.listEl.appendChild(empty);
      return;
    }
    this.filtered.forEach((o, i) => {
      const item = document.createElement('div');
      item.className =
        'text-batch-picker-item' + (i === this.activeIdx ? ' text-batch-picker-item-active' : '');
      const cat = o.category ? `【${o.category}】` : '';
      item.textContent = cat + o.name;
      item.addEventListener('mouseenter', () => {
        this.activeIdx = i;
        this.renderItems();
      });
      // 使用 mousedown 而非 click：防止输入框先 blur 导致列表关闭、选择失效
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.select(o);
      });
      this.listEl.appendChild(item);
    });
  }

  private highlightAndScroll() {
    if (!this.listEl) return;
    const items = Array.from(
      this.listEl.querySelectorAll('.text-batch-picker-item')
    ) as HTMLElement[];
    items.forEach((el, i) => el.classList.toggle('text-batch-picker-item-active', i === this.activeIdx));
    const cur = items[this.activeIdx];
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  private select(o: ActionOption) {
    this.justPicked = true;
    this.input.value = o.name;
    this.syncClear();
    this.opts.onSelect(o.id, o.name);
    this.closeList();
    this.input.focus();
  }

  private closeList() {
    if (!this.open) return;
    this.open = false;
    if (this.listEl) {
      this.listEl.remove();
      this.listEl = undefined;
    }
    this.activeIdx = -1;
    if (ActionPicker.active === this) ActionPicker.active = null;
    if (!this.justPicked) this.opts.onCommit?.(this.input.value);
    this.justPicked = false;
  }

  private attachScrollListeners() {
    const host = this.findHost();
    const scrollables: EventTarget[] = [];
    let el: HTMLElement | null = this.wrapper;
    // 从输入框一路向上找到宿主（modal 容器），沿途凡是可滚动的祖先都监听，
    // 保证滚动设置页时下拉能实时跟随。同时监听宿主本身与 window。
    while (el && el !== host) {
      const style = window.getComputedStyle(el);
      if (
        /auto|scroll|overlay/.test(style.overflowY) ||
        /auto|scroll|overlay/.test(style.overflow)
      ) {
        scrollables.push(el);
      }
      el = el.parentElement;
    }
    scrollables.push(host);
    scrollables.push(window);
    scrollables.forEach((target) => {
      const fn: EventListener = () => this.onAncestorScroll();
      target.addEventListener('scroll', fn, { passive: true });
      this.scrollListeners.push({ el: target, fn });
    });
  }

  get value(): string {
    return this.input.value;
  }

  setValue(v: string) {
    this.input.value = v;
    this.syncClear();
  }

  destroy() {
    document.removeEventListener('mousedown', this.docPointerDown, true);
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('wheel', this.onDocumentWheel, { capture: true });
    this.scrollListeners.forEach(({ el, fn }) => el.removeEventListener('scroll', fn));
    this.scrollListeners = [];
    if (this.listEl) {
      this.listEl.remove();
      this.listEl = undefined;
    }
    this.open = false;
    if (ActionPicker.active === this) ActionPicker.active = null;
  }
}
