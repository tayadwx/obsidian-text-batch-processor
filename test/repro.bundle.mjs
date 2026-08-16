// test/setup-dom.mjs
import { JSDOM } from "jsdom";
var dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost/"
});
var win = dom.window;
globalThis.window = win;
globalThis.document = win.document;
globalThis.HTMLElement = win.HTMLElement;
globalThis.Element = win.Element;
globalThis.Node = win.Node;
try {
  Object.defineProperty(globalThis, "navigator", { value: win.navigator, configurable: true });
} catch {
}
globalThis.getComputedStyle = win.getComputedStyle.bind(win);
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
function applyCreateEl(proto) {
  proto.createEl = function(tag, props = {}) {
    const el = win.document.createElement(tag);
    if (props.cls) {
      const cls = Array.isArray(props.cls) ? props.cls : String(props.cls).split(" ");
      el.classList.add(...cls.filter(Boolean));
    }
    if (props.text != null) el.textContent = props.text;
    if (props.title != null) el.title = props.title;
    if (props.type != null) el.setAttribute("type", props.type);
    if (props.href != null) el.setAttribute("href", props.href);
    if (props.attr) {
      for (const [k, v] of Object.entries(props.attr)) el.setAttribute(k, String(v));
    }
    this.appendChild(el);
    return el;
  };
  proto.createDiv = function(props) {
    return this.createEl("div", props);
  };
  proto.createSpan = function(props) {
    return this.createEl("span", props);
  };
  proto.empty = function() {
    while (this.firstChild) this.removeChild(this.firstChild);
  };
  proto.scrollIntoView = function() {
  };
  proto.addClass = function(c) {
    String(c).split(" ").filter(Boolean).forEach((x) => this.classList.add(x));
    return this;
  };
  proto.removeClass = function(c) {
    String(c).split(" ").filter(Boolean).forEach((x) => this.classList.remove(x));
    return this;
  };
  proto.toggleClass = function(c, on) {
    this.classList.toggle(c, on);
    return this;
  };
  proto.setText = function(t) {
    this.textContent = t;
    return this;
  };
  proto.setAttr = function(k, v) {
    this.setAttribute(k, String(v));
    return this;
  };
  proto.show = function() {
    this.style.display = "";
    return this;
  };
  proto.hide = function() {
    this.style.display = "none";
    return this;
  };
}
applyCreateEl(win.HTMLElement.prototype);
applyCreateEl(win.DocumentFragment?.prototype || {});

// test/repro.mjs
import fs from "fs";

// test/obsidian-stub.mjs
var App = class {
  constructor() {
    this.vault = {
      adapter: { write: async () => {
      }, getAbstractFileByPath: () => null, delete: async () => {
      }, create: async () => {
      } }
    };
    this.workspace = { getActiveFile: () => null };
  }
};
var PluginSettingTab = class {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }
  display() {
  }
  hide() {
  }
};
var Notice = class {
  constructor(msg) {
    console.log("[Notice]", msg);
  }
};
function setIcon(el, icon) {
  el.innerHTML = "<svg></svg>";
  el.dataset.icon = icon;
}
var Platform = { isMobile: false, isDesktop: true };
var Modal = class {
  constructor(app) {
    this.app = app;
    this.contentEl = document.createElement("div");
  }
  open() {
  }
  close() {
  }
};
var Setting = class {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.settingEl = containerEl.createEl("div", { cls: "setting-item" });
    this.infoEl = this.settingEl.createEl("div", { cls: "setting-item-info" });
    this.nameEl = this.infoEl.createEl("div", { cls: "setting-item-name" });
    this.descEl = this.infoEl.createEl("div", { cls: "setting-item-desc" });
    this.controlEl = this.settingEl.createEl("div", { cls: "setting-item-control" });
  }
  setName(name) {
    this.nameEl.textContent = name;
    return this;
  }
  setDesc(d) {
    this.descEl.textContent = d;
    return this;
  }
  setClass(c) {
    this.settingEl.classList.add(c);
    return this;
  }
  setHeading() {
    return this;
  }
  addButton(cb) {
    const btn = new ButtonComponent(this.controlEl);
    cb(btn);
    return this;
  }
  addTextArea(cb) {
    const ta = new TextAreaComponent(this.controlEl);
    cb(ta);
    return this;
  }
  addText(cb) {
    const t = new TextComponent(this.controlEl);
    cb(t);
    return this;
  }
  addDropdown(cb) {
    const d = new DropdownComponent(this.controlEl);
    cb(d);
    return this;
  }
};
var ButtonComponent = class {
  constructor(parent) {
    this.buttonEl = parent.createEl("button", {});
  }
  setButtonText(t) {
    this.buttonEl.textContent = t;
    return this;
  }
  setIcon(i) {
    this.buttonEl.innerHTML = "<svg></svg>";
    this.buttonEl.dataset.icon = i;
    return this;
  }
  setCta() {
    this.buttonEl.classList.add("mod-cta");
    return this;
  }
  setWarning() {
    this.buttonEl.classList.add("mod-warning");
    return this;
  }
  setClass(c) {
    this.buttonEl.classList.add(c);
    return this;
  }
  setTooltip(t) {
    this.buttonEl.title = t;
    return this;
  }
  onClick(cb) {
    this.buttonEl.addEventListener("click", cb);
    return this;
  }
};
var TextComponent = class {
  constructor(parent) {
    this.inputEl = parent.createEl("input", { type: "text" });
  }
  setValue(v) {
    this.inputEl.value = v;
    return this;
  }
  setPlaceholder(p) {
    this.inputEl.placeholder = p;
    return this;
  }
  onChange(cb) {
    this.inputEl.addEventListener("input", () => cb(this.inputEl.value));
    return this;
  }
};
var TextAreaComponent = class {
  constructor(parent) {
    this.inputEl = parent.createEl("textarea", {});
  }
  setValue(v) {
    this.inputEl.value = v;
    return this;
  }
  setPlaceholder(p) {
    this.inputEl.placeholder = p;
    return this;
  }
  onChange(cb) {
    this.inputEl.addEventListener("input", () => cb(this.inputEl.value));
    return this;
  }
};
var DropdownComponent = class {
  constructor(parent) {
    this.selectEl = parent.createEl("select", {});
    this._value = "";
  }
  addOption(v, label) {
    const o = this.selectEl.createEl("option", { value: v, text: label });
    return this;
  }
  addOptions() {
    return this;
  }
  setValue(v) {
    this._value = v;
    this.selectEl.value = v;
    return this;
  }
  getValue() {
    return this._value;
  }
  onChange(cb) {
    this.selectEl.addEventListener("change", () => cb(this.selectEl.value));
    return this;
  }
};

// src/delete-confirm.ts
var DeleteActionModal = class extends Modal {
  constructor(app, plugin, actionName, affected, onConfirm) {
    super(app);
    this.plugin = plugin;
    this.actionName = actionName;
    this.affected = affected;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\u5220\u9664\u52A8\u4F5C" });
    contentEl.createEl("p", {
      text: `\u52A8\u4F5C\u300C${this.actionName}\u300D\u88AB\u4EE5\u4E0B ${this.affected.length} \u4E2A\u5E8F\u5217\u5F15\u7528\u3002\u5220\u9664\u540E\u8FD9\u4E9B\u5F15\u7528\u5C06\u5931\u6548\u3002`
    });
    const list = contentEl.createEl("ul");
    list.style.margin = "8px 0";
    this.affected.forEach((s) => {
      list.createEl("li", { text: s.name });
    });
    let deleteSeqs = false;
    new Setting(contentEl).setName("\u540C\u65F6\u5220\u9664\u8FD9\u4E9B\u5E8F\u5217").setDesc(
      "\u52FE\u9009\u540E\uFF0C\u5C06\u4E00\u5E76\u5220\u9664\u4E0A\u9762\u5217\u51FA\u7684\u5E8F\u5217\uFF1B\u4E0D\u52FE\u9009\u5219\u4EC5\u5220\u9664\u52A8\u4F5C\uFF0C\u5E76\u81EA\u52A8\u4ECE\u5E8F\u5217\u4E2D\u79FB\u9664\u5F15\u7528\uFF08\u5E8F\u5217\u4FDD\u7559\uFF09\u3002"
    ).addToggle((t) => t.onChange((v) => deleteSeqs = v));
    new Setting(contentEl).addButton(
      (b) => b.setButtonText("\u53D6\u6D88").onClick(() => this.close())
    ).addButton(
      (b) => b.setButtonText("\u786E\u8BA4\u5220\u9664").setWarning().onClick(() => {
        this.onConfirm(deleteSeqs);
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/confirm-modal.ts
var ConfirmModal = class extends Modal {
  constructor(app, title, message, onConfirm, confirmText = "\u786E\u8BA4") {
    super(app);
    this.title = title;
    this.message = message;
    this.confirmText = confirmText;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: this.title });
    contentEl.createEl("p", { text: this.message });
    new Setting(contentEl).addButton(
      (b) => b.setButtonText("\u53D6\u6D88").onClick(() => this.close())
    ).addButton(
      (b) => b.setButtonText(this.confirmText).setWarning().onClick(() => {
        this.onConfirm();
        this.close();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/fingerprint.ts
function normalizeCode(code) {
  return code.replace(/\r\n?/g, "\n").trim();
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
function shortHash(str) {
  return hashString(str).slice(-3);
}
function actionFingerprint(code) {
  return hashString(normalizeCode(code));
}
function sequenceFingerprint(stepActionFingerprints) {
  return hashString(stepActionFingerprints.join("|"));
}

// src/io.ts
function normalizeCategory(v) {
  const s = (v ?? "").trim();
  return s === "" || s === "\u672A\u5206\u7C7B" ? "" : s;
}
function genId(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
function ensureUniqueName(items, desired, selfId, category) {
  const taken = /* @__PURE__ */ new Set();
  for (const it of items) {
    if (it.id !== selfId && (it.category ?? "") === category) {
      taken.add(it.name.trim());
    }
  }
  const d = desired.trim();
  if (!taken.has(d)) return desired;
  let i = 2;
  while (taken.has(d + " " + i)) i++;
  return d + " " + i;
}
function resolveActionIdByName(settings, name) {
  const a = settings.actions.find((x) => x.name.trim() === name.trim());
  return a ? a.id : void 0;
}
function applyImport(settings, pack, strategy, sameContentStrategy = "keep") {
  const summary = {
    skipped: 0,
    added: 0,
    renamed: 0,
    overridden: 0,
    renamedSameContent: 0,
    warnings: []
  };
  const catKey = (cat, s) => (cat ?? "") + "\0" + s;
  const existingActionFp = /* @__PURE__ */ new Map();
  const existingActionName = /* @__PURE__ */ new Map();
  for (const a of settings.actions) {
    const fp = actionFingerprint(a.code);
    const k = catKey(a.category ?? "", fp);
    if (!existingActionFp.has(k)) existingActionFp.set(k, a);
    existingActionName.set(catKey(a.category ?? "", a.name.trim()), a);
  }
  const nameToActionId = /* @__PURE__ */ new Map();
  for (const pa of pack.actions ?? []) {
    const name = pa?.name?.trim();
    if (!name) {
      summary.warnings.push("\u8DF3\u8FC7\u4E00\u4E2A\u65E0\u540D\u52A8\u4F5C");
      continue;
    }
    const fp = actionFingerprint(pa.code ?? "");
    const cat = normalizeCategory(pa.category);
    const fpKey = catKey(cat, fp);
    if (existingActionFp.has(fpKey)) {
      const existing = existingActionFp.get(fpKey);
      const oldName = existing.name;
      if (sameContentStrategy === "rename" && oldName.trim() !== name) {
        const newName = ensureUniqueName(
          settings.actions,
          name,
          existing.id,
          cat
        );
        existing.name = newName;
        existingActionName.delete(
          catKey(existing.category ?? "", oldName.trim())
        );
        existingActionName.set(catKey(cat, newName.trim()), existing);
        summary.renamedSameContent++;
      } else {
        summary.skipped++;
      }
      nameToActionId.set(name, existing.id);
      continue;
    }
    const nameKey = catKey(cat, name);
    const sameName = existingActionName.get(nameKey);
    if (sameName) {
      if (strategy === "override") {
        sameName.name = name;
        sameName.code = pa.code ?? "";
        sameName.category = cat;
        sameName.favorite = pa.favorite ?? sameName.favorite;
        existingActionFp.set(fpKey, sameName);
        summary.overridden++;
        nameToActionId.set(name, sameName.id);
      } else {
        sameName.name = sameName.name + "\xB7" + shortHash(fp);
        existingActionName.delete(nameKey);
        const newAction2 = {
          id: genId("action"),
          name,
          code: pa.code ?? "",
          category: cat,
          favorite: pa.favorite
        };
        settings.actions.push(newAction2);
        existingActionFp.set(fpKey, newAction2);
        existingActionName.set(catKey(cat, name), newAction2);
        summary.renamed++;
        summary.added++;
        nameToActionId.set(name, newAction2.id);
      }
      continue;
    }
    const newAction = {
      id: genId("action"),
      name,
      code: pa.code ?? "",
      category: cat,
      favorite: pa.favorite
    };
    settings.actions.push(newAction);
    existingActionFp.set(fpKey, newAction);
    existingActionName.set(catKey(cat, name), newAction);
    summary.added++;
    nameToActionId.set(name, newAction.id);
  }
  const existingSeqFp = /* @__PURE__ */ new Map();
  const existingSeqName = /* @__PURE__ */ new Map();
  for (const s of settings.sequences) {
    const fp = sequenceFingerprint(
      s.steps.map((st) => {
        const a = settings.actions.find((x) => x.id === st.actionId);
        return a ? actionFingerprint(a.code) : "";
      })
    );
    const k = catKey(s.category ?? "", fp);
    if (!existingSeqFp.has(k)) existingSeqFp.set(k, s);
    existingSeqName.set(catKey(s.category ?? "", s.name.trim()), s);
  }
  for (const ps of pack.sequences ?? []) {
    const name = ps?.name?.trim();
    if (!name) {
      summary.warnings.push("\u8DF3\u8FC7\u4E00\u4E2A\u65E0\u540D\u5E8F\u5217");
      continue;
    }
    const resolvedSteps = [];
    for (const st of ps.steps ?? []) {
      const an = st?.actionName?.trim();
      let actionId = an ? nameToActionId.get(an) : void 0;
      if (!actionId) actionId = resolveActionIdByName(settings, an ?? "");
      if (actionId) {
        resolvedSteps.push({ actionId });
      } else {
        summary.warnings.push(
          `\u5E8F\u5217\u300C${name}\u300D\u7684\u6B65\u9AA4\u300C${an ?? "?"}\u300D\u672A\u627E\u5230\u5BF9\u5E94\u52A8\u4F5C\uFF0C\u5DF2\u5FFD\u7565\u8BE5\u6B65\u9AA4`
        );
      }
    }
    const stepFps = resolvedSteps.map((st) => {
      const a = settings.actions.find((x) => x.id === st.actionId);
      return actionFingerprint(a.code);
    });
    const fp = sequenceFingerprint(stepFps);
    const cat = normalizeCategory(ps.category);
    const fpKey = catKey(cat, fp);
    if (existingSeqFp.has(fpKey)) {
      const existing = existingSeqFp.get(fpKey);
      const oldName = existing.name;
      if (sameContentStrategy === "rename" && oldName.trim() !== name) {
        const newName = ensureUniqueName(
          settings.sequences,
          name,
          existing.id,
          cat
        );
        existing.name = newName;
        existingSeqName.delete(
          catKey(existing.category ?? "", oldName.trim())
        );
        existingSeqName.set(catKey(cat, newName.trim()), existing);
        summary.renamedSameContent++;
      } else {
        summary.skipped++;
      }
      continue;
    }
    const nameKey = catKey(cat, name);
    const sameName = existingSeqName.get(nameKey);
    if (sameName) {
      if (strategy === "override") {
        sameName.name = name;
        sameName.steps = resolvedSteps;
        sameName.category = cat;
        sameName.favorite = ps.favorite ?? sameName.favorite;
        existingSeqFp.set(fpKey, sameName);
        summary.overridden++;
      } else {
        sameName.name = sameName.name + "\xB7" + shortHash(fp);
        existingSeqName.delete(nameKey);
        const newSeq2 = {
          id: genId("seq"),
          name,
          steps: resolvedSteps,
          category: cat,
          favorite: ps.favorite
        };
        settings.sequences.push(newSeq2);
        existingSeqFp.set(fpKey, newSeq2);
        existingSeqName.set(catKey(cat, name), newSeq2);
        summary.renamed++;
        summary.added++;
      }
      continue;
    }
    const newSeq = {
      id: genId("seq"),
      name,
      steps: resolvedSteps,
      category: cat,
      favorite: ps.favorite
    };
    settings.sequences.push(newSeq);
    existingSeqFp.set(fpKey, newSeq);
    existingSeqName.set(catKey(cat, name), newSeq);
    summary.added++;
  }
  return summary;
}
function vaultActionFpMap(settings) {
  const m = /* @__PURE__ */ new Map();
  for (const a of settings.actions) m.set(a.id, actionFingerprint(a.code));
  return m;
}
function sequenceFpOf(seq, idFp) {
  const fps = seq.steps.map((st) => idFp.get(st.actionId) ?? "");
  return sequenceFingerprint(fps);
}
function analyzeImport(settings, pack) {
  const result = {
    actionCount: pack.actions?.length ?? 0,
    sequenceCount: pack.sequences?.length ?? 0,
    actionAdded: 0,
    sequenceAdded: 0,
    actionSameNameDiffContent: [],
    actionSameContentDiffName: [],
    actionExactDuplicate: [],
    sequenceSameNameDiffContent: [],
    sequenceSameContentDiffName: [],
    sequenceExactDuplicate: []
  };
  const catKey = (cat, s) => (cat ?? "") + "\0" + s;
  const vActFp = /* @__PURE__ */ new Map();
  const vActName = /* @__PURE__ */ new Map();
  for (const a of settings.actions) {
    const fp = actionFingerprint(a.code);
    const k = catKey(a.category ?? "", fp);
    if (!vActFp.has(k)) vActFp.set(k, a);
    vActName.set(a.name.trim(), a);
  }
  for (const pa of pack.actions ?? []) {
    const name = (pa?.name ?? "").trim();
    if (!name) continue;
    const fp = actionFingerprint(pa.code ?? "");
    const cat = normalizeCategory(pa.category);
    const byFp = vActFp.get(catKey(cat, fp));
    if (byFp) {
      if (byFp.name.trim() === name) {
        result.actionExactDuplicate.push({ name, category: cat });
      } else {
        result.actionSameContentDiffName.push({
          name,
          existingName: byFp.name,
          category: cat
        });
      }
      continue;
    }
    const byName = vActName.get(name);
    if (byName && (byName.category ?? "") === cat) {
      result.actionSameNameDiffContent.push({ name, category: cat });
      continue;
    }
    result.actionAdded++;
  }
  const idFp = vaultActionFpMap(settings);
  const vSeqFp = /* @__PURE__ */ new Map();
  const vSeqName = /* @__PURE__ */ new Map();
  for (const s of settings.sequences) {
    const fp = sequenceFpOf(s, idFp);
    const k = catKey(s.category ?? "", fp);
    if (!vSeqFp.has(k)) vSeqFp.set(k, s);
    vSeqName.set(s.name.trim(), s);
  }
  const packActFp = /* @__PURE__ */ new Map();
  for (const pa of pack.actions ?? []) {
    const n = (pa?.name ?? "").trim();
    if (n) packActFp.set(n, actionFingerprint(pa.code ?? ""));
  }
  for (const ps of pack.sequences ?? []) {
    const name = (ps?.name ?? "").trim();
    if (!name) continue;
    const fps = (ps.steps ?? []).map((st) => {
      const an = (st?.actionName ?? "").trim();
      if (packActFp.has(an)) return packActFp.get(an);
      const va = vActName.get(an);
      return va ? actionFingerprint(va.code) : "";
    });
    const fp = sequenceFingerprint(fps);
    const cat = normalizeCategory(ps.category);
    const byFp = vSeqFp.get(catKey(cat, fp));
    if (byFp) {
      if (byFp.name.trim() === name) {
        result.sequenceExactDuplicate.push({ name, category: cat });
      } else {
        result.sequenceSameContentDiffName.push({
          name,
          existingName: byFp.name,
          category: cat
        });
      }
      continue;
    }
    const byName = vSeqName.get(name);
    if (byName && (byName.category ?? "") === cat) {
      result.sequenceSameNameDiffContent.push({ name, category: cat });
      continue;
    }
    result.sequenceAdded++;
  }
  return result;
}
function exportPackText(settings) {
  const pack = {
    $schema: "text-batch-processor-pack",
    version: 1,
    actions: settings.actions.map((a) => ({
      name: a.name,
      code: a.code,
      category: a.category ?? "",
      favorite: a.favorite
    })),
    sequences: settings.sequences.map((s) => ({
      name: s.name,
      category: s.category ?? "",
      favorite: s.favorite,
      steps: s.steps.map((st) => {
        const a = settings.actions.find((x) => x.id === st.actionId);
        return { actionName: a ? a.name : "" };
      })
    }))
  };
  return JSON.stringify(pack, null, 2);
}
function parsePack(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("JSON \u89E3\u6790\u9519\u8BEF\uFF1A" + e.message);
  }
  if (typeof data !== "object" || data === null) {
    throw new Error("\u683C\u5F0F\u4E0D\u6B63\u786E\uFF1A\u6839\u8282\u70B9\u4E0D\u662F\u5BF9\u8C61");
  }
  const rawActions = Array.isArray(data.actions) ? data.actions : [];
  const rawSeqs = Array.isArray(data.sequences) ? data.sequences : [];
  const pack = { actions: [], sequences: [] };
  for (const a of rawActions) {
    if (!a || typeof a.name !== "string" || typeof a.code !== "string") continue;
    pack.actions.push({
      name: a.name,
      code: a.code,
      category: typeof a.category === "string" ? a.category : "",
      favorite: !!a.favorite
    });
  }
  for (const s of rawSeqs) {
    if (!s || typeof s.name !== "string") continue;
    const steps = Array.isArray(s.steps) ? s.steps.filter((st) => st && typeof st.actionName === "string").map((st) => ({ actionName: st.actionName })) : [];
    pack.sequences.push({
      name: s.name,
      category: typeof s.category === "string" ? s.category : "",
      favorite: !!s.favorite,
      steps
    });
  }
  return pack;
}
async function downloadPack(app, text, filename = "text-batch-export.json") {
  if (!Platform.isMobile) {
    try {
      const electron = window.require?.("electron");
      const dialog = electron?.remote?.dialog ?? electron?.dialog;
      const fs2 = electron?.remote?.fs ?? electron?.fs;
      if (dialog?.showSaveDialog && fs2?.writeFileSync) {
        const result = await dialog.showSaveDialog({
          defaultPath: filename,
          filters: [{ name: "JSON", extensions: ["json"] }]
        });
        if (!result.canceled && result.filePath) {
          fs2.writeFileSync(result.filePath, text, "utf8");
          new Notice("\u5DF2\u5BFC\u51FA\u5230\uFF1A" + result.filePath);
          return;
        }
      }
    } catch (e) {
      console.warn("\u6587\u672C\u6279\u5904\u7406\uFF1A\u7CFB\u7EDF\u4FDD\u5B58\u5BF9\u8BDD\u6846\u4E0D\u53EF\u7528\uFF0C\u56DE\u9000\u5230\u5199\u5165\u4ED3\u5E93", e);
    }
  }
  try {
    const existing = app.vault.getAbstractFileByPath(filename);
    if (existing) await app.vault.delete(existing);
    await app.vault.create(filename, text);
    new Notice("\u5DF2\u5BFC\u51FA\u5230\u4ED3\u5E93\u6839\u76EE\u5F55\uFF1A" + filename + "\uFF08\u79FB\u52A8\u7AEF\u53EF\u7528\u7CFB\u7EDF\u5206\u4EAB\u53E6\u5B58\uFF09");
  } catch (e) {
    new Notice("\u5BFC\u51FA\u5931\u8D25\uFF1A" + e.message);
  }
}

// src/import-modal.ts
var STARTER_URL = "https://raw.githubusercontent.com/tayadwx/obsidian-text-batch-processor/main/starter/starter-pack.json";
var ImportModal = class extends Modal {
  constructor(app, plugin, presetUrl, onImported) {
    super(app);
    this.sourceText = "";
    this.pack = null;
    this.strategy = "rename-old";
    this.sameContentStrategy = "keep";
    this.plugin = plugin;
    this.presetUrl = presetUrl ?? STARTER_URL;
    this.onImported = onImported;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\u5BFC\u5165\u52A8\u4F5C\u4E0E\u5E8F\u5217" });
    contentEl.createEl("h4", { text: "\u65B9\u5F0F\u4E00\uFF1A\u7C98\u8D34 JSON" });
    const ta = contentEl.createEl("textarea");
    ta.placeholder = "\u5728\u6B64\u7C98\u8D34\u5BFC\u51FA\u7684\u914D\u7F6E JSON";
    ta.style.width = "100%";
    ta.rows = 6;
    ta.classList.add("text-batch-code");
    ta.addEventListener("input", () => {
      this.sourceText = ta.value;
    });
    contentEl.createEl("h4", { text: "\u65B9\u5F0F\u4E8C\uFF1A\u9009\u62E9\u672C\u5730\u6587\u4EF6" });
    const fileInput = contentEl.createEl("input");
    fileInput.type = "file";
    fileInput.accept = "application/json,.json";
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      this.sourceText = await f.text();
      ta.value = this.sourceText.length > 500 ? "\uFF08\u5DF2\u4ECE\u6587\u4EF6\u8BFB\u53D6\uFF0C\u5185\u5BB9\u8F83\u957F\u4E0D\u663E\u793A\uFF09" : this.sourceText;
      new Notice("\u5DF2\u8BFB\u53D6\u6587\u4EF6\uFF0C\u70B9\u51FB\u300C\u89E3\u6790\u5E76\u9884\u89C8\u300D");
    });
    contentEl.createEl("h4", {
      text: "\u65B9\u5F0F\u4E09\uFF1A\u8FDC\u7A0B\u5730\u5740\uFF08\u793A\u8303\u5E93\u5730\u5740\u5DF2\u9884\u586B\uFF0C\u53EF\u76F4\u63A5\u52A0\u8F7D\uFF09"
    });
    const urlWrap = contentEl.createEl("div");
    urlWrap.style.display = "flex";
    urlWrap.style.gap = "8px";
    const urlInput = contentEl.createEl("input");
    urlInput.type = "text";
    urlInput.style.flex = "1";
    urlInput.placeholder = "https://.../starter-pack.json";
    if (this.presetUrl) urlInput.value = this.presetUrl;
    const urlBtn = contentEl.createEl("button", { text: "\u4ECE\u5730\u5740\u52A0\u8F7D" });
    urlBtn.addEventListener("click", async () => {
      const url = urlInput.value.trim();
      if (!url) {
        new Notice("\u8BF7\u8F93\u5165\u5730\u5740");
        return;
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        this.sourceText = await resp.text();
        ta.value = this.sourceText.length > 500 ? "\uFF08\u5DF2\u4ECE\u5730\u5740\u8BFB\u53D6\uFF09" : this.sourceText;
        new Notice("\u5DF2\u52A0\u8F7D\uFF0C\u70B9\u51FB\u300C\u89E3\u6790\u5E76\u9884\u89C8\u300D");
      } catch (e) {
        new Notice("\u52A0\u8F7D\u5931\u8D25\uFF1A" + e.message);
      }
    });
    urlWrap.appendChild(urlInput);
    urlWrap.appendChild(urlBtn);
    new Setting(contentEl).addButton(
      (btn) => btn.setButtonText("\u89E3\u6790\u5E76\u9884\u89C8").setCta().onClick(() => this.preview())
    );
    this.previewEl = contentEl.createEl("div");
  }
  // 渲染一段“重复/冲突”信息：标题 + 数量 + 可展开的明细列表
  renderDupeSection(parent, title, items, desc) {
    if (!items.length) return;
    const wrap = parent.createEl("div", { cls: "text-batch-dupe" });
    const head = wrap.createEl("div", { cls: "text-batch-dupe-head" });
    head.createEl("span", {
      text: `${title}\uFF1A${items.length} \u4E2A`,
      cls: "text-batch-dupe-title"
    });
    const toggle = head.createEl("a", {
      text: "\u67E5\u770B\u8BE6\u60C5",
      cls: "text-batch-link"
    });
    const detail = wrap.createEl("div", { cls: "text-batch-dupe-detail" });
    detail.style.display = "none";
    for (const it of items) {
      const line = detail.createEl("div", { cls: "text-batch-dupe-line" });
      line.createEl("span", {
        text: "\u2022 \u3010" + (it.category || "\u672A\u5206\u7C7B") + "\u3011" + it.name
      });
      if (it.existingName && it.existingName !== it.name) {
        line.createEl("span", {
          text: `\u3000\u2192\u3000\u5DF2\u6709\u540C\u5185\u5BB9\u9879\u300C${it.existingName}\u300D`,
          cls: "text-batch-muted"
        });
      }
    }
    toggle.addEventListener("click", () => {
      const open = detail.style.display !== "none";
      detail.style.display = open ? "none" : "block";
      toggle.textContent = open ? "\u67E5\u770B\u8BE6\u60C5" : "\u6536\u8D77";
    });
    wrap.createEl("div", { text: desc, cls: "text-batch-muted text-batch-dupe-desc" });
  }
  preview() {
    this.previewEl.empty();
    if (!this.sourceText.trim()) {
      new Notice("\u8BF7\u5148\u63D0\u4F9B JSON \u5185\u5BB9");
      return;
    }
    let pack;
    try {
      pack = parsePack(this.sourceText);
    } catch (e) {
      this.previewEl.createEl("p", { text: "\u89E3\u6790\u5931\u8D25\uFF1A" + e.message });
      this.pack = null;
      return;
    }
    this.pack = pack;
    const na = pack.actions?.length ?? 0;
    const ns = pack.sequences?.length ?? 0;
    this.previewEl.createEl("p", {
      text: `\u89E3\u6790\u6210\u529F\uFF1A\u52A8\u4F5C ${na} \u4E2A\uFF0C\u5E8F\u5217 ${ns} \u4E2A`,
      cls: "text-batch-parse-ok"
    });
    const analysis = analyzeImport(this.plugin.settings, pack);
    const totalSameName = analysis.actionSameNameDiffContent.length + analysis.sequenceSameNameDiffContent.length;
    const totalSameContent = analysis.actionSameContentDiffName.length + analysis.sequenceSameContentDiffName.length;
    const totalExact = analysis.actionExactDuplicate.length + analysis.sequenceExactDuplicate.length;
    if (totalSameName > 0 || totalSameContent > 0 || totalExact > 0) {
      const box = this.previewEl.createEl("div", { cls: "text-batch-dupe-box" });
      box.createEl("div", {
        text: "\u4E0E\u5F53\u524D\u914D\u7F6E\u5BF9\u6BD4\uFF1A",
        cls: "text-batch-dupe-box-title"
      });
      this.renderDupeSection(
        box,
        "\u540C\u540D\u4E0D\u540C\u5185\u5BB9",
        [
          ...analysis.actionSameNameDiffContent,
          ...analysis.sequenceSameNameDiffContent
        ],
        "\u5BFC\u5165\u65F6\u5C06\u6309\u4E0B\u65B9\u6240\u9009\u7B56\u7565\u5904\u7406\uFF08\u91CD\u547D\u540D\u65E7\u7684 / \u8986\u76D6\u65E7\u7684\uFF09\u3002"
      );
      this.renderDupeSection(
        box,
        "\u540C\u5185\u5BB9\u4E0D\u540C\u540D",
        [
          ...analysis.actionSameContentDiffName,
          ...analysis.sequenceSameContentDiffName
        ],
        "\u5185\u5BB9\u76F8\u540C\u4F46\u540D\u5B57\u4E0D\u540C\u3002\u53EF\u5728\u4E0B\u65B9\u9009\u62E9\u300C\u4FDD\u6301\u539F\u6709\u540D\u79F0\u300D\u6216\u300C\u7528\u65B0\u540D\u79F0\u8986\u76D6\u300D\u3002"
      );
      this.renderDupeSection(
        box,
        "\u5B8C\u5168\u76F8\u540C",
        [
          ...analysis.actionExactDuplicate,
          ...analysis.sequenceExactDuplicate
        ],
        "\u540D\u5B57\u4E0E\u5185\u5BB9\u90FD\u5B8C\u5168\u76F8\u540C\uFF0C\u5BFC\u5165\u65F6\u5C06\u81EA\u52A8\u8DF3\u8FC7\uFF08\u4E0D\u4F1A\u91CD\u590D\u521B\u5EFA\uFF09\u3002"
      );
    } else {
      this.previewEl.createEl("p", {
        text: "\u672A\u68C0\u6D4B\u5230\u4E0E\u5F53\u524D\u914D\u7F6E\u7684\u91CD\u590D\u6216\u51B2\u7A81\u3002",
        cls: "text-batch-muted"
      });
    }
    if (totalSameName > 0) {
      const stratWrap = this.previewEl.createEl("div");
      stratWrap.style.margin = "8px 0";
      stratWrap.createEl("div", {
        text: "\u540C\u540D\u4E0D\u540C\u5185\u5BB9\u9879\u5904\u7406\u7B56\u7565",
        cls: "text-batch-strat-title"
      });
      stratWrap.createEl("div", {
        text: "\u5F53\u5BFC\u5165\u5305\u91CC\u5B58\u5728\u4E0E\u5F53\u524D\u914D\u7F6E\u201C\u540D\u79F0\u76F8\u540C\u3001\u4F46\u4EE3\u7801/\u6B65\u9AA4\u4E0D\u540C\u201D\u7684\u52A8\u4F5C\u6216\u5E8F\u5217\u65F6\uFF0C\u6309\u4EE5\u4E0B\u65B9\u5F0F\u5904\u7406\uFF1A",
        cls: "text-batch-muted"
      });
      const r1 = stratWrap.createEl("label");
      const i1 = r1.createEl("input");
      i1.type = "radio";
      i1.name = "imp-strat";
      i1.checked = true;
      i1.addEventListener("change", () => {
        if (i1.checked) this.strategy = "rename-old";
      });
      r1.appendText(" \u91CD\u547D\u540D\u65E7\u7684\uFF08\u4FDD\u7559\u53CC\u65B9\uFF0C\u9ED8\u8BA4\uFF09");
      stratWrap.createEl("div", {
        text: "\u65E7\u9879\u6539\u540D\uFF08\u8FFD\u52A0\u77ED\u6807\u8BC6\uFF09\u540E\u4FDD\u7559\uFF0C\u5BFC\u5165\u9879\u4F5C\u4E3A\u65B0\u589E\u52A0\u5165\u3002\u4E24\u8FB9\u90FD\u5728\uFF0C\u4E92\u4E0D\u8986\u76D6\u3002",
        cls: "text-batch-muted text-batch-strat-desc"
      });
      const r2 = stratWrap.createEl("label");
      r2.style.display = "block";
      const i2 = r2.createEl("input");
      i2.type = "radio";
      i2.name = "imp-strat";
      i2.addEventListener("change", () => {
        if (i2.checked) this.strategy = "override";
      });
      r2.appendText(" \u8986\u76D6\u65E7\u7684\uFF08\u7528\u5BFC\u5165\u9879\u66FF\u6362\u540C\u540D\u65E7\u9879\uFF09");
      stratWrap.createEl("div", {
        text: "\u540C\u540D\u65E7\u9879\u88AB\u5BFC\u5165\u9879\u76F4\u63A5\u66FF\u6362\uFF08\u4FDD\u7559\u65E7 id\uFF0C\u5F15\u7528\u5B83\u7684\u5E8F\u5217\u4F1A\u81EA\u52A8\u6307\u5411\u65B0\u5185\u5BB9\uFF09\u3002\u4EC5\u4FDD\u7559\u5BFC\u5165\u9879\u3002",
        cls: "text-batch-muted text-batch-strat-desc"
      });
    }
    if (totalSameContent > 0) {
      const scWrap = this.previewEl.createEl("div");
      scWrap.style.margin = "8px 0";
      scWrap.createEl("div", {
        text: "\u540C\u5185\u5BB9\u4E0D\u540C\u540D\u9879\u5904\u7406\u7B56\u7565",
        cls: "text-batch-strat-title"
      });
      scWrap.createEl("div", {
        text: "\u5F53\u5BFC\u5165\u5305\u91CC\u5B58\u5728\u4E0E\u5F53\u524D\u914D\u7F6E\u201C\u5185\u5BB9\u76F8\u540C\u3001\u4F46\u540D\u79F0\u4E0D\u540C\u201D\u7684\u52A8\u4F5C\u6216\u5E8F\u5217\u65F6\uFF0C\u6309\u4EE5\u4E0B\u65B9\u5F0F\u5904\u7406\uFF1A",
        cls: "text-batch-muted"
      });
      const s1 = scWrap.createEl("label");
      const si1 = s1.createEl("input");
      si1.type = "radio";
      si1.name = "sc-strat";
      si1.checked = true;
      si1.addEventListener("change", () => {
        if (si1.checked) this.sameContentStrategy = "keep";
      });
      s1.appendText(" \u4FDD\u6301\u539F\u6709\u540D\u79F0\uFF08\u9ED8\u8BA4\uFF09");
      scWrap.createEl("div", {
        text: "\u5185\u5BB9\u5B8C\u5168\u4E00\u6837\uFF0C\u53EA\u662F\u540D\u5B57\u4E0D\u540C\u3002\u6CBF\u7528\u5F53\u524D\u5DF2\u6709\u7684\u540D\u79F0\uFF0C\u4E0D\u91CD\u590D\u521B\u5EFA\uFF08\u5BFC\u5165\u9879\u88AB\u8DF3\u8FC7\uFF09\u3002",
        cls: "text-batch-muted text-batch-strat-desc"
      });
      const s2 = scWrap.createEl("label");
      s2.style.display = "block";
      const si2 = s2.createEl("input");
      si2.type = "radio";
      si2.name = "sc-strat";
      si2.addEventListener("change", () => {
        if (si2.checked) this.sameContentStrategy = "rename";
      });
      s2.appendText(" \u7528\u65B0\u540D\u79F0\u8986\u76D6\uFF08\u540C\u540D\u5373\u6539\u6210\u65B0\u540D\u5B57\uFF09");
      scWrap.createEl("div", {
        text: "\u4FDD\u7559\u5F53\u524D\u9879\u7684\u5185\u5BB9\u4E0E id\uFF0C\u4EC5\u628A\u5B83\u7684\u540D\u79F0\u6539\u6210\u5BFC\u5165\u5305\u91CC\u7684\u65B0\u540D\u5B57\uFF1B\u5F15\u7528\u5B83\u7684\u5E8F\u5217\u81EA\u52A8\u7EE7\u7EED\u6307\u5411\u5B83\uFF0C\u4E0D\u53D7\u5F71\u54CD\u3002",
        cls: "text-batch-muted text-batch-strat-desc"
      });
    }
    new Setting(this.previewEl).addButton(
      (btn) => btn.setButtonText("\u786E\u8BA4\u5BFC\u5165").setCta().onClick(() => this.confirm())
    );
  }
  async confirm() {
    if (!this.pack) return;
    const summary = applyImport(
      this.plugin.settings,
      this.pack,
      this.strategy,
      this.sameContentStrategy
    );
    await this.plugin.saveSettings();
    this.onImported?.();
    new Notice(
      `\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E ${summary.added}\uFF0C\u8DF3\u8FC7(\u5185\u5BB9\u76F8\u540C) ${summary.skipped}` + (summary.renamedSameContent ? `\uFF0C\u540C\u5185\u5BB9\u6539\u65B0\u540D ${summary.renamedSameContent}` : "") + `\uFF0C\u91CD\u547D\u540D\u65E7 ${summary.renamed}\uFF0C\u8986\u76D6 ${summary.overridden}` + (summary.warnings.length ? `\uFF1B${summary.warnings.length} \u6761\u63D0\u793A` : "")
    );
    this.close();
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/action-picker.ts
var ActionPicker = class _ActionPicker {
  constructor(parent, opts) {
    this.filtered = [];
    this.activeIdx = -1;
    this.open = false;
    this.justPicked = false;
    this.scrollListeners = [];
    this.docPointerDown = (e) => {
      if (!this.open) return;
      const t = e.target;
      if (this.wrapper.contains(t)) return;
      if (this.listEl && this.listEl.contains(t)) return;
      this.closeList();
    };
    this.onWindowResize = () => {
      if (!this.open) return;
      this.positionList();
    };
    this.onAncestorScroll = () => {
      if (!this.open) return;
      this.positionList();
    };
    this.onDocumentWheel = (e) => {
      if (!this.open) return;
      if (this.listEl && this.listEl.contains(e.target)) return;
      this.closeList();
    };
    this.opts = opts;
    this.wrapper = parent.createEl("div", {
      cls: "text-batch-input text-batch-input-has-list text-batch-picker"
    });
    this.input = this.wrapper.createEl("input", { type: "text", cls: "text-batch-input-el" });
    this.input.value = opts.value ?? "";
    if (opts.placeholder) this.input.placeholder = opts.placeholder;
    this.clearBtn = this.wrapper.createEl("button", {
      type: "button",
      cls: "text-batch-clear",
      text: "\u2715",
      attr: { "aria-label": "\u6E05\u7A7A" }
    });
    this.clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.input.value = "";
      this.syncClear();
      this.opts.onInput?.("");
      this.input.focus();
      this.openList();
    });
    const chevron = this.wrapper.createEl("button", {
      type: "button",
      cls: "text-batch-dropdown-btn",
      attr: { "aria-label": "\u5C55\u5F00\u52A8\u4F5C\u5217\u8868" }
    });
    setIcon(chevron, "chevron-down");
    chevron.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.open) this.closeList();
      else this.openList();
    });
    this.input.addEventListener("focus", () => {
      if (!this.open) this.openList();
    });
    this.input.addEventListener("click", () => {
      if (!this.open) this.openList();
    });
    this.input.addEventListener("input", () => {
      this.syncClear();
      this.opts.onInput?.(this.input.value);
      if (!this.open) this.openList();
      else this.filterAndRender();
    });
    this.input.addEventListener("blur", (e) => {
      const rel = e.relatedTarget;
      if (rel && (this.wrapper.contains(rel) || this.listEl && this.listEl.contains(rel))) return;
      this.closeList();
    });
    this.input.addEventListener("keydown", (e) => this.onKey(e));
    document.addEventListener("mousedown", this.docPointerDown, true);
    window.addEventListener("resize", this.onWindowResize);
    document.addEventListener("wheel", this.onDocumentWheel, { capture: true, passive: true });
    this.attachScrollListeners();
    this.syncClear();
  }
  static {
    // 全局唯一激活的下拉，保证同一时刻只能有一个打开
    this.active = null;
  }
  syncClear() {
    this.clearBtn.style.display = this.input.value ? "flex" : "none";
  }
  onKey(e) {
    if (!this.open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        this.openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.filtered.length === 0) return;
      this.activeIdx = (this.activeIdx + 1) % this.filtered.length;
      this.highlightAndScroll();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.filtered.length === 0) return;
      this.activeIdx = (this.activeIdx - 1 + this.filtered.length) % this.filtered.length;
      this.highlightAndScroll();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.activeIdx >= 0 && this.filtered[this.activeIdx]) this.select(this.filtered[this.activeIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      this.closeList();
    }
  }
  openList() {
    if (_ActionPicker.active && _ActionPicker.active !== this) {
      _ActionPicker.active.closeList();
    }
    _ActionPicker.active = this;
    if (this.open) {
      this.filterAndRender();
      return;
    }
    this.open = true;
    const list = document.createElement("div");
    list.className = "text-batch-picker-list";
    this.listEl = list;
    document.body.appendChild(list);
    this.filterAndRender();
  }
  // 列表挂在 document.body 上，position:fixed，使用视口坐标定位
  positionList() {
    if (!this.listEl) return;
    const rect = this.input.getBoundingClientRect();
    const listH = this.listEl.offsetHeight || 240;
    const vh = window.innerHeight;
    if (rect.bottom < 0 || rect.top > vh) {
      this.closeList();
      return;
    }
    let top = rect.bottom + 4;
    if (top + listH > vh && rect.top - listH - 4 > 0) {
      top = rect.top - listH - 4;
    }
    this.listEl.style.top = top + "px";
    this.listEl.style.left = rect.left + "px";
    this.listEl.style.width = rect.width + "px";
  }
  filterAndRender() {
    const q = this.input.value.trim().toLowerCase();
    const all = this.opts.getOptions();
    this.filtered = q ? all.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.category ?? "").toLowerCase().includes(q)
    ) : all.slice();
    if (this.activeIdx >= this.filtered.length) this.activeIdx = this.filtered.length - 1;
    if (this.activeIdx < 0 && this.filtered.length > 0) this.activeIdx = 0;
    this.renderItems();
    this.positionList();
  }
  renderItems() {
    if (!this.listEl) return;
    this.listEl.empty();
    if (this.filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "text-batch-picker-empty";
      empty.textContent = "\u65E0\u5339\u914D\u9879";
      this.listEl.appendChild(empty);
      return;
    }
    this.filtered.forEach((o, i) => {
      const item = document.createElement("div");
      item.className = "text-batch-picker-item" + (i === this.activeIdx ? " text-batch-picker-item-active" : "");
      const cat = o.category ? `\u3010${o.category}\u3011` : "";
      item.textContent = cat + o.name;
      item.addEventListener("mouseenter", () => {
        this.activeIdx = i;
        this.renderItems();
      });
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.select(o);
      });
      this.listEl.appendChild(item);
    });
  }
  highlightAndScroll() {
    if (!this.listEl) return;
    const items = Array.from(
      this.listEl.querySelectorAll(".text-batch-picker-item")
    );
    items.forEach((el, i) => el.classList.toggle("text-batch-picker-item-active", i === this.activeIdx));
    const cur = items[this.activeIdx];
    if (cur) cur.scrollIntoView({ block: "nearest" });
  }
  select(o) {
    this.justPicked = true;
    this.input.value = o.name;
    this.syncClear();
    this.opts.onSelect(o.id, o.name);
    this.closeList();
    this.input.focus();
  }
  closeList() {
    if (!this.open) return;
    this.open = false;
    if (this.listEl) {
      this.listEl.remove();
      this.listEl = void 0;
    }
    this.activeIdx = -1;
    if (_ActionPicker.active === this) _ActionPicker.active = null;
    if (!this.justPicked) this.opts.onCommit?.(this.input.value);
    this.justPicked = false;
  }
  attachScrollListeners() {
    const scrollables = [];
    let el = this.wrapper;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      if (/auto|scroll/.test(style.overflowY) || /auto|scroll/.test(style.overflow)) {
        scrollables.push(el);
      }
      el = el.parentElement;
    }
    scrollables.push(window);
    scrollables.forEach((target) => {
      const fn = () => this.onAncestorScroll();
      target.addEventListener("scroll", fn, { passive: true });
      this.scrollListeners.push({ el: target, fn });
    });
  }
  get value() {
    return this.input.value;
  }
  setValue(v) {
    this.input.value = v;
    this.syncClear();
  }
  destroy() {
    document.removeEventListener("mousedown", this.docPointerDown, true);
    window.removeEventListener("resize", this.onWindowResize);
    document.removeEventListener("wheel", this.onDocumentWheel, { capture: true });
    this.scrollListeners.forEach(({ el, fn }) => el.removeEventListener("scroll", fn));
    this.scrollListeners = [];
    if (this.listEl) {
      this.listEl.remove();
      this.listEl = void 0;
    }
    this.open = false;
    if (_ActionPicker.active === this) _ActionPicker.active = null;
  }
};

// src/settings.ts
var TextProcessorSettingTab = class extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    // 本次编辑会话内「新增但尚未保存」的条目（不写入存储，刷新设置页即丢弃）
    this.draftNewItems = [];
    // 当前区块的类别 datalist id（display 时按 动作/序列 区块分别重置，互不共享）
    this.catListId = "";
    // 刷新前记录各分组展开状态，重建后恢复。键为 `type|cat`，避免动作/序列同名分组互相覆盖
    this.groupOpenState = /* @__PURE__ */ new Map();
    // 序列步骤里的自定义下拉选择器实例（原生 datalist 无法滚动/键盘高亮，改用自绘下拉）
    // stepPickers 在每次 renderSteps 重渲前销毁重建；addPicker 跟随卡片生命周期
    this.stepPickers = [];
    this.plugin = plugin;
  }
  destroyAllPickers() {
    this.stepPickers.forEach((p) => p.destroy());
    this.stepPickers = [];
    this.addPicker?.destroy();
    this.addPicker = void 0;
  }
  // ===== 通用工具 =====
  catLabel(c) {
    const s = (c ?? "").trim();
    return s ? s : "\u672A\u5206\u7C7B";
  }
  // 同类（动作 / 序列各自独立）名称是否重复（排除自身 excludeId），限定在「同类别」内
  nameExists(type, name, excludeId, category = "") {
    const n = name.trim();
    if (!n) return false;
    const cat = normalizeCategory(category);
    if (type === "action") {
      return this.plugin.settings.actions.some(
        (a) => a.id !== excludeId && normalizeCategory(a.category) === cat && a.name.trim() === n
      );
    }
    return this.plugin.settings.sequences.some(
      (s) => s.id !== excludeId && normalizeCategory(s.category) === cat && s.name.trim() === n
    );
  }
  // 在已有名称集合里生成不重复的名字（base 被占用则 base 2 / base 3 ...）
  genUniqueName(base, taken) {
    if (!taken.includes(base)) return base;
    let i = 2;
    while (taken.includes(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  }
  // 收集类别（仅限指定类型自身出现过的类别，含「未分类」），供类别输入框下拉使用。
  // 动作与序列各自独立，互不显示对方的类别。
  collectCategories(type) {
    const cats = /* @__PURE__ */ new Set();
    const list = type === "action" ? this.plugin.settings.actions : this.plugin.settings.sequences;
    list.forEach((it) => {
      const c = (it.category ?? "").trim();
      if (c) cats.add(c);
    });
    cats.add("\u672A\u5206\u7C7B");
    return [...cats].sort((a, b) => {
      if (a === "\u672A\u5206\u7C7B" && b === "\u672A\u5206\u7C7B") return 0;
      if (a === "\u672A\u5206\u7C7B") return 1;
      if (b === "\u672A\u5206\u7C7B") return -1;
      return a.localeCompare(b, "zh");
    });
  }
  // 把 items 按类别分组，顺序为：非空类别按字母序，"未分类"（空串）置底
  groupItems(items, getCat) {
    const map = /* @__PURE__ */ new Map();
    for (const it of items) {
      const c = normalizeCategory(getCat(it));
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(it);
    }
    const cats = [...map.keys()].sort((a, b) => {
      if (a === "" && b === "") return 0;
      if (a === "") return 1;
      if (b === "") return -1;
      return a.localeCompare(b, "zh");
    });
    return cats.map((c) => ({ cat: c, items: map.get(c) }));
  }
  actionNameById(id) {
    const a = this.plugin.settings.actions.find((x) => x.id === id);
    return a ? a.name : "";
  }
  // ===== 可复用输入框：原生 datalist + 框内左侧清空按钮 =====
  // 下拉由浏览器原生 <input list> 提供（点击输入框即弹出候选）；清空按钮只负责一键清空。
  attachInput(parent, opts) {
    const classes = ["text-batch-input"];
    if (opts.wrapperCls) classes.push(opts.wrapperCls);
    if (opts.datalistId) classes.push("text-batch-input-has-list");
    const wrapper = parent.createEl("div", { cls: classes.join(" ") });
    const input = wrapper.createEl("input", { type: "text", cls: "text-batch-input-el" });
    input.value = opts.value ?? "";
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.datalistId) input.setAttribute("list", opts.datalistId);
    const clearBtn = wrapper.createEl("button", {
      type: "button",
      cls: "text-batch-clear",
      text: "\u2715",
      attr: { "aria-label": "\u6E05\u7A7A" }
    });
    const sync = () => {
      clearBtn.style.display = input.value ? "flex" : "none";
    };
    clearBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      sync();
      opts.onChange?.("");
      input.focus();
    });
    input.addEventListener("input", () => {
      sync();
      opts.onChange?.(input.value);
    });
    if (opts.onBlur) {
      input.addEventListener("blur", () => opts.onBlur?.(input.value));
    }
    sync();
    return { input, sync };
  }
  // ===== 卡片外壳（动作 / 序列共用）=====
  renderCardShell(parent, item, isNew, opts) {
    const details = parent.createEl("details", { cls: "text-batch-card" });
    const summary = details.createEl("summary", { cls: "text-batch-card-summary" });
    const titleSpan = summary.createEl("span", {
      cls: "text-batch-card-title",
      text: (item.favorite ? "\u2605 " : "") + item.name
    });
    const metaSpan = summary.createEl("span", { cls: "text-batch-card-meta", text: opts.meta });
    const favBtn = summary.createEl("button", { cls: "text-batch-card-btn text-batch-fav" });
    setIcon(favBtn, "star");
    favBtn.title = item.favorite ? "\u53D6\u6D88\u5E38\u7528" : "\u8BBE\u4E3A\u5E38\u7528";
    favBtn.classList.toggle("text-batch-fav-on", item.favorite);
    favBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.favorite = !item.favorite;
      if (!isNew) this.plugin.saveSettings();
      favBtn.classList.toggle("text-batch-fav-on", item.favorite);
      favBtn.title = item.favorite ? "\u53D6\u6D88\u5E38\u7528" : "\u8BBE\u4E3A\u5E38\u7528";
      titleSpan.textContent = (item.favorite ? "\u2605 " : "") + item.name;
    });
    const delBtn = summary.createEl("button", { cls: "text-batch-card-btn text-batch-danger" });
    setIcon(delBtn, "trash");
    delBtn.setAttribute("aria-label", "\u5220\u9664");
    delBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isNew) {
        this.discardNewItem(item);
        this.display();
      } else {
        opts.onDeleteExisting();
      }
    });
    const body = details.createEl("div", { cls: "text-batch-card-body" });
    const row = body.createEl("div", { cls: "text-batch-inline-fields" });
    const nameField = row.createEl("div", { cls: "text-batch-field" });
    nameField.createEl("label", { text: "\u540D\u79F0", cls: "text-batch-field-label" });
    const nameInput = this.attachInput(nameField, {
      value: item.name,
      placeholder: "\u540D\u79F0",
      onChange: opts.onName
    }).input;
    const catField = row.createEl("div", { cls: "text-batch-field" });
    catField.createEl("label", { text: "\u7C7B\u522B", cls: "text-batch-field-label" });
    const catInput = this.attachInput(catField, {
      value: item.category ?? "",
      placeholder: "\u8F93\u5165\u6216\u9009\u62E9\u7C7B\u522B\u2026",
      datalistId: this.catListId,
      onChange: opts.onCat
    }).input;
    const setMeta = (s) => {
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
      this.display();
      new Notice("\u5DF2\u4FDD\u5B58");
    };
    const cancel = () => {
      if (isNew) {
        this.discardNewItem(item);
        this.display();
        new Notice("\u5DF2\u653E\u5F03\u65B0\u589E");
      } else {
        opts.onCancel(handle);
      }
    };
    const handle = { nameInput, catInput, setMeta };
    opts.renderExtra(body, { save, cancel, setMeta });
    return details;
  }
  // ===== 动作卡片 =====
  renderActionCard(parent, action, isNew) {
    const draft = { name: action.name, code: action.code, category: action.category ?? "" };
    let codeArea;
    return this.renderCardShell(parent, action, isNew, {
      meta: `${action.code.split("\n").length} \u884C\u4EE3\u7801`,
      onName: (v) => {
        draft.name = v;
      },
      onCat: (v) => {
        draft.category = v;
      },
      onDeleteExisting: () => this.deleteActionWithConfirm(action),
      onSave: () => {
        const name = draft.name.trim();
        if (!name) return "\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A";
        if (isNew && (draft.code.trim() === "" || draft.code.trim() === "return text;")) {
          return "\u65B0\u589E\u52A8\u4F5C\u5185\u5BB9\u4E3A\u7A7A\uFF1A\u8BF7\u586B\u5199\u4EE3\u7801\u540E\u518D\u4FDD\u5B58\uFF0C\u6216\u70B9\u51FB\u300C\u53D6\u6D88\u300D\u653E\u5F03\u3002";
        }
        const cat = normalizeCategory(draft.category);
        if (this.nameExists("action", name, action.id, cat)) {
          return `\u7C7B\u522B\u300C${this.catLabel(cat)}\u300D\u4E0B\u540D\u79F0\u300C${name}\u300D\u5DF2\u5B58\u5728\uFF0C\u8BF7\u4FEE\u6539`;
        }
        action.name = name;
        action.code = draft.code;
        action.category = cat;
        return null;
      },
      onCancel: (h) => {
        draft.name = action.name;
        draft.code = action.code;
        draft.category = action.category ?? "";
        h.nameInput.value = action.name;
        codeArea.setValue(action.code);
        h.catInput.value = draft.category;
        new Notice("\u5DF2\u53D6\u6D88\u6539\u52A8");
      },
      renderExtra: (body, api) => {
        const codeHead = body.createEl("div", { cls: "text-batch-code-head" });
        codeHead.createEl("label", { text: "\u4EE3\u7801", cls: "text-batch-field-label" });
        const codeBtns = codeHead.createEl("div", { cls: "text-batch-code-btns" });
        codeBtns.createEl("button", { cls: "mod-cta", text: "\u4FDD\u5B58" }).addEventListener("click", api.save);
        codeBtns.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", api.cancel);
        const codeWrap = body.createEl("div", { cls: "text-batch-code-wrap" });
        codeArea = new TextAreaComponent(codeWrap);
        codeArea.setValue(action.code).onChange((v) => {
          draft.code = v;
        });
        codeArea.inputEl.rows = 4;
        codeArea.inputEl.classList.add("text-batch-code");
      }
    });
  }
  // ===== 序列卡片（含步骤编辑）=====
  renderSequenceCard(parent, seq, isNew) {
    const draft = {
      name: seq.name,
      category: seq.category ?? "",
      steps: seq.steps.map((s) => ({ actionId: s.actionId, originalActionId: s.actionId }))
    };
    let stepsContainer;
    let renderSteps;
    return this.renderCardShell(parent, seq, isNew, {
      meta: `${seq.steps.length} \u4E2A\u6B65\u9AA4`,
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
        if (!name) return "\u540D\u79F0\u4E0D\u80FD\u4E3A\u7A7A";
        if (isNew && draft.steps.length === 0) {
          return "\u65B0\u589E\u5E8F\u5217\u5C1A\u672A\u6DFB\u52A0\u4EFB\u4F55\u6B65\u9AA4\uFF1A\u8BF7\u5148\u6DFB\u52A0\u52A8\u4F5C\uFF0C\u6216\u70B9\u51FB\u300C\u53D6\u6D88\u300D\u653E\u5F03\u3002";
        }
        const cat = normalizeCategory(draft.category);
        if (this.nameExists("sequence", name, seq.id, cat)) {
          return `\u7C7B\u522B\u300C${this.catLabel(cat)}\u300D\u4E0B\u540D\u79F0\u300C${name}\u300D\u5DF2\u5B58\u5728\uFF0C\u8BF7\u4FEE\u6539`;
        }
        for (let i = 0; i < draft.steps.length; i++) {
          const st = draft.steps[i];
          if (!st.actionId || !st.actionId.trim()) {
            if (st.originalActionId && st.originalActionId.trim()) {
              st.actionId = st.originalActionId;
            } else {
              return `\u6B65\u9AA4 ${i + 1} \u672A\u9009\u62E9\u52A8\u4F5C\uFF0C\u65E0\u6CD5\u4FDD\u5B58`;
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
        draft.category = seq.category ?? "";
        draft.steps = seq.steps.map((s) => ({
          actionId: s.actionId,
          originalActionId: s.actionId
        }));
        h.nameInput.value = seq.name;
        h.catInput.value = draft.category;
        renderSteps();
        new Notice("\u5DF2\u53D6\u6D88\u6539\u52A8");
      },
      renderExtra: (body, api) => {
        stepsContainer = body.createEl("div", { cls: "text-batch-steps" });
        renderSteps = () => {
          this.stepPickers.forEach((p) => p.destroy());
          this.stepPickers = [];
          stepsContainer.empty();
          draft.steps.forEach((step, stepIndex) => {
            const stepSetting = new Setting(stepsContainer).setName(`\u6B65\u9AA4 ${stepIndex + 1}`);
            const stepPicker = new ActionPicker(stepSetting.controlEl, {
              value: this.actionNameById(step.actionId),
              placeholder: "\u8F93\u5165\u6216\u9009\u62E9\u52A8\u4F5C\u2026",
              getOptions: () => this.plugin.settings.actions.map((a) => ({
                id: a.id,
                name: a.name,
                category: a.category ?? ""
              })),
              onSelect: (id) => {
                step.actionId = id;
              },
              onInput: (v) => {
                const f = this.plugin.settings.actions.find((a) => a.name.trim() === v.trim());
                step.actionId = f ? f.id : "";
              },
              onCommit: (v) => {
                const t = v.trim();
                if (!t) return;
                const f = this.plugin.settings.actions.find((a) => a.name.trim() === t);
                if (!f) {
                  new Notice(`\u672A\u627E\u5230\u540D\u4E3A\u300C${t}\u300D\u7684\u52A8\u4F5C`);
                  step.actionId = step.originalActionId;
                  stepPicker.setValue(this.actionNameById(step.actionId));
                }
              }
            });
            this.stepPickers.push(stepPicker);
            stepSetting.addButton(
              (btn) => btn.setIcon("arrow-up").setTooltip("\u4E0A\u79FB").onClick(() => {
                if (stepIndex > 0) {
                  const tmp = draft.steps[stepIndex - 1];
                  draft.steps[stepIndex - 1] = draft.steps[stepIndex];
                  draft.steps[stepIndex] = tmp;
                  renderSteps();
                }
              })
            );
            stepSetting.addButton(
              (btn) => btn.setIcon("arrow-down").setTooltip("\u4E0B\u79FB").onClick(() => {
                if (stepIndex < draft.steps.length - 1) {
                  const tmp = draft.steps[stepIndex + 1];
                  draft.steps[stepIndex + 1] = draft.steps[stepIndex];
                  draft.steps[stepIndex] = tmp;
                  renderSteps();
                }
              })
            );
            stepSetting.addButton(
              (btn) => btn.setIcon("trash").setTooltip("\u5220\u9664\u6B65\u9AA4").onClick(() => {
                draft.steps.splice(stepIndex, 1);
                renderSteps();
              })
            );
          });
          api.setMeta(`${draft.steps.length} \u4E2A\u6B65\u9AA4`);
        };
        renderSteps();
        const addSetting = new Setting(body).setName("\u65B0\u6B65\u9AA4");
        addSetting.settingEl.addClass("text-batch-step-add-row");
        this.addPicker = new ActionPicker(addSetting.controlEl, {
          placeholder: "\u8F93\u5165\u6216\u9009\u62E9\u52A8\u4F5C\u2026",
          getOptions: () => this.plugin.settings.actions.map((a) => ({
            id: a.id,
            name: a.name,
            category: a.category ?? ""
          }))
        });
        addSetting.addButton(
          (btn) => btn.setButtonText("\u6DFB\u52A0").setClass("text-batch-step-btn").onClick(() => {
            const name = this.addPicker.value.trim();
            const found = this.plugin.settings.actions.find((a) => a.name.trim() === name);
            if (found) {
              draft.steps.push({ actionId: found.id, originalActionId: "" });
              renderSteps();
              this.addPicker.setValue("");
            } else {
              new Notice(`\u672A\u627E\u5230\u540D\u4E3A\u300C${name}\u300D\u7684\u52A8\u4F5C`);
            }
          })
        );
        const footer = body.createEl("div", { cls: "text-batch-card-footer" });
        footer.createEl("button", { cls: "mod-cta", text: "\u4FDD\u5B58" }).addEventListener("click", api.save);
        footer.createEl("button", { text: "\u53D6\u6D88" }).addEventListener("click", api.cancel);
      }
    });
  }
  // ===== 列表区块（动作 / 序列共用，差异收敛到回调）=====
  renderSection(container, type, items, opts) {
    container.createEl("h2", { text: opts.title, cls: "text-batch-section-title" });
    new Setting(container).setName(opts.addLabel).setDesc(opts.desc).addButton(
      (btn) => btn.setButtonText("+ " + opts.addLabel).onClick(() => this.addItem(type, ""))
    );
    const groups = this.groupItems(items, (it) => it.category ?? "");
    const sortLabels = {
      "name-asc": "\u540D\u79F0 \u2191",
      "name-desc": "\u540D\u79F0 \u2193",
      "add-asc": "\u6DFB\u52A0\u987A\u5E8F \u2191",
      "add-desc": "\u6DFB\u52A0\u987A\u5E8F \u2193"
    };
    const allItems = type === "action" ? this.plugin.settings.actions : this.plugin.settings.sequences;
    const groupState = [];
    const toolbar = container.createEl("div", { cls: "text-batch-toolbar" });
    toolbar.createEl("span", { cls: "text-batch-toolbar-label", text: "\u7B5B\u9009" });
    const filterInput = this.attachInput(toolbar, {
      placeholder: "\u8F93\u5165\u5173\u952E\u5B57\uFF08\u5339\u914D\u540D\u79F0\u6216\u7C7B\u522B\uFF09\u2026",
      wrapperCls: "text-batch-toolbar-input"
    }).input;
    const sortSel = toolbar.createEl("select", { cls: "text-batch-sort text-batch-toolbar-sort" });
    Object.entries(sortLabels).forEach(([v, label]) => {
      sortSel.createEl("option", { value: v, text: label });
    });
    let favOnly = false;
    const favBtn = toolbar.createEl("button", {
      cls: "text-batch-toolbar-btn text-batch-fav",
      text: "\u2606",
      title: "\u53EA\u663E\u793A\u5E38\u7528"
    });
    favBtn.addEventListener("click", () => {
      favOnly = !favOnly;
      favBtn.classList.toggle("text-batch-fav-on", favOnly);
      favBtn.textContent = favOnly ? "\u2605" : "\u2606";
      if (favOnly) groupState.forEach((g) => g.details.open = true);
      applyFilter();
    });
    let allCollapsed = true;
    const collapseBtn = toolbar.createEl("button", { cls: "text-batch-toolbar-btn", title: "\u5168\u90E8\u5C55\u5F00" });
    setIcon(collapseBtn, "maximize-2");
    collapseBtn.addEventListener("click", () => {
      if (allCollapsed) {
        groupState.forEach((g) => g.details.open = true);
        allCollapsed = false;
        setIcon(collapseBtn, "minimize-2");
        collapseBtn.title = "\u5168\u90E8\u6298\u53E0";
      } else {
        groupState.forEach((g) => g.details.open = false);
        allCollapsed = true;
        setIcon(collapseBtn, "maximize-2");
        collapseBtn.title = "\u5168\u90E8\u5C55\u5F00";
      }
      applyFilter();
    });
    for (const g of groups) {
      const details = container.createEl("details", {
        cls: "text-batch-group",
        attr: { "data-category": g.cat, "data-type": type }
      });
      const openKey = `${type}|${g.cat}`;
      if (this.groupOpenState.has(openKey)) {
        details.open = this.groupOpenState.get(openKey);
      }
      const summary = details.createEl("summary", { cls: "text-batch-group-summary" });
      summary.createEl("span", {
        cls: "text-batch-group-title",
        text: `\u3010${this.catLabel(g.cat)}\u3011 (${g.items.length})`
      });
      const addBtn = summary.createEl("button", { cls: "text-batch-card-btn", text: "\uFF0B \u6DFB\u52A0\u5230\u672C\u7C7B\u522B" });
      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.addItem(type, g.cat);
      });
      const itemsContainer = details.createEl("div", { cls: "text-batch-group-items" });
      const cards = g.items.map((it) => ({
        item: it,
        el: opts.renderCard(itemsContainer, it, this.draftNewItems.includes(it))
      }));
      groupState.push({ cat: g.cat, details, itemsContainer, cards });
    }
    const applyFilter = () => {
      const q = filterInput.value.trim().toLowerCase();
      for (const g of groupState) {
        let anyVisible = false;
        for (const c of g.cards) {
          const it = c.item;
          const nm = it.name.toLowerCase();
          const cm = this.catLabel(it.category).toLowerCase();
          const match = !q || nm.includes(q) || cm.includes(q);
          const matchFav = !favOnly || !!it.favorite;
          const vis = match && matchFav;
          c.el.style.display = vis ? "" : "none";
          if (vis) anyVisible = true;
        }
        g.details.style.display = anyVisible ? "" : "none";
      }
    };
    const applySort = () => {
      const mode = sortSel.value;
      for (const g of groupState) {
        const sorted = [...g.cards].sort((x, y) => {
          if (mode === "name-asc") return x.item.name.localeCompare(y.item.name, "zh");
          if (mode === "name-desc") return y.item.name.localeCompare(x.item.name, "zh");
          const ix = allItems.indexOf(x.item);
          const iy = allItems.indexOf(y.item);
          return mode === "add-asc" ? ix - iy : iy - ix;
        });
        for (const c of sorted) g.itemsContainer.appendChild(c.el);
      }
    };
    filterInput.addEventListener("input", applyFilter);
    sortSel.addEventListener("change", () => {
      applySort();
      applyFilter();
    });
    return groupState;
  }
  // ===== 新增 / 提交 / 丢弃 =====
  genId(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  // 新增项仅放入内存草稿，不写入存储；保存时才落地。
  addItem(type, category) {
    let id = "";
    if (type === "action") {
      const taken = [
        ...this.plugin.settings.actions,
        ...this.draftNewItems.filter((i) => "code" in i)
      ].map((a) => a.name.trim());
      id = this.genId("action");
      this.draftNewItems.push({
        id,
        name: this.genUniqueName("\u65B0\u52A8\u4F5C", taken),
        code: "return text;",
        category: normalizeCategory(category),
        favorite: false
      });
    } else {
      const taken = [
        ...this.plugin.settings.sequences,
        ...this.draftNewItems.filter((i) => !("code" in i))
      ].map((s) => s.name.trim());
      id = this.genId("seq");
      this.draftNewItems.push({
        id,
        name: this.genUniqueName("\u65B0\u5E8F\u5217", taken),
        category: normalizeCategory(category),
        favorite: false,
        steps: []
      });
    }
    this.pendingOpenId = id;
    this.display();
  }
  // 保存时把草稿项从 draftNewItems 移入正式配置并持久化
  commitNewItem(item) {
    const i = this.draftNewItems.indexOf(item);
    if (i >= 0) this.draftNewItems.splice(i, 1);
    if ("code" in item) this.plugin.settings.actions.push(item);
    else this.plugin.settings.sequences.push(item);
    this.plugin.saveSettings();
  }
  discardNewItem(item) {
    const i = this.draftNewItems.indexOf(item);
    if (i >= 0) this.draftNewItems.splice(i, 1);
  }
  // ===== 删除动作（引用确认）=====
  deleteActionWithConfirm(action) {
    const affected = this.plugin.settings.sequences.filter(
      (seq) => seq.steps.some((st) => st.actionId === action.id)
    );
    const doDelete = (deleteSeqs) => {
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
  display() {
    const { containerEl } = this;
    this.destroyAllPickers();
    this.groupOpenState.clear();
    containerEl.querySelectorAll(".text-batch-group[data-category]").forEach((el) => {
      const type = el.getAttribute("data-type") ?? "";
      const cat = el.getAttribute("data-category") ?? "";
      this.groupOpenState.set(`${type}|${cat}`, el.open);
    });
    containerEl.empty();
    const actionCatDl = containerEl.createEl("datalist");
    actionCatDl.id = "text-batch-cat-list-action";
    this.collectCategories("action").forEach((c) => {
      const o = actionCatDl.createEl("option");
      o.value = c;
    });
    this.catListId = actionCatDl.id;
    const actionItems = [
      ...this.plugin.settings.actions,
      ...this.draftNewItems.filter((i) => "code" in i)
    ];
    const actionGroupsState = this.renderSection(containerEl, "action", actionItems, {
      title: "\u52A8\u4F5C\uFF08\u53EF\u81EA\u5B9A\u4E49\u4EE3\u7801\uFF09",
      desc: "\u52A8\u4F5C\u662F\u4E00\u6BB5 JavaScript \u4EE3\u7801\uFF1A\u62FF\u5230\u53D8\u91CF text\uFF0Creturn \u5904\u7406\u540E\u7684\u5B57\u7B26\u4E32\u3002",
      addLabel: "\u65B0\u589E\u52A8\u4F5C",
      renderCard: (p, it, isNew) => this.renderActionCard(p, it, isNew)
    });
    const seqCatDl = containerEl.createEl("datalist");
    seqCatDl.id = "text-batch-cat-list-seq";
    this.collectCategories("sequence").forEach((c) => {
      const o = seqCatDl.createEl("option");
      o.value = c;
    });
    this.catListId = seqCatDl.id;
    const seqItems = [
      ...this.plugin.settings.sequences,
      ...this.draftNewItems.filter((i) => !("code" in i))
    ];
    const seqGroupsState = this.renderSection(containerEl, "sequence", seqItems, {
      title: "\u5E8F\u5217\uFF08\u52A8\u4F5C\u7684\u7EC4\u5408\uFF09",
      desc: "\u628A\u591A\u4E2A\u52A8\u4F5C\u6309\u987A\u5E8F\u6392\u5217\uFF0C\u5F62\u6210\u53EF\u4E00\u952E\u6267\u884C\u7684\u5E8F\u5217\u3002",
      addLabel: "\u65B0\u589E\u5E8F\u5217",
      renderCard: (p, it, isNew) => this.renderSequenceCard(p, it, isNew)
    });
    containerEl.createEl("h2", { text: "\u5BFC\u5165 / \u5BFC\u51FA", cls: "text-batch-section-title" });
    new Setting(containerEl).setName("\u5BFC\u51FA\u5F53\u524D\u914D\u7F6E").setDesc("\u628A\u5168\u90E8\u52A8\u4F5C\u4E0E\u5E8F\u5217\u5BFC\u51FA\u4E3A JSON\uFF0C\u53EF\u4E0B\u8F7D\u5230\u672C\u5730\uFF0C\u7528\u4E8E\u5907\u4EFD\u6216\u5206\u4EAB\u7ED9\u4ED6\u4EBA\u3002").addButton(
      (btn) => btn.setButtonText("\u5BFC\u51FA").onClick(async () => {
        const text = exportPackText(this.plugin.settings);
        await downloadPack(this.app, text);
      })
    );
    new Setting(containerEl).setName("\u5BFC\u5165\u914D\u7F6E").setDesc("\u4ECE\u7C98\u8D34 / \u672C\u5730\u6587\u4EF6 / \u8FDC\u7A0B\u5730\u5740\u5BFC\u5165\u52A8\u4F5C\u4E0E\u5E8F\u5217\uFF1B\u89E3\u6790\u540E\u4F1A\u63D0\u793A\u91CD\u590D\u4E0E\u51B2\u7A81\uFF0C\u5E76\u652F\u6301\u67E5\u770B\u660E\u7EC6\u3002").addButton(
      (btn) => btn.setButtonText("\u5BFC\u5165").onClick(() => {
        new ImportModal(this.plugin.app, this.plugin, void 0, () => this.display()).open();
      })
    );
    new Setting(containerEl).setName("\u6E05\u9664\u6240\u6709\u52A8\u4F5C\u4E0E\u5E8F\u5217").setDesc(
      "\u6E05\u7A7A\u5F53\u524D\u5168\u90E8\u52A8\u4F5C\u4E0E\u5E8F\u5217\uFF08\u4E0D\u53EF\u64A4\u9500\uFF09\u3002\u70B9\u51FB\u540E\u4F1A\u5148\u81EA\u52A8\u628A\u5F53\u524D\u914D\u7F6E\u5907\u4EFD\u5230\u63D2\u4EF6\u76EE\u5F55\uFF08\u6587\u4EF6\u540D\u542B\u65E5\u671F\uFF09\uFF0C\u518D\u8981\u6C42\u4E8C\u6B21\u786E\u8BA4\u3002"
    ).addButton(
      (btn) => btn.setButtonText("\u6E05\u9664\u5168\u90E8").setWarning().onClick(() => {
        new ConfirmModal(
          this.app,
          "\u786E\u8BA4\u6E05\u9664\u5168\u90E8\uFF1F",
          "\u6B64\u64CD\u4F5C\u5C06\u5220\u9664\u5168\u90E8\u52A8\u4F5C\u4E0E\u5E8F\u5217\u3002\u70B9\u51FB\u300C\u786E\u8BA4\u300D\u524D\uFF0C\u4F1A\u5148\u5C06\u5F53\u524D\u914D\u7F6E\u81EA\u52A8\u5907\u4EFD\u5230\u63D2\u4EF6\u76EE\u5F55\uFF08\u542B\u65E5\u671F\uFF09\uFF0C\u4E4B\u540E\u4ECD\u53EF\u5728\u300C\u5BFC\u5165\u914D\u7F6E\u300D\u4E2D\u6062\u590D\u3002",
          () => this.clearAll(),
          "\u786E\u8BA4\u6E05\u9664"
        ).open();
      })
    );
    if (this.pendingOpenId) {
      const id = this.pendingOpenId;
      this.pendingOpenId = void 0;
      const findAndOpen = (states) => {
        for (const g of states) {
          const card = g.cards.find((c) => c.item.id === id);
          if (card) {
            g.details.open = true;
            card.el.open = true;
            card.el.scrollIntoView({ block: "nearest" });
            return true;
          }
        }
        return false;
      };
      findAndOpen(actionGroupsState) || findAndOpen(seqGroupsState);
    }
  }
  // 关闭设置页时销毁所有自定义下拉选择器，避免 window/document 监听泄漏
  hide() {
    this.destroyAllPickers();
  }
  // 清除全部动作与序列：先备份当前配置到插件目录，再清空。
  async clearAll() {
    const pluginDir = ".obsidian/plugins/text-batch-processor";
    const now = /* @__PURE__ */ new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupName = `backup-${stamp}.json`;
    const backupPath = `${pluginDir}/${backupName}`;
    const content = exportPackText(this.plugin.settings);
    try {
      await this.app.vault.adapter.write(backupPath, content);
    } catch (e) {
      new Notice("\u5907\u4EFD\u5931\u8D25\uFF1A" + e.message + "\uFF1B\u5DF2\u53D6\u6D88\u6E05\u9664\u3002");
      return;
    }
    this.plugin.settings.actions = [];
    this.plugin.settings.sequences = [];
    await this.plugin.saveSettings();
    this.display();
    new Notice(`\u5DF2\u6E05\u9664\u5168\u90E8\uFF0C\u5907\u4EFD\u5DF2\u4FDD\u5B58\u5230 ${backupPath}`);
  }
};

// test/repro.mjs
function inspect(tag) {
  const tab = globalThis.__tab;
  const stepsContainers = tab.containerEl.querySelectorAll(".text-batch-steps");
  console.log(`
===== [${tag}] \u6B65\u9AA4\u5BB9\u5668\u6570:`, stepsContainers.length, "=====");
  stepsContainers.forEach((sc, i) => {
    const items = sc.querySelectorAll(".setting-item");
    const names = [...items].map((it) => it.querySelector(".setting-item-name")?.textContent || "?");
    console.log(`  \u6B65\u9AA4\u5BB9\u5668[${i}] .setting-item \u6570:`, items.length, "\u540D\u79F0:", JSON.stringify(names));
  });
  const titles = [...tab.containerEl.querySelectorAll(".text-batch-card-title")].map((e) => e.textContent);
  console.log("  \u5361\u7247\u6807\u9898:", JSON.stringify(titles));
  const groups = [...tab.containerEl.querySelectorAll(".text-batch-group")].map(
    (g) => g.getAttribute("data-type") + "|" + g.getAttribute("data-category")
  );
  console.log("  \u5206\u7EC4:", JSON.stringify(groups));
}
function run() {
  const dataPath = "D:/Obsidian/\u6D4B\u8BD5/\u6D4B\u8BD5/.obsidian/plugins/text-batch-processor/data.json";
  const settings = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const app = new App();
  const plugin = { app, settings, saveSettings: () => {
  } };
  const tab = new TextProcessorSettingTab(app, plugin);
  tab.containerEl = document.createElement("div");
  document.body.appendChild(tab.containerEl);
  globalThis.__tab = tab;
  console.log("--------- \u573A\u666F1\uFF1A\u521D\u6B21 display() ---------");
  tab.display();
  inspect("\u521D\u6B21");
  console.log("\n--------- \u573A\u666F2\uFF1A\u65B0\u589E\u4E00\u4E2A\u52A8\u4F5C\u540E display() ---------");
  tab.addItem("action", "");
  inspect("\u65B0\u589E\u52A8\u4F5C\u540E");
}
run();
