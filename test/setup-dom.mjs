// 在 jsdom 中搭建 DOM 环境，并复刻 Obsidian 给 HTMLElement 加的 createEl/createDiv/empty 等原型方法。
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
const win = dom.window;

globalThis.window = win;
globalThis.document = win.document;
globalThis.HTMLElement = win.HTMLElement;
globalThis.Element = win.Element;
globalThis.Node = win.Node;
try { Object.defineProperty(globalThis, 'navigator', { value: win.navigator, configurable: true }); } catch {}
globalThis.getComputedStyle = win.getComputedStyle.bind(win);
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// 复刻 Obsidian 的 createEl / createDiv / createSpan / empty / scrollIntoView
function applyCreateEl(proto) {
  proto.createEl = function (tag, props = {}) {
    const el = win.document.createElement(tag);
    if (props.cls) {
      const cls = Array.isArray(props.cls) ? props.cls : String(props.cls).split(' ');
      el.classList.add(...cls.filter(Boolean));
    }
    if (props.text != null) el.textContent = props.text;
    if (props.title != null) el.title = props.title;
    if (props.type != null) el.setAttribute('type', props.type);
    if (props.href != null) el.setAttribute('href', props.href);
    if (props.attr) {
      for (const [k, v] of Object.entries(props.attr)) el.setAttribute(k, String(v));
    }
    this.appendChild(el);
    return el;
  };
  proto.createDiv = function (props) { return this.createEl('div', props); };
  proto.createSpan = function (props) { return this.createEl('span', props); };
  proto.empty = function () { while (this.firstChild) this.removeChild(this.firstChild); };
  proto.scrollIntoView = function () {};
  // Obsidian 给 HTMLElement 原型补的便捷方法
  proto.addClass = function (c) { String(c).split(' ').filter(Boolean).forEach((x) => this.classList.add(x)); return this; };
  proto.removeClass = function (c) { String(c).split(' ').filter(Boolean).forEach((x) => this.classList.remove(x)); return this; };
  proto.toggleClass = function (c, on) { this.classList.toggle(c, on); return this; };
  proto.setText = function (t) { this.textContent = t; return this; };
  proto.setAttr = function (k, v) { this.setAttribute(k, String(v)); return this; };
  proto.show = function () { this.style.display = ''; return this; };
  proto.hide = function () { this.style.display = 'none'; return this; };
}
applyCreateEl(win.HTMLElement.prototype);
applyCreateEl(win.DocumentFragment?.prototype || {});
