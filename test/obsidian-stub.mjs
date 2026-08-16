// 最小 Obsidian 桩：仅实现 display() 渲染期间用到的 API，并在 jsdom 中复刻 DOM 行为。
// 目的是在 Node 里真实跑一遍 TextProcessorSettingTab.display()，定位序列步骤被截断的 bug。

export class App {
  constructor() {
    this.vault = {
      adapter: { write: async () => {}, getAbstractFileByPath: () => null, delete: async () => {}, create: async () => {} },
    };
    this.workspace = { getActiveFile: () => null };
  }
}
export class Component {
  constructor() {}
  registerEvent() {}
  register() {}
  load() {}
  unload() {}
}
export class Plugin {
  constructor(app, manifest) { this.app = app; this.manifest = manifest; }
}
export class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  display() {}
  hide() {}
}
export class Notice {
  constructor(msg) { console.log('[Notice]', msg); }
}
export function setIcon(el, icon) {
  el.innerHTML = '<svg></svg>';
  el.dataset.icon = icon;
}
export const Platform = { isMobile: false, isDesktop: true };

export class Modal {
  constructor(app) {
    this.app = app;
    this.contentEl = document.createElement('div');
  }
  open() {}
  close() {}
}

export class Setting {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.settingEl = containerEl.createEl('div', { cls: 'setting-item' });
    this.infoEl = this.settingEl.createEl('div', { cls: 'setting-item-info' });
    this.nameEl = this.infoEl.createEl('div', { cls: 'setting-item-name' });
    this.descEl = this.infoEl.createEl('div', { cls: 'setting-item-desc' });
    this.controlEl = this.settingEl.createEl('div', { cls: 'setting-item-control' });
  }
  setName(name) { this.nameEl.textContent = name; return this; }
  setDesc(d) { this.descEl.textContent = d; return this; }
  setClass(c) { this.settingEl.classList.add(c); return this; }
  setHeading() { return this; }
  addButton(cb) { const btn = new ButtonComponent(this.controlEl); cb(btn); return this; }
  addTextArea(cb) { const ta = new TextAreaComponent(this.controlEl); cb(ta); return this; }
  addText(cb) { const t = new TextComponent(this.controlEl); cb(t); return this; }
  addDropdown(cb) { const d = new DropdownComponent(this.controlEl); cb(d); return this; }
}

export class ButtonComponent {
  constructor(parent) {
    this.buttonEl = parent.createEl('button', {});
  }
  setButtonText(t) { this.buttonEl.textContent = t; return this; }
  setIcon(i) { this.buttonEl.innerHTML = '<svg></svg>'; this.buttonEl.dataset.icon = i; return this; }
  setCta() { this.buttonEl.classList.add('mod-cta'); return this; }
  setWarning() { this.buttonEl.classList.add('mod-warning'); return this; }
  setClass(c) { this.buttonEl.classList.add(c); return this; }
  setTooltip(t) { this.buttonEl.title = t; return this; }
  onClick(cb) { this.buttonEl.addEventListener('click', cb); return this; }
}
export class TextComponent {
  constructor(parent) { this.inputEl = parent.createEl('input', { type: 'text' }); }
  setValue(v) { this.inputEl.value = v; return this; }
  setPlaceholder(p) { this.inputEl.placeholder = p; return this; }
  onChange(cb) { this.inputEl.addEventListener('input', () => cb(this.inputEl.value)); return this; }
}
export class TextAreaComponent {
  constructor(parent) { this.inputEl = parent.createEl('textarea', {}); }
  setValue(v) { this.inputEl.value = v; return this; }
  setPlaceholder(p) { this.inputEl.placeholder = p; return this; }
  onChange(cb) { this.inputEl.addEventListener('input', () => cb(this.inputEl.value)); return this; }
}
export class DropdownComponent {
  constructor(parent) { this.selectEl = parent.createEl('select', {}); this._value = ''; }
  addOption(v, label) { const o = this.selectEl.createEl('option', { value: v, text: label }); return this; }
  addOptions() { return this; }
  setValue(v) { this._value = v; this.selectEl.value = v; return this; }
  getValue() { return this._value; }
  onChange(cb) { this.selectEl.addEventListener('change', () => cb(this.selectEl.value)); return this; }
}

// 其它可能被 modal 等引用到的占位导出
export class ItemView {}
export class MarkdownView {}
export class TFile {}
export class TAbstractFile {}
export function debounce(fn) { return fn; }
export function normalizePath(p) { return p; }
export async function requestUrl() { return {}; }
export const logger = { log() {}, warn() {}, error() {} };
